# Agents

Read these before changing code:

1. [ARCHITECTURE.md](./ARCHITECTURE.md) — product goals, stack, multi-tenant model, offline sync, payment boundary, roadmap.
2. [.cursor/rules/](./.cursor/rules/) — always-on and path-scoped coding constraints.

## Current stage

**Models stage:** schema lives in [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md), [`supabase/migrations/`](./supabase/migrations/), [`app/src/types/`](./app/src/types/), [`app/src/db/`](./app/src/db/). Website marketing/checkout UI lives in [`website/`](./website/) (Razorpay not wired yet).

Next: UI (POS-first) wired to models, then sync, then analytics/invoices, then Razorpay on the website.
## Defaults

- Mobile-only work lives in `app/`.
- Prefer simple feature modules under `app/src/features/`.
- Local POS truth: SQLite. Remote truth: Supabase. App checks paid status; does not charge via Razorpay.

## Website design

- **Never** add decorative gradient “bubbles”, soft radial color blobs, or tinted glow orbs in page backgrounds (especially yellow/gold or purple washes behind content). Prefer flat or subtle full-area gradients only — no floating elliptical blobs.
