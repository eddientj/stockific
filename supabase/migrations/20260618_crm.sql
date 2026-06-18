-- ============================================================
-- CRM Layer: companies, pipeline_stages, leads, activities
-- ============================================================

-- 1. Companies
-- ============================================================
create table if not exists public.companies (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organisations(id) on delete cascade,
  name        text        not null,
  industry    text,
  website     text,
  phone       text,
  email       text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists companies_org_id_idx on public.companies(org_id);
create index if not exists companies_name_idx   on public.companies(org_id, name);

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
  before update on public.companies
  for each row execute function touch_updated_at();

-- 2. Pipeline stages (org-scoped, ordered)
-- ============================================================
create table if not exists public.pipeline_stages (
  id              uuid    primary key default gen_random_uuid(),
  org_id          uuid    not null references public.organisations(id) on delete cascade,
  name            text    not null,
  position        int     not null default 0,
  color           text    not null default '#6366f1',
  is_closed_won   boolean not null default false,
  is_closed_lost  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists pipeline_stages_org_id_idx on public.pipeline_stages(org_id, position);
create unique index if not exists pipeline_stages_org_position_idx on public.pipeline_stages(org_id, position);

-- 3. Leads
-- ============================================================
create table if not exists public.leads (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references public.organisations(id) on delete cascade,
  name          text        not null,
  email         text,
  phone         text,
  company_id    uuid        references public.companies(id) on delete set null,
  stage_id      uuid        references public.pipeline_stages(id) on delete set null,
  assigned_to   uuid        references auth.users(id) on delete set null,
  value         numeric(14, 2),
  source        text,
  notes         text,
  order_id      uuid        references public.orders(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists leads_org_id_idx      on public.leads(org_id);
create index if not exists leads_stage_id_idx    on public.leads(org_id, stage_id);
create index if not exists leads_company_id_idx  on public.leads(company_id);
create index if not exists leads_assigned_to_idx on public.leads(org_id, assigned_to);

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function touch_updated_at();

-- 4. Activities (polymorphic — linked to a lead or company)
-- ============================================================
do $$ begin
  create type public.activity_type as enum ('call', 'email', 'note', 'meeting');
exception when duplicate_object then null;
end $$;

create table if not exists public.activities (
  id           uuid                  primary key default gen_random_uuid(),
  org_id       uuid                  not null references public.organisations(id) on delete cascade,
  type         public.activity_type  not null,
  body         text                  not null,
  lead_id      uuid                  references public.leads(id) on delete cascade,
  company_id   uuid                  references public.companies(id) on delete cascade,
  created_by   uuid                  references auth.users(id) on delete set null,
  created_at   timestamptz           not null default now(),
  -- At least one of lead_id / company_id must be set
  constraint activities_entity_check check (lead_id is not null or company_id is not null)
);

create index if not exists activities_org_id_idx    on public.activities(org_id);
create index if not exists activities_lead_id_idx   on public.activities(lead_id);
create index if not exists activities_company_id_idx on public.activities(company_id);
create index if not exists activities_created_at_idx on public.activities(org_id, created_at desc);

-- 5. RLS
-- ============================================================
alter table public.companies       enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads           enable row level security;
alter table public.activities      enable row level security;

create policy "org_isolation_companies"
  on public.companies for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_pipeline_stages"
  on public.pipeline_stages for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_leads"
  on public.leads for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org_isolation_activities"
  on public.activities for all
  using      (org_id = (auth.jwt() ->> 'org_id')::uuid)
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);
