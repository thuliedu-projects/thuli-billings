# Thuli Billings — Architecture

Source of truth for product shape, stack, and stage boundaries. Prefer this over inventing new layers.

## Product goals

- **Fast billing** — POS path is the primary UX; minimize taps and latency.
- **Offline POS** — Sell and update inventory without network; sync when online.
- **Inventory** — Per-store stock, light schema.
- **Revenue analytics** — Simple aggregates from local + synced sales.
- **Invoices** — Generate from completed sales (implementation later).

## Multi-tenant / multi-store

Tenant = **`organizations`** (SaaS customer). Full field notes: [docs/DATA_MODEL.md](./docs/DATA_MODEL.md).

```text
Organization (subscription + plan entitlements)
  └── Store(s)
        ├── Inventory (categories, products, stock_movements)
        └── Sales (bills, bill_items, bill_payments)
  └── Staff (organization_members — org-wide roles)
```

- One organization can own multiple stores; subscription is **org-level** (not per store).
- App must support **store switching**.
- Staff access is org-wide via `organization_members` (no per-store membership table in v1).
- Supabase RLS enforces org isolation on store-scoped rows.
- Keep the data model flat and light; avoid deep nesting and premature abstractions.
- Printers stay device-local (not synced). No customers CRM / returns tables in v1.

## Tech stack

| Layer | Choice |
| --- | --- |
| Mobile | Expo (managed), React Native, TypeScript, Expo Router |
| Local DB | `expo-sqlite` (inventory, carts, sales drafts, sync queue) |
| Cloud | Supabase Auth + Postgres + RLS |
| Payments | Razorpay on **website** only; app **reads** paid / subscription status |
| Website | Vite + React in `website/` — marketing + checkout UI; Razorpay wiring later |

## Repo layout

```text
thuli-billings/
  app/                 # Expo mobile (stage 1)
  website/             # Marketing + checkout UI (Razorpay later)
  supabase/            # Postgres migrations + RLS
  docs/DATA_MODEL.md   # schema, lease, plan entitlements
  ARCHITECTURE.md      # this file
  AGENTS.md            # agent entrypoint
  .cursor/rules/       # coding constraints
```

### Mobile (`app/`)

```text
app/                   # Expo project root
  app/                 # Expo Router routes
    (auth)/
    (pos)/
    (inventory)/
    (analytics)/
    (settings)/
  src/
    features/          # domain modules (billing, inventory, analytics, invoices, auth, sync)
    db/                # SQLite schema, migrations, queries
    lib/               # supabase client, constants
    components/        # shared UI primitives only
    types/             # shared TS types (models land here)
```

## Offline-first sync (principles)

1. **Local writes first** for POS (cart, sale, stock decrement) so billing stays fast offline.
2. Enqueue changes in a simple **sync queue** table.
3. When online: **push** queue → Supabase, then **pull** remote changes for the active store.
4. Conflict policy: **compare-and-swap on `revision`**. `updated_at` is the server receipt time. See [docs/DATA_MODEL.md](./docs/DATA_MODEL.md).
5. Surface sync status in settings (pending / error / last synced). Do not block checkout on sync.

## Offline license lease

Disconnecting forever must not equal unpaid forever. On successful auth/sync the app caches a **license lease** in SQLite (`license_lease`): subscription status, plan entitlements, and `lease_expires_at` (default **7 days**). Offline POS is allowed only while the lease is valid and status was `active`/`trialing`; after expiry, block new bills until online revalidation. Clock rollback forces online check. Details: [docs/DATA_MODEL.md](./docs/DATA_MODEL.md#offline-license-lease).

## Payment boundary

- Subscription / plan payment happens on the **website** via Razorpay webhooks.
- Checkout collects a **mobile number**; after payment that phone is the **organization owner**.
- Website (service role) resolves/creates the auth user for that E.164 phone, inserts `organizations` + subscription + `payment_events` (with `owner_phone`). DB trigger adds `organization_members` (`role = owner`).
- Mobile app **only reads** org paid / active status (and caches the license lease). Sign-in with the same mobile OTP → session is the owner.
- Do **not** embed Razorpay checkout inside the mobile app in stage 1+.

```text
Website (mobile + Razorpay) → org owner = that phone → Supabase
Mobile app → OTP as that phone → reads status → license lease → POS
```

## Architecture rules (non-negotiable)

- Extremely **fast**, user-friendly UI — especially POS.
- **Simple** architecture; do not over-engineer.
- Keep modules **modular** by feature under `src/features/`.
- Keep DB **light** (SQLite + Supabase).
- No Redux/MobX unless a clear need appears; prefer local state + small hooks.
- No website work until mobile core (models → UI → sync) is underway.

## Stage roadmap

1. **Scaffold** — docs, rules, Expo folder structure, deps placeholders.
2. **Models** (current) — TypeScript + SQLite + Supabase alignment; see `docs/DATA_MODEL.md`.
3. **UI** — POS-first screens, then inventory, analytics, settings.
4. **Sync** — queue + push/pull + RLS.
5. **Analytics / invoices** — local aggregates, invoice generation.
6. **Website** — Marketing/checkout UI scaffolded in `website/`; Razorpay + webhooks next.

## Explicit non-goals (for now)

- Full sync engine implementation before models exist.
- Heavy analytics warehouses or reporting DBs.
- Microservices, monorepo tooling (Turborepo, etc.), or shared packages unless clearly needed later.
