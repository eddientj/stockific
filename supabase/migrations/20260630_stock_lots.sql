create table if not exists public.stock_lots (
  id            uuid          primary key default gen_random_uuid(),
  org_id        uuid          not null references public.organisations(id) on delete cascade,
  variant_id    uuid          not null references public.variants(id) on delete cascade,
  product_id    uuid          references public.products(id) on delete set null,
  batch_number  text,
  expiry_date   date,
  qty_received  int           not null check (qty_received > 0),
  qty_remaining int           not null check (qty_remaining >= 0),
  unit_cost     numeric(12,4),
  notes         text,
  received_at   date          not null default current_date,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create index if not exists lots_org_id_idx     on public.stock_lots(org_id);
create index if not exists lots_variant_id_idx on public.stock_lots(org_id, variant_id);
create index if not exists lots_expiry_idx     on public.stock_lots(org_id, expiry_date)
  where expiry_date is not null;

drop trigger if exists stock_lots_updated_at on public.stock_lots;
create trigger stock_lots_updated_at
  before update on public.stock_lots
  for each row execute function touch_updated_at();

alter table public.stock_lots enable row level security;

create policy "org_isolation_stock_lots"
  on public.stock_lots for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);
