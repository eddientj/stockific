alter table organisations
  add column if not exists tier text not null default 'trial',
  add column if not exists trial_expires_at timestamptz;
