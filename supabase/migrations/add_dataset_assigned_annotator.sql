-- Assign datasets to annotators from the admin import form.
-- Run in Supabase SQL editor on existing projects.

alter table public.datasets
  add column if not exists assigned_annotator_id text;

create index if not exists idx_datasets_assigned_annotator
  on public.datasets(assigned_annotator_id);
