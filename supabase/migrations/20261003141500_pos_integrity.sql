-- POS integrity: stock ledger, issued bills, subscription gate, phone lock,
-- owner membership, entitlement locks, provisioning idempotency, tombstones,
-- barcode uniqueness, and account close that keeps bills.
-- Applied on project thuli-billings as:
--   20261003142244 pos_integrity_stock
--   20261003142303 pos_integrity_bills
--   20261003142330 pos_integrity_access
-- 20261003142221 pos_integrity is an empty history marker.
-- See docs/DATA_MODEL.md.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column closed_at timestamptz,
  add column source_event_id text unique;

alter table public.subscriptions
  add constraint subscriptions_usable_has_period check (
    status not in ('trialing', 'active')
    or (
      current_period_end is not null
      and (current_period_start is null or current_period_end > current_period_start)
    )
  );

create unique index subscriptions_razorpay_subscription_uidx
  on public.subscriptions (razorpay_subscription_id)
  where razorpay_subscription_id is not null;

alter table public.categories
  add column revision bigint not null default 1;
alter table public.stores
  add column revision bigint not null default 1;
alter table public.products
  add column revision bigint not null default 1;
alter table public.bills
  add column revision bigint not null default 1,
  add column seller_name text,
  add column seller_gstin text,
  add column seller_address text,
  add column received_at timestamptz not null default now();
alter table public.bill_items
  add column revision bigint not null default 1;

alter table public.products
  add constraint products_stock_qty_nonneg check (stock_qty >= 0);

alter table public.stock_movements
  drop constraint stock_movements_product_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_product_id_fkey
  foreign key (product_id) references public.products (id) on delete restrict;

alter table public.stock_movements
  add constraint stock_movements_delta_sign check (
    (reason = 'sale' and delta < 0 and ref_type is not null and ref_id is not null)
    or (reason = 'receive' and delta > 0)
    or (reason = 'adjust' and delta <> 0)
  );

create unique index stock_movements_idem_uidx
  on public.stock_movements (product_id, ref_type, ref_id)
  where ref_type is not null and ref_id is not null;

drop index if exists public.products_barcode_idx;
create unique index products_store_barcode_uidx
  on public.products (store_id, barcode)
  where barcode is not null and btrim(barcode) <> '';

alter table public.profiles
  add constraint profiles_phone_e164
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

alter table public.payment_events
  drop constraint payment_events_org_id_fkey;
alter table public.payment_events
  add constraint payment_events_org_id_fkey
  foreign key (org_id) references public.organizations (id) on delete restrict;

comment on column public.bills.client_id is
  'Per-sale idempotency key minted by the device. Not the install id.';
comment on column public.organizations.source_event_id is
  'razorpay_event_id claimed before this org is inserted. Retry must conflict here.';
comment on column public.organizations.closed_at is
  'Set by delete_own_account. Bills stay. Writes on this org are rejected.';

-- ---------------------------------------------------------------------------
-- Revision: sync must UPDATE ... WHERE revision = <the revision it read>
-- ---------------------------------------------------------------------------

create or replace function public.bump_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public.bump_revision() from public, anon, authenticated;

drop trigger if exists categories_set_updated_at on public.categories;
drop trigger if exists stores_set_updated_at on public.stores;
drop trigger if exists products_set_updated_at on public.products;
drop trigger if exists bills_set_updated_at on public.bills;
drop trigger if exists bill_items_set_updated_at on public.bill_items;

create trigger categories_bump_revision
  before update on public.categories
  for each row execute function public.bump_revision();
create trigger stores_bump_revision
  before update on public.stores
  for each row execute function public.bump_revision();
create trigger products_bump_revision
  before update on public.products
  for each row execute function public.bump_revision();
create trigger bills_bump_revision
  before update on public.bills
  for each row execute function public.bump_revision();
create trigger bill_items_bump_revision
  before update on public.bill_items
  for each row execute function public.bump_revision();

-- ---------------------------------------------------------------------------
-- Stock ledger
-- ---------------------------------------------------------------------------

create or replace function private.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('thuli.stock_write', '1', true);
  update public.products
     set stock_qty = stock_qty + new.delta
   where id = new.product_id;
  if not found then
    raise exception 'unknown product_id';
  end if;
  return new;
end;
$$;

create or replace function private.stock_movements_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'stock_movements are append-only; post an adjust row';
end;
$$;

create or replace function private.reject_direct_stock_qty_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.stock_qty <> 0
     and current_setting('thuli.stock_write', true) is distinct from '1' then
    raise exception 'opening stock is a receive movement';
  end if;
  if tg_op = 'UPDATE'
     and new.stock_qty is distinct from old.stock_qty
     and current_setting('thuli.stock_write', true) is distinct from '1' then
    raise exception 'stock_qty changes only through stock_movements';
  end if;
  return new;
