-- Categories name was globally unique. With multi-tenancy it should be unique per org.
alter table public.categories drop constraint if exists categories_name_key;
alter table public.categories add constraint categories_name_org_id_key unique (name, org_id);
