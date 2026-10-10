-- Remaining adversary-audit fixes: role RLS, private helpers, tombstones,
-- entitlements, grants, payment_events, cross-store integrity.
-- See docs/DATA_MODEL.md

-- ---------------------------------------------------------------------------
-- 1. Drop all existing policies (so public helpers can be removed)
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Private schema for SECURITY DEFINER helpers (not on PostgREST Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated, service_role, postgres;

create or replace function private.is_org_member(p_org_id uuid)
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
  );
$$;

create or replace function private.has_org_role(p_org_id uuid, p_roles public.org_role[])
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

create or replace function private.org_id_for_store(p_store_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.org_id from public.stores s where s.id = p_store_id;
$$;

create or replace function private.org_id_for_bill(p_bill_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.org_id
  from public.bills b
  join public.stores s on s.id = b.store_id
  where b.id = p_bill_id;
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, public.org_role[]) from public, anon;
revoke all on function private.org_id_for_store(uuid) from public, anon;
revoke all on function private.org_id_for_bill(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.has_org_role(uuid, public.org_role[]) to authenticated, service_role;
grant execute on function private.org_id_for_store(uuid) to authenticated, service_role;
grant execute on function private.org_id_for_bill(uuid) to authenticated, service_role;

drop function if exists public.is_org_member(uuid);
drop function if exists public.org_id_for_store(uuid);
drop function if exists public.has_org_role(uuid, public.org_role[]);

-- ---------------------------------------------------------------------------
-- 3. Entitlement / subscription enforce triggers
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
      and (
        sub.current_period_end is null
        or sub.current_period_end > now()
      )
  );
$$;

create or replace function private.entitlements_for_org(p_org_id uuid)
returns public.plan_entitlements
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.subscriptions sub
  join public.plan_entitlements e on e.plan_id = sub.plan_id
  where sub.org_id = p_org_id
  limit 1;
$$;

revoke all on function private.subscription_is_usable(uuid) from public, anon;
revoke all on function private.entitlements_for_org(uuid) from public, anon;
grant execute on function private.subscription_is_usable(uuid) to authenticated, service_role;
grant execute on function private.entitlements_for_org(uuid) to authenticated, service_role;

create or replace function private.enforce_store_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ent public.plan_entitlements%rowtype;
  store_count integer;
begin
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
begin
  if new.role = 'owner' then
    return new;
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
  where m.org_id = new.org_id;
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
begin
  v_org_id := private.org_id_for_store(new.store_id);
  if v_org_id is null then
    raise exception 'invalid store_id';
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

revoke all on function private.enforce_store_entitlements() from public, anon, authenticated;
revoke all on function private.enforce_member_entitlements() from public, anon, authenticated;
revoke all on function private.enforce_product_entitlements() from public, anon, authenticated;

drop trigger if exists stores_enforce_entitlements on public.stores;
create trigger stores_enforce_entitlements
  before insert on public.stores
  for each row execute function private.enforce_store_entitlements();

drop trigger if exists organization_members_enforce_entitlements on public.organization_members;
create trigger organization_members_enforce_entitlements
  before insert on public.organization_members
  for each row execute function private.enforce_member_entitlements();

drop trigger if exists products_enforce_entitlements on public.products;
create trigger products_enforce_entitlements
  before insert on public.products
  for each row execute function private.enforce_product_entitlements();

-- ---------------------------------------------------------------------------
-- 4. Cross-store integrity
-- ---------------------------------------------------------------------------

create or replace function private.enforce_product_category_same_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category_id is not null then
    if not exists (
      select 1 from public.categories c
      where c.id = new.category_id and c.store_id = new.store_id
    ) then
      raise exception 'category_id must belong to the same store';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_stock_movement_same_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.products p
    where p.id = new.product_id and p.store_id = new.store_id
  ) then
    raise exception 'product_id must belong to the same store as stock_movement';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_bill_item_product_same_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  if new.product_id is null then
    return new;
  end if;
  select b.store_id into v_store_id from public.bills b where b.id = new.bill_id;
  if v_store_id is null then
    raise exception 'invalid bill_id';
  end if;
  if not exists (
    select 1 from public.products p
    where p.id = new.product_id and p.store_id = v_store_id
  ) then
    raise exception 'product_id must belong to the same store as the bill';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_product_category_same_store() from public, anon, authenticated;
revoke all on function private.enforce_stock_movement_same_store() from public, anon, authenticated;
revoke all on function private.enforce_bill_item_product_same_store() from public, anon, authenticated;

drop trigger if exists products_category_same_store on public.products;
create trigger products_category_same_store
  before insert or update on public.products
  for each row execute function private.enforce_product_category_same_store();

drop trigger if exists stock_movements_same_store on public.stock_movements;
create trigger stock_movements_same_store
  before insert or update on public.stock_movements
  for each row execute function private.enforce_stock_movement_same_store();

drop trigger if exists bill_items_product_same_store on public.bill_items;
create trigger bill_items_product_same_store
  before insert or update on public.bill_items
  for each row execute function private.enforce_bill_item_product_same_store();

-- ---------------------------------------------------------------------------
-- 5. sync_tombstones: require store_id
-- ---------------------------------------------------------------------------

delete from public.sync_tombstones where store_id is null;

alter table public.sync_tombstones
  alter column store_id set not null;

-- ---------------------------------------------------------------------------
-- 6. Table grants (no TRUNCATE for client roles)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated, public;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS policies
-- ---------------------------------------------------------------------------

