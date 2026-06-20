-- ============================================================
-- Allow pipeline stages to be reordered.
-- The unique (org_id, position) index blocks reordering because
-- swapping positions transiently produces duplicate values.
-- Position only needs to define ordering, not be unique — drop the
-- unique index; the plain (org_id, position) index below still covers ordering.
-- ============================================================
drop index if exists public.pipeline_stages_org_position_idx;

-- Ensure a non-unique ordering index exists (no-op if already present).
create index if not exists pipeline_stages_org_id_idx on public.pipeline_stages(org_id, position);