end;
$$;

revoke all on function private.apply_stock_movement() from public, anon, authenticated;
revoke all on function private.stock_movements_append_only() from public, anon, authenticated;
revoke all on function private.reject_direct_stock_qty_write() from public, anon, authenticated;

create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row execute function private.apply_stock_movement();

create trigger stock_movements_no_update
  before update or delete on public.stock_movements
  for each row execute function private.stock_movements_append_only();

create trigger products_stock_qty_derived
  before insert or update on public.products
  for each row execute function private.reject_direct_stock_qty_write();

-- ---------------------------------------------------------------------------
-- store_id cannot move between stores
-- ---------------------------------------------------------------------------

create or replace function private.reject_store_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.store_id is distinct from old.store_id then
    raise exception 'store_id is immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_store_id_change() from public, anon, authenticated;

create trigger categories_store_immutable
  before update on public.categories
  for each row execute function private.reject_store_id_change();
create trigger products_store_immutable
  before update on public.products
  for each row execute function private.reject_store_id_change();
create trigger bills_store_immutable
  before update on public.bills
  for each row execute function private.reject_store_id_change();
create trigger stock_movements_store_immutable
  before update on public.stock_movements
  for each row execute function private.reject_store_id_change();

-- ---------------------------------------------------------------------------
-- Issued bills
-- ---------------------------------------------------------------------------

create or replace function private.enforce_bill_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_sum numeric(12,2);
  line_sum numeric(12,2);
begin
  if tg_op = 'UPDATE' and old.status in ('paid', 'void') then
    if old.status = 'void'
       or new.store_id is distinct from old.store_id
       or new.bill_number is distinct from old.bill_number
       or new.billed_at is distinct from old.billed_at
       or new.customer_name is distinct from old.customer_name
       or new.subtotal is distinct from old.subtotal
       or new.discount is distinct from old.discount
       or new.taxable is distinct from old.taxable
       or new.gst is distinct from old.gst
       or new.total is distinct from old.total
       or new.seller_name is distinct from old.seller_name
       or new.seller_gstin is distinct from old.seller_gstin
       or new.seller_address is distinct from old.seller_address
       or new.received_at is distinct from old.received_at
       or new.client_id is distinct from old.client_id
       or (old.status = 'paid' and new.status not in ('paid', 'void'))
    then
      raise exception 'issued bills are immutable';
    end if;
  end if;

  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select coalesce(sum(amount), 0) into paid_sum
      from public.bill_payments where bill_id = new.id;
    select coalesce(sum(line_total), 0) into line_sum
      from public.bill_items where bill_id = new.id;
    if paid_sum <> new.total or line_sum <> new.total then
      raise exception 'paid total must equal sum of lines and sum of payments';
    end if;
    select s.name, s.gstin, s.address
      into new.seller_name, new.seller_gstin, new.seller_address
      from public.stores s where s.id = new.store_id;
  end if;

  if tg_op = 'UPDATE' and old.status = 'paid' and new.status = 'void' then
    insert into public.stock_movements (store_id, product_id, delta, reason, ref_type, ref_id)
    select new.store_id, bi.product_id, bi.quantity, 'adjust', 'bill_void', bi.id
      from public.bill_items bi
     where bi.bill_id = new.id
       and bi.product_id is not null;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_bill_child_locked()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  st public.bill_status;
  bid uuid := coalesce(new.bill_id, old.bill_id);
begin
  select status into st from public.bills where id = bid for update;
  if st in ('paid', 'void') then
    raise exception 'lines and payments on an issued bill are frozen';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_bill_document() from public, anon, authenticated;
revoke all on function private.enforce_bill_child_locked() from public, anon, authenticated;

create trigger bills_enforce_document
  before insert or update on public.bills
  for each row execute function private.enforce_bill_document();

create trigger bill_items_locked
  before insert or update or delete on public.bill_items
  for each row execute function private.enforce_bill_child_locked();

create trigger bill_payments_locked
  before insert or update or delete on public.bill_payments
  for each row execute function private.enforce_bill_child_locked();

-- ---------------------------------------------------------------------------
-- Subscription gate. Store/staff/product caps stay strict.
-- Bill insert is allowed until period_end + 7 days so an offline queue can land.
-- received_at is server time and cannot be backdated by the client.
-- ---------------------------------------------------------------------------

create or replace function private.subscription_is_usable(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions sub
    where sub.org_id = p_org_id
      and sub.status in ('trialing', 'active')
      and sub.current_period_end > now()
  );
$$;

