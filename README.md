# Stockific

**Inventory + invoicing for Malaysian small product businesses.** Track stock → sell → issue an invoice → know what to reorder. Built on Nuxt 4 + Supabase.

> **Direction reset — June 2026.** Stockific is **not** an all-in-one SME OS. That framing caused scope creep (we drifted into CRM). It is now a focused, **inventory-first IMS + invoicing** product sold on **speed and price**. CRM is built but parked behind a paygate. See [CONTEXT.md](./CONTEXT.md) for deeper product context.

---

## 🎯 What we're aiming for

**The one-liner:** *Know what you have and what to reorder, and bill for it in minutes — set up before lunch, RM50–200/mo.*

**The wedge (evidence-backed):** The Malaysian market splits into cheap cloud accounting that *isn't* inventory-native (Bukku, Zoho, Financio) and powerful desktop suites that need a consultant and RM500–3,000 to set up (SQL, AutoCount). **Nobody hits inventory-first + cheap + sub-15-minute self-serve setup at once.** That seam is ours.

**The moat / "make it big" lever:** Real-time stock sync across **Shopee + Lazada** — the one pain cheap accounting tools structurally can't solve, in the channels where Malaysian buying volume actually lives.

**What is NOT the wedge:** MyInvois / LHDN e-invoicing. Dec 2025–Jan 2026 policy reversals exempted sub-RM1m businesses permanently and postponed the RM1m–RM5m band to 2027 — so our beachhead has zero compliance urgency. MyInvois is a *"compliance-ready, switch on when you cross RM1m"* feature, not a reason to buy.

---

## 🗺️ Build status — what we have vs. what we need

### ✅ Built — the core loop (free / Starter tier)

| Area | What's there |
|---|---|
| **Products & stock** | Products, variants, stock quantity + on-hold, image upload, categories |
| **Orders** | Order workflow (Pending → Confirmed → Shipped → Delivered) with stock hold/deduct |
| **Invoicing** | Full invoice lifecycle, line items, payments record, statuses incl. refunded |
| **Customers** | Customer records, filters |
| **Suppliers** | Supplier CRUD |
| **Purchase Orders** | Raise PO → send → **receive goods → stock auto-updated**; PO status auto-transitions |
| **Stock adjustments** | Manual stock in/out with reason + audit |
| **Dashboard & Reports** | Revenue, orders, low-stock, sales reports |
| **Settings** | Business settings, EN/BM language switching |
| **Auth & tenancy** | Supabase email/password + Google OAuth, multi-tenant (org_id + RLS on every table), rate limiting, env validation |
| **UI shell** | Collapsible + resizable sidebar, schema-driven forms (`AppFormSlideover`) |

### 🔒 Built — park behind paygate (Growth/Business tier)

| Area | What's there | Plan |
|---|---|---|
| **CRM** | Leads, pipeline kanban, companies, activity log, lead→order conversion, CRM dashboard widget | Hide behind a feature flag. Not part of v1 launch. Re-surface as a paid upsell once core has traction. |

### 🔨 Not built — needed before test user release

| Priority | Feature | Why | Notes |
|---|---|---|---|
| **P0** | **Reorder alerts on dashboard** | Closes the IMS core loop ("know what to reorder") | `reorder_level` column exists; just needs surfacing |
| **P0** | **Invoice send — WhatsApp link + portal page** | The missing last mile; sellers still leave the app to bill | Token-based public invoice URL + `wa.me` pre-fill |
| **P0** | **Tier system (DB only)** | Needed before handing out trial accounts | `tier` + `trial_expires_at` on `orgs`; quota + feature gates in code; no billing yet |
| **P0** | **Platform admin panel** | Needed to provision and manage trial users | Assign tiers, extend trials, view all orgs |
| **P1** | **Inventory valuation report** | cost × qty; basic IMS reporting | `cost_price` column exists; report not built |
| **P1** | **Batch/lot tracking + expiry (FEFO)** | Pharma/F&B pain point — validated user research | `stock_lots` table, batch records per product, FEFO deduction, expiry alerts |
| **P1** | **Barcode alias mapping** | Factory barcode ≠ store SKU; scan-once-map-forever | Store external barcode alias on product; parse GS1 AIs (batch `10`, expiry `17`) at receiving |
| **P2** | **Public catalog page** | Subscriber gets a branded URL; products pulled from their catalog | Template-based, color + logo only; items from admin product catalog |
| **P2** | **Staff roles within org** | Org owner vs staff (restricted: no settings, no billing, no delete) | Role field on org membership |
| **P2** | **Billing / subscription** | Required to charge users | HitPay or Stripe recurring; defer until after test feedback |
| **P3 (moat)** | **Shopee + Lazada stock sync** | The "make it big" lever; differentiator no cheap tool can match | ⛔ Gated on feasibility spike — API access, rate limits, OAuth, cost |
| **Parked** | **MyInvois e-invoice submission** | Policy exempts sub-RM1m permanently; RM1m–RM5m band pushed to 2027 | Compliance-ready toggle when needed, not the wedge |

