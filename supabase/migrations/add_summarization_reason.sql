-- Run once in Supabase SQL Editor if your project was created before this column existed.
alter table public.annotations
  add column if not exists summarization_reason text;