create or replace function private.enforce_bill_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  new.received_at := now();
  v_org := private.org_id_for_store(new.store_id);
  if not exists (
    select 1
    from public.subscriptions s
    where s.org_id = v_org
      and s.current_period_end is not null
      and now() <= s.current_period_end + interval '7 days'
  ) then
    raise exception 'subscription does not cover this sale';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_bill_subscription() from public, anon, authenticated;

create trigger bills_require_subscription
  before insert on public.bills
  for each row execute function private.enforce_bill_subscription();

-- ---------------------------------------------------------------------------
-- Closed organizations reject operational writes. History stays readable.
-- ---------------------------------------------------------------------------

create or replace function private.reject_closed_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_closed timestamptz;
begin
  if tg_op = 'DELETE' then
    if tg_table_name in ('stores', 'organization_members') then
      v_org := old.org_id;
    elsif tg_table_name in ('bills', 'categories', 'products', 'stock_movements') then
      v_org := private.org_id_for_store(old.store_id);
    elsif tg_table_name in ('bill_items', 'bill_payments') then
      v_org := private.org_id_for_bill(old.bill_id);
    end if;
  elsif tg_table_name in ('stores', 'organization_members') then
    v_org := new.org_id;
  elsif tg_table_name in ('bills', 'categories', 'products', 'stock_movements') then
    v_org := private.org_id_for_store(new.store_id);
  elsif tg_table_name in ('bill_items', 'bill_payments') then
    v_org := private.org_id_for_bill(new.bill_id);
  end if;

  select o.closed_at into v_closed
  from public.organizations o
  where o.id = v_org;

  if v_closed is not null then
    raise exception 'organization is closed';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.reject_closed_org() from public, anon, authenticated;

create trigger stores_reject_closed
  before insert or update or delete on public.stores
  for each row execute function private.reject_closed_org();
create trigger members_reject_closed
  before insert or update or delete on public.organization_members
  for each row execute function private.reject_closed_org();
create trigger categories_reject_closed
  before insert or update or delete on public.categories
  for each row execute function private.reject_closed_org();
create trigger products_reject_closed
  before insert or update or delete on public.products
  for each row execute function private.reject_closed_org();
create trigger bills_reject_closed
  before insert or update or delete on public.bills
  for each row execute function private.reject_closed_org();
create trigger bill_items_reject_closed
  before insert or update or delete on public.bill_items
  for each row execute function private.reject_closed_org();
create trigger bill_payments_reject_closed
  before insert or update or delete on public.bill_payments
  for each row execute function private.reject_closed_org();
create trigger stock_movements_reject_closed
  before insert or update or delete on public.stock_movements
  for each row execute function private.reject_closed_org();

-- ---------------------------------------------------------------------------
-- Entitlement counts lock the organization row first.
-- max_staff counts invitees (role <> owner), not the owner seat.
-- ---------------------------------------------------------------------------

create or replace function private.enforce_store_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ent public.plan_entitlements%rowtype;
  store_count integer;
  v_closed timestamptz;
begin
  select o.closed_at into v_closed
  from public.organizations o
  where o.id = new.org_id
  for update;

  if not found then
    raise exception 'invalid organization';
  end if;
  if v_closed is not null then
    raise exception 'organization is closed';
  end if;
  if not private.subscription_is_usable(new.org_id) then
    raise exception 'subscription inactive: cannot create store';
  end if;
  ent := private.entitlements_for_org(new.org_id);
  if ent.id is null then
    raise exception 'no plan entitlements for organization';
  end if;
  select count(*) into store_count from public.stores s where s.org_id = new.org_id;
  if tg_op = 'INSERT' and store_count >= ent.max_stores then
    raise exception 'max_stores (%) exceeded', ent.max_stores;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_member_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ent public.plan_entitlements%rowtype;
  member_count integer;
  v_closed timestamptz;
begin
  if new.role = 'owner' then
    return new;
  end if;

  select o.closed_at into v_closed
  from public.organizations o
  where o.id = new.org_id
  for update;

  if not found then
    raise exception 'invalid organization';
  end if;
  if v_closed is not null then
    raise exception 'organization is closed';
  end if;
  if not private.subscription_is_usable(new.org_id) then
    raise exception 'subscription inactive: cannot add staff';
  end if;
  ent := private.entitlements_for_org(new.org_id);
  if ent.id is null then
    raise exception 'no plan entitlements for organization';
  end if;
  select count(*) into member_count
  from public.organization_members m
  where m.org_id = new.org_id
    and m.role <> 'owner';
  if tg_op = 'INSERT' and member_count >= ent.max_staff then
    raise exception 'max_staff (%) exceeded', ent.max_staff;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_product_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  ent public.plan_entitlements%rowtype;
  product_count integer;
  v_closed timestamptz;
