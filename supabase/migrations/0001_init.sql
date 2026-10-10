-- Thuli Billings — initial multi-tenant schema
-- See docs/DATA_MODEL.md

-- ---------------------------------------------------------------------------
-- Extensions / helpers
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auth / tenancy
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_owner_user_id_idx on public.organizations (owner_user_id);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create type public.org_role as enum ('owner', 'admin', 'manager', 'cashier');

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'cashier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_org_id_idx on public.organization_members (org_id);

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  phone text,
  address text,
  gstin text,
  logo_url text,
  is_active boolean not null default true,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_org_id_idx on public.stores (org_id);

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- Membership helpers (after tables exist — SQL functions validate relations at create time)
create or replace function public.is_org_member(p_org_id uuid)
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

create or replace function public.org_id_for_store(p_store_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.org_id from public.stores s where s.id = p_store_id;
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.org_id_for_store(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_id_for_store(uuid) to authenticated;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

create type public.plan_interval as enum ('month', 'year');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_paise integer not null check (price_paise >= 0),
  "interval" public.plan_interval not null default 'month',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.plans (id) on delete cascade,
  max_stores integer not null check (max_stores > 0),
  max_staff integer not null check (max_staff > 0),
  -- null = unlimited
  max_products integer check (max_products is null or max_products > 0),
  analytics boolean not null default false,
  invoices boolean not null default false,
  priority_support boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plan_entitlements_set_updated_at
  before update on public.plan_entitlements
  for each row execute function public.set_updated_at();

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  razorpay_subscription_id text,
  razorpay_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index subscriptions_status_idx on public.subscriptions (status);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete set null,
  event_type text not null,
  razorpay_event_id text not null unique,
  amount_paise integer,
  status text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index payment_events_org_id_idx on public.payment_events (org_id);
create index payment_events_created_at_idx on public.payment_events (created_at desc);

-- ---------------------------------------------------------------------------
-- POS / inventory
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, name)
);

create index categories_store_id_idx on public.categories (store_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  unit text not null default 'Nos',
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12, 2) not null default 0 check (selling_price >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  gst_percent numeric(5, 2) not null default 0 check (gst_percent >= 0 and gst_percent <= 100),
  stock_qty numeric(14, 3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_store_id_idx on public.products (store_id);
create index products_category_id_idx on public.products (category_id);
create index products_barcode_idx on public.products (store_id, barcode) where barcode is not null;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create type public.bill_status as enum ('draft', 'paid', 'pending', 'void');

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  bill_number text not null,
  status public.bill_status not null default 'draft',
  customer_name text,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  taxable numeric(12, 2) not null default 0,
  gst numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  billed_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  -- Device-generated UUID for idempotent sync
  client_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, bill_number),
  unique (store_id, client_id)
);

create index bills_store_id_idx on public.bills (store_id);
create index bills_billed_at_idx on public.bills (store_id, billed_at desc);
create index bills_status_idx on public.bills (store_id, status);

create trigger bills_set_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  gst_percent numeric(5, 2) not null default 0 check (gst_percent >= 0 and gst_percent <= 100),
  line_subtotal numeric(12, 2) not null default 0,
  line_gst numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bill_items_bill_id_idx on public.bill_items (bill_id);
create index bill_items_product_id_idx on public.bill_items (product_id);

create trigger bill_items_set_updated_at
  before update on public.bill_items
  for each row execute function public.set_updated_at();

create type public.payment_mode as enum ('cash', 'upi', 'card', 'other');

create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  mode public.payment_mode not null,
  amount numeric(12, 2) not null check (amount >= 0),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bill_payments_bill_id_idx on public.bill_payments (bill_id);

create trigger bill_payments_set_updated_at
  before update on public.bill_payments
  for each row execute function public.set_updated_at();

create type public.stock_movement_reason as enum ('sale', 'adjust', 'receive');

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  delta numeric(14, 3) not null,
  reason public.stock_movement_reason not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_movements_store_id_idx on public.stock_movements (store_id);
create index stock_movements_product_id_idx on public.stock_movements (product_id);
create index stock_movements_created_at_idx on public.stock_movements (store_id, created_at desc);

create trigger stock_movements_set_updated_at
  before update on public.stock_movements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sync tombstones
-- ---------------------------------------------------------------------------

create table public.sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  store_id uuid references public.stores (id) on delete cascade,
  deleted_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create index sync_tombstones_store_id_idx on public.sync_tombstones (store_id, deleted_at desc);

-- ---------------------------------------------------------------------------
-- Seed plans + entitlements
-- ---------------------------------------------------------------------------

