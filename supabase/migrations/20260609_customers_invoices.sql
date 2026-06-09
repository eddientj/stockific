-- ── Customers ─────────────────────────────────────────────────
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  address     text,
  city        text,
  postcode    text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── Invoices ──────────────────────────────────────────────────
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null unique,
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text,          -- denormalised snapshot
  issue_date      date not null default current_date,
  due_date        date,
  status          text not null default 'draft'
                    check (status in ('draft','sent','paid','overdue','cancelled')),
  subtotal        numeric(12,2) not null default 0,
  tax_rate        numeric(5,2)  not null default 6,   -- SST 6 %
  discount        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  notes           text,
  payment_terms   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Invoice line items ────────────────────────────────────────
create table if not exists invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  qty         numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  subtotal    numeric(12,2) not null default 0
);

-- Auto-update updated_at on invoices
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists invoices_updated_at on invoices;
create trigger invoices_updated_at
  before update on invoices
  for each row execute function touch_updated_at();
