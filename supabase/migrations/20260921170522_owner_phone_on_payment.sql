-- Owner is the mobile number entered at website checkout (after payment).
-- See docs/DATA_MODEL.md — Payment → ownership.

-- ---------------------------------------------------------------------------
-- Phone identity (E.164, e.g. +9198XXXXXXXX)
-- ---------------------------------------------------------------------------

-- Normalize empty strings to null; unique when present for webhook lookup.
update public.profiles set phone = nullif(btrim(phone), '') where phone is not null;

create unique index if not exists profiles_phone_uidx
  on public.profiles (phone)
  where phone is not null;

-- Checkout phone captured on payment (audit + reconcile before/after auth user exists).
alter table public.payment_events
  add column if not exists owner_phone text;

comment on column public.payment_events.owner_phone is
  'Mobile entered at Razorpay checkout; becomes organizations.owner_user_id after user resolve.';

-- ---------------------------------------------------------------------------
-- Auto-add owner membership when an organization is created
-- (website/service_role creates org with owner_user_id = paid phone user)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (org_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (org_id, user_id) do update
    set role = excluded.role,
        updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_organization() from public;
revoke all on function public.handle_new_organization() from anon, authenticated;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- Backfill: ensure every existing org owner is a member with role owner.
insert into public.organization_members (org_id, user_id, role)
select o.id, o.owner_user_id, 'owner'::public.org_role
from public.organizations o
on conflict (org_id, user_id) do update
  set role = 'owner',
      updated_at = now();

-- ---------------------------------------------------------------------------
-- Close open self-join: clients cannot insert themselves into arbitrary orgs.
-- Owner row comes from handle_new_organization (service role / trigger).
-- Further staff invites: existing owner/admin only.
-- ---------------------------------------------------------------------------

create or replace function public.has_org_role(p_org_id uuid, p_roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

revoke all on function public.has_org_role(uuid, public.org_role[]) from public;
revoke all on function public.has_org_role(uuid, public.org_role[]) from anon;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;

drop policy if exists "organization_members_insert_member" on public.organization_members;
create policy "organization_members_insert_admin"
  on public.organization_members for insert to authenticated
  with check (
    public.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  );

drop policy if exists "organization_members_update_member" on public.organization_members;
create policy "organization_members_update_admin"
  on public.organization_members for update to authenticated
  using (public.has_org_role(org_id, array['owner', 'admin']::public.org_role[]))
  with check (
    public.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  );

drop policy if exists "organization_members_delete_member" on public.organization_members;
create policy "organization_members_delete_admin"
  on public.organization_members for delete to authenticated
  using (
    public.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and user_id <> auth.uid()
    and role <> 'owner'
  );

-- Owner may update org name, etc.; owner_user_id changes only via service role.
create or replace function public.enforce_owner_user_id_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'owner_user_id can only be changed by service role (payment/ownership transfer)';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_owner_user_id_immutable() from public, anon, authenticated;

drop trigger if exists organizations_owner_immutable on public.organizations;
create trigger organizations_owner_immutable
  before update on public.organizations
  for each row execute function public.enforce_owner_user_id_immutable();

drop policy if exists "organizations_update_member" on public.organizations;
create policy "organizations_update_owner"
  on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner']::public.org_role[]))
  with check (public.has_org_role(id, array['owner']::public.org_role[]));

-- Clients must not create orgs; payment webhook (service role) creates them.
drop policy if exists "organizations_insert_authenticated" on public.organizations;

-- Harden helpers: no anon execute; keep authenticated for RLS expressions.
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.org_id_for_store(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_id_for_store(uuid) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = public;
