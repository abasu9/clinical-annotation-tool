-- Allow annotators to mark samples as outside their clinical expertise.
-- Run in Supabase SQL editor on existing projects.

alter table public.annotations
  drop constraint if exists annotations_status_check;

alter table public.annotations
  add constraint annotations_status_check
  check (status in ('draft', 'submitted', 'skipped', 'out_of_expertise'));
