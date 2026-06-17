-- ============================================================
-- Multi-tenancy: organisations + org_id on all tenant tables
-- Run once before any real users are onboarded.
-- A default org is created so existing dev data is preserved.
-- ============================================================

-- 1. Organisations table
-- ============================================================
create table if not exists public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists organisations_updated_at on public.organisations;
create trigger organisations_updated_at
  before update on public.organisations
  for each row execute function touch_updated_at();

-- 2. Seed a default org for all existing dev data
-- ============================================================
insert into public.organisations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Default Organisation', 'default')
on conflict (id) do nothing;

-- 3. Add org_id to every tenant table
-- Default points to the dev org so no existing rows break.
-- ============================================================

alter table public.categories
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.products
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.variants
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.customers
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.orders
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.order_items
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.invoices
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.invoice_items
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

alter table public.payments
  add column if not exists org_id uuid
    not null default '00000000-0000-0000-0000-000000000001'
    references public.organisations(id) on delete cascade;

-- 4. business_settings: currently a single-row table (id = 1).
-- We need one row per org, so we drop the single-row constraint,
-- add org_id as the new natural key, and preserve existing data.
-- ============================================================

-- Drop the single-row check constraint (postgres auto-names it business_settings_id_check)
alter table public.business_settings
  drop constraint if exists business_settings_id_check;

-- Add org_id column
alter table public.business_settings
  add column if not exists org_id uuid
    references public.organisations(id) on delete cascade;

-- Assign the dev org to the existing row
update public.business_settings
  set org_id = '00000000-0000-0000-0000-000000000001'
  where org_id is null;

-- Make org_id not null and unique — one settings row per org
alter table public.business_settings
  alter column org_id set not null;

alter table public.business_settings
  add constraint business_settings_org_id_unique unique (org_id);

-- 5. Indexes for fast org-scoped queries
-- ============================================================
create index if not exists categories_org_id_idx    on public.categories(org_id);
create index if not exists products_org_id_idx      on public.products(org_id);
create index if not exists variants_org_id_idx      on public.variants(org_id);
create index if not exists customers_org_id_idx     on public.customers(org_id);
create index if not exists orders_org_id_idx        on public.orders(org_id);
create index if not exists order_items_org_id_idx   on public.order_items(org_id);
create index if not exists invoices_org_id_idx      on public.invoices(org_id);
create index if not exists invoice_items_org_id_idx on public.invoice_items(org_id);
create index if not exists payments_org_id_idx      on public.payments(org_id);

-- 6. Enable RLS on tables that don't have it yet
-- ============================================================
alter table public.customers         enable row level security;
alter table public.invoices          enable row level security;
alter table public.invoice_items     enable row level security;
alter table public.payments          enable row level security;
alter table public.business_settings enable row level security;
alter table public.organisations     enable row level security;

-- 7. Drop all old open/permissive policies
-- ============================================================
drop policy if exists "public read categories"              on public.categories;
drop policy if exists "public read active products"         on public.products;
drop policy if exists "public read variants"                on public.variants;
drop policy if exists "service role full access on orders"      on public.orders;
drop policy if exists "service role full access on order_items" on public.order_items;

-- 8. New org-scoped RLS policies
-- The service role key (used by all Nuxt server routes) bypasses RLS
-- entirely — so API queries are unaffected. These policies protect
-- against direct DB access using an authenticated user JWT.
-- Pattern: org_id must match the 'org_id' claim in the JWT.
-- ============================================================

create policy "org_isolation_categories"
  on public.categories for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_products"
  on public.products for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_variants"
  on public.variants for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_customers"
  on public.customers for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_orders"
  on public.orders for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_order_items"
  on public.order_items for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_invoices"
  on public.invoices for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_invoice_items"
  on public.invoice_items for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_payments"
  on public.payments for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_business_settings"
  on public.business_settings for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Orgs: users can only read their own org record
create policy "org_isolation_organisations"
  on public.organisations for select
  using (id = (auth.jwt() ->> 'org_id')::uuid);

-- 9. Per-org invoice number counter
-- Replaces the global invoice_number unique constraint with
-- a per-org sequence stored in business_settings.
-- The API will read + increment next_invoice_number atomically.
-- ============================================================
alter table public.business_settings
  add column if not exists next_invoice_number int not null default 1;

alter table public.business_settings
  add column if not exists next_order_number int not null default 1;
