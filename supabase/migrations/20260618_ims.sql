-- ============================================================
-- Phase 3 — Complete IMS
-- suppliers, purchase_orders, purchase_order_items,
-- stock_adjustments, reorder_level + cost_price on variants
-- ============================================================

-- 1. Extend variants with cost_price + reorder_level
-- ============================================================
alter table public.variants
  add column if not exists cost_price    numeric(12, 4),
  add column if not exists reorder_level int not null default 0;

-- 2. Suppliers
-- ============================================================
create table if not exists public.suppliers (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organisations(id) on delete cascade,
  name         text        not null,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists suppliers_org_id_idx on public.suppliers(org_id);
create index if not exists suppliers_name_idx   on public.suppliers(org_id, name);

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function touch_updated_at();

-- 3. Purchase orders
-- ============================================================
do $$ begin
  create type public.po_status as enum ('draft', 'ordered', 'partial', 'received', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.purchase_orders (
  id          uuid             primary key default gen_random_uuid(),
  org_id      uuid             not null references public.organisations(id) on delete cascade,
  supplier_id uuid             references public.suppliers(id) on delete set null,
  po_number   text             not null,
  status      public.po_status not null default 'draft',
  notes       text,
  expected_at date,
  created_at  timestamptz      not null default now(),
  updated_at  timestamptz      not null default now(),
  unique (org_id, po_number)
);

create index if not exists po_org_id_idx      on public.purchase_orders(org_id);
create index if not exists po_supplier_id_idx on public.purchase_orders(supplier_id);
create index if not exists po_status_idx      on public.purchase_orders(org_id, status);

drop trigger if exists purchase_orders_updated_at on public.purchase_orders;
create trigger purchase_orders_updated_at
  before update on public.purchase_orders
  for each row execute function touch_updated_at();

-- 4. Purchase order items
-- ============================================================
create table if not exists public.purchase_order_items (
  id           uuid         primary key default gen_random_uuid(),
  po_id        uuid         not null references public.purchase_orders(id) on delete cascade,
  org_id       uuid         not null references public.organisations(id) on delete cascade,
  product_id   uuid         references public.products(id) on delete set null,
  variant_id   uuid         references public.variants(id) on delete set null,
  qty_ordered  int          not null check (qty_ordered > 0),
  qty_received int          not null default 0 check (qty_received >= 0),
  unit_cost    numeric(12, 4) not null default 0,
  created_at   timestamptz  not null default now()
);

create index if not exists poi_po_id_idx      on public.purchase_order_items(po_id);
create index if not exists poi_org_id_idx     on public.purchase_order_items(org_id);
create index if not exists poi_variant_id_idx on public.purchase_order_items(variant_id);

-- 5. Stock adjustments (manual in / out)
-- ============================================================
create table if not exists public.stock_adjustments (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organisations(id) on delete cascade,
  variant_id  uuid        not null references public.variants(id) on delete cascade,
  product_id  uuid        references public.products(id) on delete set null,
  qty         int         not null,   -- positive = stock in, negative = stock out
  reason      text        not null,
  adjusted_by uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists adj_org_id_idx    on public.stock_adjustments(org_id);
create index if not exists adj_variant_idx   on public.stock_adjustments(variant_id);
create index if not exists adj_created_idx   on public.stock_adjustments(org_id, created_at desc);

-- 6. RLS
-- ============================================================
alter table public.suppliers              enable row level security;
alter table public.purchase_orders        enable row level security;
alter table public.purchase_order_items   enable row level security;
alter table public.stock_adjustments      enable row level security;

create policy "org_isolation_suppliers"
  on public.suppliers for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_purchase_orders"
  on public.purchase_orders for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_purchase_order_items"
  on public.purchase_order_items for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_stock_adjustments"
  on public.stock_adjustments for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- 7. PO number sequence helper
-- ============================================================
-- Returns next PO number for an org: PO-0001, PO-0002 …
create or replace function next_po_number(p_org_id uuid)
returns text language plpgsql as $$
declare
  v_seq int;
begin
  select coalesce(max(
    (regexp_match(po_number, 'PO-(\d+)'))[1]::int
  ), 0) + 1
  into v_seq
  from public.purchase_orders
  where org_id = p_org_id;

  return 'PO-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- 8. receive_po_items — stock-in on goods receipt
-- ============================================================
-- Call with array of {poi_id, qty_to_receive} JSON objects.
-- Updates qty_received, increments variant stock_quantity,
-- updates PO status to partial/received automatically.
create or replace function receive_po_items(
  p_org_id uuid,
  p_po_id  uuid,
  p_items  jsonb   -- [{poi_id, qty}]
)
returns void language plpgsql as $$
declare
  item       jsonb;
  v_poi      record;
  v_new_rcvd int;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    select * into v_poi
    from   public.purchase_order_items
    where  id     = (item->>'poi_id')::uuid
    and    po_id  = p_po_id
    and    org_id = p_org_id;

    if not found then continue; end if;

    v_new_rcvd := least(v_poi.qty_ordered,
                        v_poi.qty_received + (item->>'qty')::int);

    -- Update received qty
    update public.purchase_order_items
    set    qty_received = v_new_rcvd
    where  id = v_poi.id;

    -- Increment variant stock
    if v_poi.variant_id is not null then
      update public.variants
      set    stock_quantity = stock_quantity + ((item->>'qty')::int),
             cost_price     = coalesce(nullif(v_poi.unit_cost, 0), cost_price)
      where  id = v_poi.variant_id;
    end if;
  end loop;

  -- Auto-update PO status
  update public.purchase_orders po
  set    status = (
    case
      when (select count(*) from public.purchase_order_items
            where po_id = p_po_id and qty_received < qty_ordered) = 0
      then 'received'::public.po_status
      else 'partial'::public.po_status
    end
  )
  where  id     = p_po_id
  and    org_id = p_org_id
  and    status not in ('cancelled', 'received');
end;
$$;