-- profiles
create policy "profiles_select_own_or_org_peer"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members peer on peer.org_id = me.org_id
      where me.user_id = auth.uid()
        and peer.user_id = profiles.id
    )
  );

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- organizations
create policy "organizations_select_member"
  on public.organizations for select to authenticated
  using (private.is_org_member(id));

create policy "organizations_update_owner"
  on public.organizations for update to authenticated
  using (private.has_org_role(id, array['owner']::public.org_role[]))
  with check (private.has_org_role(id, array['owner']::public.org_role[]));

-- organization_members
create policy "organization_members_select_same_org"
  on public.organization_members for select to authenticated
  using (private.is_org_member(org_id));

create policy "organization_members_insert_admin"
  on public.organization_members for insert to authenticated
  with check (
    private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  );

create policy "organization_members_update_admin"
  on public.organization_members for update to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]))
  with check (
    private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and role <> 'owner'
  );

create policy "organization_members_delete_admin"
  on public.organization_members for delete to authenticated
  using (
    private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
    and user_id <> auth.uid()
    and role <> 'owner'
  );

-- stores: member read; owner/admin write
create policy "stores_select_member"
  on public.stores for select to authenticated
  using (private.is_org_member(org_id));

create policy "stores_insert_admin"
  on public.stores for insert to authenticated
  with check (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy "stores_update_admin"
  on public.stores for update to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]))
  with check (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy "stores_delete_admin"
  on public.stores for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

-- plans / entitlements
create policy "plans_select_authenticated"
  on public.plans for select to authenticated
  using (true);

create policy "plan_entitlements_select_authenticated"
  on public.plan_entitlements for select to authenticated
  using (true);

-- subscriptions
create policy "subscriptions_select_member"
  on public.subscriptions for select to authenticated
  using (private.is_org_member(org_id));

-- payment_events: owner/admin only
create policy "payment_events_select_admin"
  on public.payment_events for select to authenticated
  using (
    org_id is not null
    and private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
  );

-- categories: member read; owner/admin/manager write
create policy "categories_select_member"
  on public.categories for select to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)));
create policy "categories_write_manager"
  on public.categories for insert to authenticated
  with check (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));
create policy "categories_update_manager"
  on public.categories for update to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]))
  with check (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));
create policy "categories_delete_manager"
  on public.categories for delete to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));

-- products
create policy "products_select_member"
  on public.products for select to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)));
create policy "products_write_manager"
  on public.products for insert to authenticated
  with check (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));
create policy "products_update_manager"
  on public.products for update to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]))
  with check (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));
create policy "products_delete_manager"
  on public.products for delete to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));

-- bills: cashier+ write; manager+ delete
create policy "bills_select_member"
  on public.bills for select to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)));
create policy "bills_insert_member"
  on public.bills for insert to authenticated
  with check (private.is_org_member(private.org_id_for_store(store_id)));
create policy "bills_update_member"
  on public.bills for update to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)))
  with check (private.is_org_member(private.org_id_for_store(store_id)));
create policy "bills_delete_manager"
  on public.bills for delete to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));

create policy "bill_items_select_member"
  on public.bill_items for select to authenticated
  using (private.is_org_member(private.org_id_for_bill(bill_id)));
create policy "bill_items_insert_member"
  on public.bill_items for insert to authenticated
  with check (private.is_org_member(private.org_id_for_bill(bill_id)));
create policy "bill_items_update_member"
  on public.bill_items for update to authenticated
  using (private.is_org_member(private.org_id_for_bill(bill_id)))
  with check (private.is_org_member(private.org_id_for_bill(bill_id)));
create policy "bill_items_delete_manager"
  on public.bill_items for delete to authenticated
  using (private.has_org_role(private.org_id_for_bill(bill_id), array['owner', 'admin', 'manager']::public.org_role[]));

create policy "bill_payments_select_member"
  on public.bill_payments for select to authenticated
  using (private.is_org_member(private.org_id_for_bill(bill_id)));
create policy "bill_payments_insert_member"
  on public.bill_payments for insert to authenticated
  with check (private.is_org_member(private.org_id_for_bill(bill_id)));
create policy "bill_payments_update_member"
  on public.bill_payments for update to authenticated
  using (private.is_org_member(private.org_id_for_bill(bill_id)))
  with check (private.is_org_member(private.org_id_for_bill(bill_id)));
create policy "bill_payments_delete_manager"
  on public.bill_payments for delete to authenticated
  using (private.has_org_role(private.org_id_for_bill(bill_id), array['owner', 'admin', 'manager']::public.org_role[]));

-- stock_movements
create policy "stock_movements_select_member"
  on public.stock_movements for select to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)));
create policy "stock_movements_insert_member"
  on public.stock_movements for insert to authenticated
  with check (private.is_org_member(private.org_id_for_store(store_id)));
create policy "stock_movements_update_manager"
  on public.stock_movements for update to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]))
  with check (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));
create policy "stock_movements_delete_manager"
  on public.stock_movements for delete to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));

-- sync_tombstones
create policy "sync_tombstones_select_member"
  on public.sync_tombstones for select to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)));
create policy "sync_tombstones_insert_member"
  on public.sync_tombstones for insert to authenticated
  with check (private.is_org_member(private.org_id_for_store(store_id)));
create policy "sync_tombstones_update_member"
  on public.sync_tombstones for update to authenticated
  using (private.is_org_member(private.org_id_for_store(store_id)))
  with check (private.is_org_member(private.org_id_for_store(store_id)));
create policy "sync_tombstones_delete_manager"
  on public.sync_tombstones for delete to authenticated
  using (private.has_org_role(private.org_id_for_store(store_id), array['owner', 'admin', 'manager']::public.org_role[]));
