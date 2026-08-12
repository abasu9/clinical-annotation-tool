-- Ratings: evaluators score submitted annotator outputs (Likert 1–5).
-- Run in the Supabase SQL editor if your project already has the base schema.

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid references public.samples(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  post_id text not null,
  evaluator_id text not null,
  rated_annotator_id text not null,
  desc_completeness integer check (desc_completeness is null or desc_completeness between 1 and 5),
  desc_independence integer check (desc_independence is null or desc_independence between 1 and 5),
  sum_informativeness integer check (sum_informativeness is null or sum_informativeness between 1 and 5),
  sum_completeness integer check (sum_completeness is null or sum_completeness between 1 and 5),
  sum_combination integer check (sum_combination is null or sum_combination between 1 and 5),
  sum_fluency integer check (sum_fluency is null or sum_fluency between 1 and 5),
  status text not null check (status in ('draft', 'submitted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (sample_id, evaluator_id, rated_annotator_id)
);

create index if not exists idx_ratings_dataset
  on public.ratings(dataset_id);
create index if not exists idx_ratings_evaluator
  on public.ratings(evaluator_id);
create index if not exists idx_ratings_dataset_evaluator
  on public.ratings(dataset_id, evaluator_id);
create index if not exists idx_ratings_sample
  on public.ratings(sample_id);

drop trigger if exists trg_ratings_set_updated_at on public.ratings;
create trigger trg_ratings_set_updated_at
before update on public.ratings
for each row execute function public.set_updated_at();

alter table public.ratings disable row level security;
