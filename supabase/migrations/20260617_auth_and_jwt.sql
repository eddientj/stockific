-- ============================================================
-- Auth: org_users membership table + JWT custom claims hook
-- Run after 20260617_multi_tenancy.sql
-- ============================================================

-- 1. Org membership table
-- Links Supabase auth.users to organisations with a role.
-- One user can belong to multiple orgs (future), but for now
-- we enforce one org per user at the application layer.
-- ============================================================
create table if not exists public.org_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  org_id     uuid not null references public.organisations(id) on delete cascade,
  role       text not null default 'owner'
               check (role in ('owner', 'manager', 'sales', 'viewer')),
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

create index if not exists org_users_user_id_idx on public.org_users(user_id);
create index if not exists org_users_org_id_idx  on public.org_users(org_id);

alter table public.org_users enable row level security;

-- Users can only see their own membership rows
create policy "org_users_self"
  on public.org_users for select
  using (user_id = auth.uid());

-- Owners can see all members of their org
create policy "org_users_owner_read"
  on public.org_users for select
  using (
    org_id in (
      select org_id from public.org_users
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- 2. JWT custom claims hook
-- Supabase calls this function on every token mint/refresh.
-- It reads the user's org and role, then injects them as
-- custom claims so RLS policies can use auth.jwt() ->> 'org_id'.
-- ============================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb;
  user_org  record;
begin
  claims := event -> 'claims';

  -- Look up the user's primary org and role
  select org_id, role
    into user_org
    from public.org_users
   where user_id = (event ->> 'user_id')::uuid
   limit 1;

  if found then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org.org_id::text));
    claims := jsonb_set(claims, '{org_role}', to_jsonb(user_org.role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant Supabase auth schema permission to call this function
grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

-- Allow the hook to read org_users (bypasses RLS for the hook)
grant select on public.org_users to supabase_auth_admin;

-- 3. Helper function: create org + owner in one call
-- Used by the onboarding API route after signup.
-- ============================================================
create or replace function public.create_organisation(
  p_user_id  uuid,
  p_name     text,
  p_slug     text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_org_id  uuid;
  v_slug    text;
begin
  -- Auto-generate slug from name if not provided
  v_slug := coalesce(
    p_slug,
    lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'))
  );

  -- Create org
  insert into public.organisations (name, slug)
  values (p_name, v_slug)
  returning id into v_org_id;

  -- Create owner membership
  insert into public.org_users (user_id, org_id, role)
  values (p_user_id, v_org_id, 'owner');

  -- Seed empty business settings for this org
  insert into public.business_settings (org_id)
  values (v_org_id)
  on conflict (org_id) do nothing;

  return v_org_id;
end;
$$;

-- Only authenticated users can call this (via server route)
grant execute on function public.create_organisation to authenticated;