insert into public.plans (id, code, name, price_paise, "interval", sort_order)
values
  ('11111111-1111-1111-1111-111111111001', 'starter', 'Starter', 0, 'month', 1),
  ('11111111-1111-1111-1111-111111111002', 'growth', 'Growth', 0, 'month', 2),
  ('11111111-1111-1111-1111-111111111003', 'pro', 'Pro', 0, 'month', 3);

insert into public.plan_entitlements (
  plan_id, max_stores, max_staff, max_products, analytics, invoices, priority_support
)
values
  ('11111111-1111-1111-1111-111111111001', 1, 2, 50, false, false, false),
  ('11111111-1111-1111-1111-111111111002', 3, 10, 200, true, true, false),
  ('11111111-1111-1111-1111-111111111003', 10, 50, null, true, true, true);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.stores enable row level security;
alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.bill_payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sync_tombstones enable row level security;

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
  using (public.is_org_member(id));

create policy "organizations_insert_authenticated"
  on public.organizations for insert to authenticated
  with check (owner_user_id = auth.uid());

create policy "organizations_update_member"
  on public.organizations for update to authenticated
  using (public.is_org_member(id))
  with check (public.is_org_member(id));

-- organization_members
create policy "organization_members_select_same_org"
  on public.organization_members for select to authenticated
  using (public.is_org_member(org_id));

create policy "organization_members_insert_member"
  on public.organization_members for insert to authenticated
  with check (
    public.is_org_member(org_id)
    or user_id = auth.uid()
  );

create policy "organization_members_update_member"
  on public.organization_members for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "organization_members_delete_member"
  on public.organization_members for delete to authenticated
  using (public.is_org_member(org_id));

-- stores
create policy "stores_select_member"
  on public.stores for select to authenticated
  using (public.is_org_member(org_id));

create policy "stores_insert_member"
  on public.stores for insert to authenticated
  with check (public.is_org_member(org_id));

create policy "stores_update_member"
  on public.stores for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "stores_delete_member"
  on public.stores for delete to authenticated
  using (public.is_org_member(org_id));

-- plans / entitlements (read for logged-in)
create policy "plans_select_authenticated"
  on public.plans for select to authenticated
  using (true);

create policy "plan_entitlements_select_authenticated"
  on public.plan_entitlements for select to authenticated
  using (true);

-- subscriptions: members read; writes via service role (no insert/update policies for authenticated)
create policy "subscriptions_select_member"
  on public.subscriptions for select to authenticated
  using (public.is_org_member(org_id));

-- payment_events: members read; writes via service role
create policy "payment_events_select_member"
  on public.payment_events for select to authenticated
  using (org_id is not null and public.is_org_member(org_id));

-- Helper: store-scoped access
-- categories
create policy "categories_all_member"
  on public.categories for all to authenticated
  using (public.is_org_member(public.org_id_for_store(store_id)))
  with check (public.is_org_member(public.org_id_for_store(store_id)));

create policy "products_all_member"
  on public.products for all to authenticated
  using (public.is_org_member(public.org_id_for_store(store_id)))
  with check (public.is_org_member(public.org_id_for_store(store_id)));

create policy "bills_all_member"
  on public.bills for all to authenticated
  using (public.is_org_member(public.org_id_for_store(store_id)))
  with check (public.is_org_member(public.org_id_for_store(store_id)));

create policy "bill_items_all_member"
  on public.bill_items for all to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_items.bill_id
        and public.is_org_member(public.org_id_for_store(b.store_id))
    )
  )
  with check (
    exists (
      select 1 from public.bills b
      where b.id = bill_items.bill_id
        and public.is_org_member(public.org_id_for_store(b.store_id))
    )
  );

create policy "bill_payments_all_member"
  on public.bill_payments for all to authenticated
  using (
    exists (
      select 1 from public.bills b
      where b.id = bill_payments.bill_id
        and public.is_org_member(public.org_id_for_store(b.store_id))
    )
  )
  with check (
    exists (
      select 1 from public.bills b
      where b.id = bill_payments.bill_id
        and public.is_org_member(public.org_id_for_store(b.store_id))
    )
  );

create policy "stock_movements_all_member"
  on public.stock_movements for all to authenticated
  using (public.is_org_member(public.org_id_for_store(store_id)))
  with check (public.is_org_member(public.org_id_for_store(store_id)));

create policy "sync_tombstones_all_member"
  on public.sync_tombstones for all to authenticated
  using (
    store_id is null
    or public.is_org_member(public.org_id_for_store(store_id))
  )
  with check (
    store_id is null
    or public.is_org_member(public.org_id_for_store(store_id))
  );
