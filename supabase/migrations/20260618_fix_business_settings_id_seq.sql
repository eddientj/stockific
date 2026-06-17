-- Fix business_settings.id: the old table had a literal DEFAULT 1 (single-row table).
-- After dropping the CHECK(id=1) constraint, every new insert still tries id=1 and conflicts.
-- Give it a proper sequence starting after the current max id.
create sequence if not exists public.business_settings_id_seq;
select setval('public.business_settings_id_seq', (select max(id) from public.business_settings));
alter table public.business_settings alter column id set default nextval('public.business_settings_id_seq');
