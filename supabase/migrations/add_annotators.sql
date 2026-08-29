-- Annotator accounts: login ID, display name, PIN (admin-managed).
-- Run in Supabase SQL editor on existing projects.

create table if not exists public.annotators (
  id uuid primary key default gen_random_uuid(),
  login_id text not null,
  display_name text not null,
  pin text not null,
  login_aliases jsonb not null default '[]'::jsonb,
  name_includes jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  unique (login_id)
);

create index if not exists idx_annotators_login_id
  on public.annotators(login_id);

alter table public.annotators disable row level security;

-- Seed pilot annotators (PINs match docs/annotator-login-pins.md).
insert into public.annotators (login_id, display_name, pin, login_aliases, name_includes)
values
  ('dr naafila', 'Dr Naafila', '194827', '[]'::jsonb, '["naafila"]'::jsonb),
  ('dr aditya', 'Dr Chadda', '385601', '["dr chadda", "chadda"]'::jsonb, '["chadda"]'::jsonb),
  ('Dr Sanchez', 'Dr Sanchez', '572913', '["dr sanchez", "sanchez"]'::jsonb, '["sanchez"]'::jsonb),
  ('Dr Saja', 'Dr Saja', '640158', '["dr saja", "saja"]'::jsonb, '["saja"]'::jsonb),
  ('Dr Wesley', 'Dr Wesley', '819374', '["dr wesley", "wesley"]'::jsonb, '["wesley"]'::jsonb),
  ('dr mondal', 'Dr Mondal', '506281', '["mondal"]'::jsonb, '["mondal"]'::jsonb)
on conflict (login_id) do nothing;
