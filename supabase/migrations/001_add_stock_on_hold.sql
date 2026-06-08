-- Run this in Supabase SQL Editor.
-- Adds stock_on_hold to variants.
-- Live available stock = stock_quantity - stock_on_hold

alter table public.variants
  add column if not exists stock_on_hold integer not null default 0
  check (stock_on_hold >= 0);
