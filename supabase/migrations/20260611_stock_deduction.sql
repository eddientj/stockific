-- ── 1. Link order_items back to products / variants ─────────────
alter table order_items
  add column if not exists product_id uuid references products(id) on delete set null,
  add column if not exists variant_id  uuid references variants(id)  on delete set null;

create index if not exists order_items_product_id_idx on order_items(product_id);

-- ── 2. apply_order_hold ──────────────────────────────────────────
-- Called when order moves Pending → Confirmed.
-- Increments stock_on_hold on the matching variant.
create or replace function apply_order_hold(p_order_id uuid)
returns void language plpgsql as $$
declare
  r record;
  v_variant_id uuid;
begin
  for r in
    select oi.qty, oi.product_id, oi.variant_id
    from   order_items oi
    where  oi.order_id = p_order_id
    and    oi.product_id is not null
  loop
    -- prefer the stored variant_id; fall back to the product's first variant
    v_variant_id := r.variant_id;
    if v_variant_id is null then
      select id into v_variant_id
      from   variants
      where  product_id = r.product_id
      order  by created_at
      limit  1;
    end if;

    if v_variant_id is not null then
      update variants
      set    stock_on_hold = stock_on_hold + r.qty
      where  id = v_variant_id;
    end if;
  end loop;
end;
$$;

-- ── 3. release_order_hold ────────────────────────────────────────
-- Called when a Confirmed/Shipped order is Cancelled.
-- Reverses the hold without touching stock_quantity.
create or replace function release_order_hold(p_order_id uuid)
returns void language plpgsql as $$
declare
  r record;
  v_variant_id uuid;
begin
  for r in
    select oi.qty, oi.product_id, oi.variant_id
    from   order_items oi
    where  oi.order_id = p_order_id
    and    oi.product_id is not null
  loop
    v_variant_id := r.variant_id;
    if v_variant_id is null then
      select id into v_variant_id
      from   variants
      where  product_id = r.product_id
      order  by created_at
      limit  1;
    end if;

    if v_variant_id is not null then
      update variants
      set    stock_on_hold = greatest(0, stock_on_hold - r.qty)
      where  id = v_variant_id;
    end if;
  end loop;
end;
$$;

-- ── 4. deduct_order_stock ────────────────────────────────────────
-- Called when order moves Shipped → Delivered.
-- Decrements both stock_quantity and stock_on_hold (permanent deduction).
create or replace function deduct_order_stock(p_order_id uuid)
returns void language plpgsql as $$
declare
  r record;
  v_variant_id uuid;
begin
  for r in
    select oi.qty, oi.product_id, oi.variant_id
    from   order_items oi
    where  oi.order_id = p_order_id
    and    oi.product_id is not null
  loop
    v_variant_id := r.variant_id;
    if v_variant_id is null then
      select id into v_variant_id
      from   variants
      where  product_id = r.product_id
      order  by created_at
      limit  1;
    end if;

    if v_variant_id is not null then
      update variants
      set    stock_quantity = greatest(0, stock_quantity - r.qty),
             stock_on_hold  = greatest(0, stock_on_hold  - r.qty)
      where  id = v_variant_id;
    end if;
  end loop;
end;
$$;
