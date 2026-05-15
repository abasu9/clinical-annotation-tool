-- Clinical Multimodal Annotation Tool — Supabase schema
-- Run this in the Supabase SQL editor on a fresh project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "pgcrypto";

-- ─── Tables ───────────────────────────────────────────────────────────

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uploaded_filename text,
  total_samples integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references public.datasets(id) on delete cascade,
  post_id text not null,
  question text not null,
  image_urls jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid references public.samples(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  post_id text not null,
  annotator_id text not null,
  image_status text not null,
  summarization_reason text,
  objective_image_description text,
  final_multimodal_clinical_summary text,
  status text not null check (status in ('draft', 'submitted', 'skipped')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (sample_id, annotator_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────

create index if not exists idx_samples_dataset
  on public.samples(dataset_id);
create index if not exists idx_annotations_dataset
  on public.annotations(dataset_id);
create index if not exists idx_annotations_annotator
  on public.annotations(annotator_id);
create index if not exists idx_annotations_dataset_annotator
  on public.annotations(dataset_id, annotator_id);

-- ─── updated_at trigger ──────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_annotations_set_updated_at on public.annotations;
create trigger trg_annotations_set_updated_at
before update on public.annotations
for each row execute function public.set_updated_at();

-- ─── PROTOTYPE: Row Level Security ───────────────────────────────────
-- For the first prototype we DISABLE RLS so the anon key in the browser
-- can read/write directly. This is fine for non-sensitive testing.
-- DO NOT use this configuration with patient-identifiable data without
-- IRB/project approval. For production, enable RLS and add policies.

alter table public.datasets    disable row level security;
alter table public.samples     disable row level security;
alter table public.annotations disable row level security;

-- ─── Optional production starting point (commented) ──────────────────
-- alter table public.datasets    enable row level security;
-- alter table public.samples     enable row level security;
-- alter table public.annotations enable row level security;
--
-- create policy "read datasets" on public.datasets
--   for select using (auth.role() = 'authenticated');
-- create policy "read samples" on public.samples
--   for select using (auth.role() = 'authenticated');
-- create policy "annotator manages own annotations" on public.annotations
--   for all using (auth.uid()::text = annotator_id)
--   with check  (auth.uid()::text = annotator_id);
