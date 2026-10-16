-- Operator console: allowlisted Google accounts edit the three plans and read analytics.
-- Privileged reads live in private. PostgREST wrappers are security invoker.
-- See docs/DATA_MODEL.md

alter table public.plans
  add column blurb text not null default '',
  add column recommended boolean not null default false;

update public.plans
set
  blurb = 'Good for a single counter getting started',
  recommended = false
where code = 'starter';

update public.plans
set
  blurb = 'Everything you need for a growing store',
  recommended = true
where code = 'growth';

update public.plans
set
  blurb = 'Advanced features for scaling your business',
  recommended = false
where code = 'pro';

create unique index plans_one_recommended_idx
  on public.plans ((true))
  where recommended;

create or replace function private.reject_plan_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is distinct from old.code or new.interval is distinct from old.interval then
    raise exception 'plan code and interval are fixed';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_plan_identity_change() from public, anon;
grant execute on function private.reject_plan_identity_change() to authenticated;

drop trigger if exists plans_reject_identity_change on public.plans;
create trigger plans_reject_identity_change
  before update on public.plans
  for each row execute function private.reject_plan_identity_change();

create or replace function private.reject_entitlement_plan_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.plan_id is distinct from old.plan_id then
    raise exception 'plan_id is fixed';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_entitlement_plan_change() from public, anon;
grant execute on function private.reject_entitlement_plan_change() to authenticated;

drop trigger if exists plan_entitlements_reject_plan_change on public.plan_entitlements;
create trigger plan_entitlements_reject_plan_change
  before update on public.plan_entitlements
  for each row execute function private.reject_entitlement_plan_change();

create table public.platform_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint platform_admins_email_lowercase check (email = lower(email))
);

alter table public.platform_admins enable row level security;

revoke all on public.platform_admins from anon, authenticated, public;

comment on table public.platform_admins is
  'Operator email allowlist. No policies on purpose: clients cannot read or write it. private.is_platform_admin() checks it.';

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join auth.identities i on i.user_id = u.id and i.provider = 'google'
    join public.platform_admins a
      on a.email = lower(coalesce(i.identity_data ->> 'email', u.email))
    where u.id = auth.uid()
  );
$$;

revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated, service_role;

create or replace function public.am_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

revoke all on function public.am_platform_admin() from public, anon;
grant execute on function public.am_platform_admin() to authenticated;

grant select on public.plans to anon;
grant select on public.plan_entitlements to anon;

create policy "plans_select_anon_active"
  on public.plans for select to anon
  using (is_active);

create policy "plan_entitlements_select_anon_active"
  on public.plan_entitlements for select to anon
  using (
    exists (
      select 1
      from public.plans p
      where p.id = plan_entitlements.plan_id
        and p.is_active
    )
  );

create policy "plans_update_platform_admin"
  on public.plans for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy "plan_entitlements_update_platform_admin"
  on public.plan_entitlements for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

create policy "organizations_select_platform_admin"
  on public.organizations for select to authenticated
  using (private.is_platform_admin());

create policy "profiles_select_platform_admin"
  on public.profiles for select to authenticated
  using (private.is_platform_admin());

create policy "organization_members_select_platform_admin"
  on public.organization_members for select to authenticated
  using (private.is_platform_admin());

create policy "subscriptions_select_platform_admin"
  on public.subscriptions for select to authenticated
  using (private.is_platform_admin());

create policy "stores_select_platform_admin"
  on public.stores for select to authenticated
  using (private.is_platform_admin());

create policy "payment_events_select_platform_admin"
  on public.payment_events for select to authenticated
  using (private.is_platform_admin());

create or replace function private.platform_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null or not private.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'organization_count', (select count(*)::int from public.organizations),
    'paying_count', (
      select count(*)::int
      from public.subscriptions s
      where s.status in ('trialing'::public.subscription_status, 'active'::public.subscription_status)
        and (s.current_period_end is null or s.current_period_end > now())
    ),
    'mrr_paise', (
      select coalesce(sum(p.price_paise), 0)::int
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.status in ('trialing'::public.subscription_status, 'active'::public.subscription_status)
        and (s.current_period_end is null or s.current_period_end > now())
    ),
    'collected_paise_30d', (
      select coalesce(sum(pe.amount_paise), 0)::int
      from public.payment_events pe
      where pe.status = 'captured'
        and pe.created_at > now() - interval '30 days'
    ),
    'paid_bill_count_30d', (
      select count(*)::int
      from public.bills b
      where b.status = 'paid'::public.bill_status
        and b.billed_at > now() - interval '30 days'
    ),
    'paid_bill_total', (
      select coalesce(sum(b.total), 0)
      from public.bills b
      where b.status = 'paid'::public.bill_status
        and b.billed_at > now() - interval '30 days'
    ),
    'plan_mix', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', p.code,
          'name', p.name,
          'paying_count', (
            select count(*)::int
            from public.subscriptions s
            where s.plan_id = p.id
              and s.status in ('trialing'::public.subscription_status, 'active'::public.subscription_status)
              and (s.current_period_end is null or s.current_period_end > now())
          )
        )
        order by p.sort_order
      )
      from public.plans p
    ), '[]'::jsonb),
    'customers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'phone', pr.phone,
          'closed_at', o.closed_at,
          'plan_code', p.code,
          'plan_name', p.name,
          'status', s.status,
          'period_end', s.current_period_end,
          'store_count', (select count(*)::int from public.stores st where st.org_id = o.id),
          'paid_sales', (
            select coalesce(sum(b.total), 0)
            from public.bills b
            join public.stores st on st.id = b.store_id
            where st.org_id = o.id
              and b.status = 'paid'::public.bill_status
          ),
          'created_at', o.created_at
        )
        order by o.created_at desc
      )
      from public.organizations o
      left join public.profiles pr on pr.id = o.owner_user_id
      left join public.subscriptions s on s.org_id = o.id
      left join public.plans p on p.id = s.plan_id
    ), '[]'::jsonb),
    'recent_payments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pe.id,
          'amount_paise', pe.amount_paise,
          'phone', pe.owner_phone,
          'plan_code', pe.payload ->> 'plan_code',
          'created_at', pe.created_at
        )
        order by pe.created_at desc
      )
      from (
        select id, amount_paise, owner_phone, payload, created_at
        from public.payment_events
        where status = 'captured'
        order by created_at desc
        limit 20
      ) pe
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function private.platform_snapshot() from public, anon;
grant execute on function private.platform_snapshot() to authenticated, service_role;

create or replace function public.platform_snapshot()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return private.platform_snapshot();
end;
$$;

revoke all on function public.platform_snapshot() from public, anon;
grant execute on function public.platform_snapshot() to authenticated;

comment on function public.platform_snapshot() is
  'Operator analytics. Refuses anyone who is not an allowlisted Google account.';

comment on function public.am_platform_admin() is
  'True when the session is a Google identity on the platform_admins email list.';
