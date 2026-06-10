create table if not exists business_settings (
  id           int primary key default 1 check (id = 1),
  company_name text not null default 'My Business',
  reg_number   text,
  email        text,
  phone        text,
  website      text,
  address      text,
  city         text,
  postcode     text,
  country      text not null default 'Malaysia',
  logo_url     text,
  accent_color text not null default '#008080',
  invoice_prefix       text not null default 'INV',
  default_tax_rate     numeric(5,2) not null default 6,
  default_payment_terms text not null default '30 days',
  invoice_notes        text,
  bank_name    text,
  bank_account text,
  bank_holder  text,
  duitnow_id   text,
  updated_at   timestamptz not null default now()
);

insert into business_settings (id) values (1) on conflict (id) do nothing;

create or replace function touch_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists settings_updated_at on business_settings;
create trigger settings_updated_at
  before update on business_settings
  for each row execute function touch_settings_updated_at();
