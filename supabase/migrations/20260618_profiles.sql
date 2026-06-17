-- User profiles: username, display name, avatar
-- Separate from auth.users so we own the schema.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  first_name  text not null,
  last_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_read"   on public.profiles for select using (id = auth.uid());
create policy "profiles_self_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid());

-- Used by login: resolves a username → email so signInWithPassword can be called.
-- Security definer so it can read auth.users without exposing the table.
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.get_email_by_username to anon, authenticated;
