create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'cash',
  reference   text,
  notes       text,
  paid_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists payments_invoice_id_idx on payments(invoice_id);
