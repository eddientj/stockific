-- Fix: add security definer to custom_access_token_hook.
-- Without it, supabase_auth_admin is blocked by RLS on org_users
-- causing a 422 on every token mint.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
as $$
declare
  claims    jsonb;
  user_org  record;
begin
  claims := event -> 'claims';

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
