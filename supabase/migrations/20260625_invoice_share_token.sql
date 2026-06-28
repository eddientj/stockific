-- Add share_token to invoices for public token-based invoice viewing.
-- gen_random_uuid() backfills existing rows automatically.
alter table invoices
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists invoices_share_token_idx on invoices (share_token);