begin
  v_org_id := private.org_id_for_store(new.store_id);
  if v_org_id is null then
    raise exception 'invalid store_id';
  end if;

  select o.closed_at into v_closed
  from public.organizations o
  where o.id = v_org_id
  for update;

  if v_closed is not null then
    raise exception 'organization is closed';
  end if;
  if not private.subscription_is_usable(v_org_id) then
    raise exception 'subscription inactive: cannot create product';
  end if;
  ent := private.entitlements_for_org(v_org_id);
  if ent.id is null then
    raise exception 'no plan entitlements for organization';
  end if;
  if ent.max_products is not null then
    select count(*) into product_count
    from public.products p
    join public.stores s on s.id = p.store_id
    where s.org_id = v_org_id;
    if tg_op = 'INSERT' and product_count >= ent.max_products then
      raise exception 'max_products (%) exceeded', ent.max_products;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Phone is auth identity, not a profile field the user can retarget
-- ---------------------------------------------------------------------------

create or replace function private.enforce_profile_phone_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_phone text;
begin
  if new.phone is distinct from old.phone
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    select u.phone into auth_phone from auth.users u where u.id = new.id;
    if new.phone is distinct from auth_phone then
      raise exception 'profiles.phone must match auth.users.phone';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.sync_profile_phone_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set phone = new.phone
   where id = new.id;
  return new;
end;
$$;

revoke all on function private.enforce_profile_phone_locked() from public, anon, authenticated;
revoke all on function private.sync_profile_phone_from_auth() from public, anon, authenticated;

create trigger profiles_phone_locked
  before update on public.profiles
  for each row execute function private.enforce_profile_phone_locked();

create trigger on_auth_user_phone_updated
  after update of phone on auth.users
  for each row
  when (new.phone is distinct from old.phone)
  execute function private.sync_profile_phone_from_auth();

-- ---------------------------------------------------------------------------
-- Owner role cannot be stripped by an admin. Service role can transfer it.
-- ---------------------------------------------------------------------------

drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin"
  on public.organization_members for update to authenticated
  using (
    private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  )
  with check (
    private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  );

create or replace function private.reject_owner_demotion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role = 'owner'
     and new.role is distinct from 'owner'
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'owner membership can only be changed by service role';
  end if;
  return new;
end;
$$;

revoke all on function private.reject_owner_demotion() from public, anon, authenticated;

create trigger organization_members_owner_sticky
  before update on public.organization_members
  for each row execute function private.reject_owner_demotion();

create or replace function private.sync_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.owner_user_id is distinct from old.owner_user_id then
    update public.organization_members
       set role = 'admin'
     where org_id = new.id
       and user_id = old.owner_user_id
       and role = 'owner';
    insert into public.organization_members (org_id, user_id, role)
    values (new.id, new.owner_user_id, 'owner')
    on conflict (org_id, user_id) do update
      set role = 'owner',
          updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.sync_owner_membership() from public, anon, authenticated;

create trigger organizations_sync_owner_membership
  after update of owner_user_id on public.organizations
  for each row execute function private.sync_owner_membership();

-- ---------------------------------------------------------------------------
-- Tombstone writes follow delete rights
-- ---------------------------------------------------------------------------

drop policy if exists "sync_tombstones_insert_member" on public.sync_tombstones;
drop policy if exists "sync_tombstones_update_member" on public.sync_tombstones;

create policy "sync_tombstones_insert_manager"
  on public.sync_tombstones for insert to authenticated
  with check (
    private.has_org_role(
      private.org_id_for_store(store_id),
      array['owner', 'admin', 'manager']::public.org_role[]
    )
  );

create policy "sync_tombstones_update_manager"
  on public.sync_tombstones for update to authenticated
  using (
    private.has_org_role(
      private.org_id_for_store(store_id),
      array['owner', 'admin', 'manager']::public.org_role[]
    )
  )
  with check (
    private.has_org_role(
      private.org_id_for_store(store_id),
      array['owner', 'admin', 'manager']::public.org_role[]
    )
  );

-- ---------------------------------------------------------------------------
-- Close the org. Keep bills. Do not delete auth.users (owner FK is RESTRICT).
-- ---------------------------------------------------------------------------

create or replace function private.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.payment_events
     set owner_phone = null,
         payload = jsonb_build_object('redacted', true)
   where org_id in (
     select id from public.organizations where owner_user_id = uid
   );

  update public.organizations
     set closed_at = coalesce(closed_at, now())
   where owner_user_id = uid;
end;
$$;

comment on function public.delete_own_account() is
  'Closes organizations owned by the caller and redacts their payment payloads. Bills remain. The auth user remains because organizations.owner_user_id is ON DELETE RESTRICT.';
