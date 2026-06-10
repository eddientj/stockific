-- Drop old orders tables (old schema had different columns: total_amount, hitpay_*, etc.)
drop table if exists order_items cascade;
drop table if exists public.order_items cascade;
drop table if exists orders cascade;
drop table if exists public.orders cascade;

-- Also drop old order_status enum if it exists
drop type if exists public.order_status cascade;

-- Orders table (new schema)
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  customer_id       uuid references customers(id) on delete set null,
  customer_name     text not null,
  customer_email    text,
  customer_phone    text,
  customer_address  text,
  customer_city     text,
  customer_postcode text,
  shipping          numeric(10,2) not null default 0,
  status            text not null default 'Pending'
                    check (status in ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Order items (new schema)
create table if not exists order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references orders(id) on delete cascade,
  name      text not null,
  variant   text,
  qty       int  not null default 1 check (qty > 0),
  price     numeric(10,2) not null default 0
);

create index if not exists order_items_order_id_idx on order_items(order_id);

-- Auto-increment order number: ORD-0001, ORD-0002 …
create sequence if not exists orders_number_seq start 1;

create or replace function set_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'ORD-' || lpad(nextval('orders_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_number on orders;
create trigger orders_set_number
  before insert on orders
  for each row execute function set_order_number();

-- updated_at trigger
create or replace function touch_orders_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function touch_orders_updated_at();

-- RLS
alter table orders     enable row level security;
alter table order_items enable row level security;

create policy "service role full access on orders"
  on orders for all using (true) with check (true);
create policy "service role full access on order_items"
  on order_items for all using (true) with check (true);
