# Stockific

Inventory management for Malaysian SMEs. Nuxt 4 + Supabase + HitPay. See [CONTEXT.md](./CONTEXT.md) for product context.

## Setup

```bash
pnpm install
cp .env.example .env   # then fill in the values (see "Secrets" below)
pnpm dev               # http://localhost:3000
```

Verify the Supabase connection at http://localhost:3000/api/health — expect `{ ok: true, products: N }`.

## Database

Open Supabase SQL Editor and run [supabase/schema.sql](./supabase/schema.sql). Safe to re-run.

## Secrets — where each value lives

We have three separate places secrets are read from. Each environment needs its own copy.

| Secret | Local dev (`.env`) | GitHub Actions | Vercel (production runtime) |
|---|---|---|---|
| `SUPABASE_URL` | ✅ | only if CI hits the DB | ✅ |
| `SUPABASE_ANON_KEY` | ✅ | only if CI hits the DB | ✅ |
| `SUPABASE_SERVICE_KEY` | ✅ | only if CI hits the DB | ✅ |
| `HITPAY_API_KEY` | ✅ (sandbox) | — | ✅ (live for prod, sandbox for preview) |
| `HITPAY_SALT` | ✅ (sandbox) | — | ✅ |
| `HITPAY_MODE` | `sandbox` | — | `live` in prod |

**Master copy:** Bitwarden. Treat it as the source of truth — if a key gets rotated, update Bitwarden first, then propagate.

**Local:** `.env` (gitignored). Never commit.

**Vercel:** Project Settings → Environment Variables. Set per environment (Production / Preview / Development). This is what the deployed app actually reads.

**GitHub Actions:** Repo Settings → Secrets and variables → Actions. Only needed if a workflow runs tests against Supabase or deploys via script. For a default Vercel-watches-GitHub deploy, you don't need these.

> ⚠️ The `service_role` Supabase key bypasses RLS. Never expose it to the browser — it's only read by `server/utils/supabase.ts` inside Nuxt server routes.

## Project layout

```
app/                  Vue pages, components, client utils
server/api/           Nuxt server routes — all backend logic lives here
server/utils/         Server-only helpers (Supabase admin client, etc.)
supabase/schema.sql   Database schema — paste into Supabase SQL Editor
```

## Build order

See [CONTEXT.md](./CONTEXT.md#build-order).
