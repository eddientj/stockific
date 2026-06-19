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

### 🔨 Not built — needed for the wedge

| Priority | Feature | Why | Status |
|---|---|---|---|
| **P0 (moat)** | **Shopee + Lazada stock sync** | The "make it big" lever; the differentiator | ⛔ **Gated on a feasibility spike** (Open Platform API access, rate limits, OAuth, cost). Resolve before touching the data model. |
| **P1** | **Reorder alerts on dashboard** | Closes the core loop ("know what to reorder") | `reorder_level` column exists; surfacing not built |
| **P1** | **Inventory valuation report** | cost_price × qty; basic IMS reporting | `cost_price` column exists; report not built |
| **P2** | **Billing / subscription** | Required to charge (no manual steps) | HitPay keys stubbed in `.env`; not wired |
| **P2** | **MyInvois e-invoice submission** | Compliance-ready toggle (not the wedge) | Not built; verify LHDN FAQ before building |

> **Onboarding speed (<15 min, self-serve) is a feature, not an afterthought** — it's half the wedge. Guard it on every new addition.

---

## 📋 Working agenda (next up)

In order. Items above the line are the immediate queue; the wedge work (P0–P2 above) follows.

1. **Fix the pipeline kanban board** — drag-and-drop is unreliable (no `dataTransfer` set on dragstart → fails in some browsers), plus snap-back/flicker on drop. CRM is frozen behind the flag, so this is a *fix-then-re-freeze* pass against the agreed kanban ACs, not new investment.
2. **Design tokens propagate automatically on update** — when a brand/`--ui-*`/`--color-brand-*` token changes, every page should pick it up with no manual edits. Audit for any remaining hardcoded colours (e.g. `indigo-500` literals, hex values) and route them through the token system so a single change re-themes the whole app. (Today's teal→emerald fix was a symptom of this not being enforced.)

**Standardization sweep — DONE:** every list table = `AppDataTable` (search · filter · import · export · bulk · standardized empty with click-to-create); every entity create/edit form = `AppFormSlideover`; invoice editor + business settings are the two full-page forms. Remaining inline forms: only the PO-detail add-item/receive contextual modals.

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