> **Onboarding speed (<15 min, self-serve) is a feature, not an afterthought** — it's half the wedge. Guard it on every new addition.

---

## 📋 Working agenda (next up)

**Goal: get a functional IMS into test users' hands.** Items in order — complete P0 block first, then P1.

### P0 — Ship to test users
1. **Reorder alerts** — dashboard widget showing products below `reorder_level`. Quick win, `reorder_level` column already exists.
2. **Invoice send** — WhatsApp share link (`wa.me` pre-fill) + token-based public invoice page. The missing last mile before any seller can complete their workflow inside the app.
3. **Tier system** — `tier` enum + `trial_expires_at` on `orgs` table; quota checks (products/invoices/orders) with friendly upgrade nudge; feature gates hide locked menu items. Assign manually in DB — no payment flow yet.
4. **Platform admin panel** — internal page to provision trial orgs, assign tiers, extend trial expiry, view all orgs.

### P1 — Enhance from test feedback
5. **Inventory valuation report** — `cost_price × qty` per product/category.
6. **Batch/lot tracking** — `stock_lots` table, batch records with expiry date + quantity, FEFO picking, expiry alerts. Validated pain point for pharma/F&B/medical stores.
7. **Barcode alias mapping** — scan factory barcode → link to internal SKU once → auto-resolve forever. Parse GS1-128/DataMatrix for batch + expiry at receiving when available.

### Done ✅
- Standardization sweep: every list = `AppDataTable`; every form = `AppFormSlideover`
- Pipeline kanban: native HTML5 drag-to-reorder, UModal delete confirmation
- Design tokens: all `indigo-*` → `brand-*`, all `#6366F1` → `var(--color-brand-500)` / `BRAND_HEX`
- Logo assets: `public/logo.png` (horizontal) + `public/logo-icon.png` (icon)

---

## Setup

```bash
pnpm install
cp .env.example .env   # then fill in the values (see "Secrets" below)
pnpm dev               # http://localhost:3000
```

Verify the Supabase connection at http://localhost:3000/api/health — expect `{ ok: true, products: N }`.

## Database

Run the base schema then the ordered migrations in the Supabase SQL Editor:

1. [supabase/schema.sql](./supabase/schema.sql) — base tables (safe to re-run)
2. Every file in [supabase/migrations/](./supabase/migrations/) **in filename order** — these layer on auth, multi-tenancy, orders, invoices, CRM, and IMS.

Migrations are the source of truth for anything added after the base schema.

## Secrets — where each value lives

| Secret | Local dev (`.env`) | Vercel (production runtime) |
|---|---|---|
| `SUPABASE_URL` | ✅ | ✅ |
| `SUPABASE_ANON_KEY` | ✅ | ✅ |
| `SUPABASE_SERVICE_KEY` | ✅ | ✅ |
| `HITPAY_API_KEY` / `HITPAY_SALT` / `HITPAY_MODE` | ✅ (sandbox) | ⏳ not wired yet (billing is unbuilt) |

**Master copy:** Bitwarden — source of truth. Rotate there first, then propagate.
**Local:** `.env` (gitignored). Never commit.
**Vercel:** Project Settings → Environment Variables, per environment.

> ⚠️ The `service_role` Supabase key bypasses RLS. Never expose it to the browser — it's only read by `server/utils/supabase.ts` inside Nuxt server routes.

## Project layout

```
app/pages/            Vue pages (admin/* = the app, root = auth flows)
app/components/        Generic reusable components (AppFormSlideover, AppSidebar, AppField…)
app/composables/       Data composables (useLeads, useSuppliers, usePurchaseOrders…)
server/api/            Nuxt server routes — all backend logic, scoped by org_id
server/utils/          Server-only helpers (Supabase admin client, requireAuth)
server/middleware/     Rate limiting
supabase/migrations/   Database migrations — run in order in Supabase SQL Editor
```

## Conventions

- **Always use the generic components** (`AppFormSlideover` / `AppForm` / `AppField`). Never hand-roll `UFormField`/`UInput` markup in a page.
- Every server route calls `requireAuth(event)` and scopes queries by `org_id`.
- EN/BM strings live in `app/composables/useLocale.ts`.
