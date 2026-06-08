-- Stockific schema — paste into Supabase SQL Editor and run.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.

-- Extensions
create extension if not exists "pgcrypto";

-- =====================================================================
-- categories
-- =====================================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- products
-- =====================================================================
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  price       numeric(10,2) not null check (price >= 0),
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active);

-- =====================================================================
-- variants (size, condition, etc.)
-- =====================================================================
create table if not exists public.variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  name            text not null,
  sku             text unique,
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  price_override  numeric(10,2) check (price_override >= 0),
  created_at      timestamptz not null default now()
);
create index if not exists variants_product_idx on public.variants(product_id);

-- =====================================================================
-- orders
-- =====================================================================
do $$ begin
  create type public.order_status as enum ('pending','paid','cancelled','refunded','failed');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,
  total_amount    numeric(10,2) not null check (total_amount >= 0),
  status          public.order_status not null default 'pending',
  hitpay_payment_id  text,
  hitpay_reference   text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- =====================================================================
-- order_items
-- =====================================================================
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  variant_id  uuid references public.variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null check (unit_price >= 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- All API access goes through Nuxt server routes using the service role
-- key, which bypasses RLS. We enable RLS to block direct anon access
-- except for explicitly allowed public reads (active products/categories).
-- =====================================================================
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.variants    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
  for select using (true);

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products
  for select using (is_active = true);

drop policy if exists "public read variants" on public.variants;
create policy "public read variants" on public.variants
  for select using (true);

-- orders and order_items: no anon policies — server-only via service key.

-- =====================================================================
-- Seed data (Pokemon TCG demo)
-- =====================================================================
insert into public.categories (name) values
  ('Pokemon'), ('One Piece'), ('Digimon'), ('Accessories')
on conflict (name) do nothing;
