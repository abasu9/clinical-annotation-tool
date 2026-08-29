-- Remove redundant "(login: …)" suffix from display names.
-- Safe to re-run.

update public.annotators
set display_name = 'Dr Chadda'
where login_id = 'dr aditya'
  and display_name ilike '%chadda%login%';
