-- Sparkery bond quote forms: submissions + one-time share links
-- Run in Supabase SQL Editor

create table if not exists public.bond_clean_quote_submissions (
  id text primary key,
  submitted_at timestamptz not null,
  status text not null default 'new' check (
    status in ('new', 'contacted', 'quoted', 'confirmed', 'completed', 'cancelled')
  ),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bond_quote_submissions_submitted_at
  on public.bond_clean_quote_submissions (submitted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bond_quote_submissions_updated_at on public.bond_clean_quote_submissions;
create trigger trg_bond_quote_submissions_updated_at
before update on public.bond_clean_quote_submissions
for each row
execute function public.set_updated_at();

create table if not exists public.bond_clean_quote_form_links (
  id text primary key,
  form_type text not null check (
    form_type in ('bond_clean_quote_request', 'bond_clean_quote_request_cn')
  ),
  token text not null unique,
  status text not null default 'active' check (
    status in ('active', 'used', 'disabled')
  ),
  created_at timestamptz not null default now(),
  used_at timestamptz null,
  used_submission_id text null references public.bond_clean_quote_submissions(id) on delete set null,
  payload jsonb null
);

create index if not exists idx_bond_quote_form_links_form_status
  on public.bond_clean_quote_form_links (form_type, status, created_at desc);

alter table public.bond_clean_quote_submissions enable row level security;
alter table public.bond_clean_quote_form_links enable row level security;

drop policy if exists bond_quote_submissions_select on public.bond_clean_quote_submissions;
drop policy if exists bond_quote_submissions_insert on public.bond_clean_quote_submissions;
drop policy if exists bond_quote_submissions_update on public.bond_clean_quote_submissions;
drop policy if exists bond_quote_submissions_delete on public.bond_clean_quote_submissions;

create policy bond_quote_submissions_select
on public.bond_clean_quote_submissions
for select
to anon, authenticated
using (true);

create policy bond_quote_submissions_insert
on public.bond_clean_quote_submissions
for insert
to anon, authenticated
with check (true);

create policy bond_quote_submissions_update
on public.bond_clean_quote_submissions
for update
to anon, authenticated
using (true)
with check (true);

create policy bond_quote_submissions_delete
on public.bond_clean_quote_submissions
for delete
to anon, authenticated
using (true);

drop policy if exists bond_quote_links_select on public.bond_clean_quote_form_links;
drop policy if exists bond_quote_links_insert on public.bond_clean_quote_form_links;
drop policy if exists bond_quote_links_update on public.bond_clean_quote_form_links;
drop policy if exists bond_quote_links_delete on public.bond_clean_quote_form_links;

create policy bond_quote_links_select
on public.bond_clean_quote_form_links
for select
to anon, authenticated
using (true);

create policy bond_quote_links_insert
on public.bond_clean_quote_form_links
for insert
to anon, authenticated
with check (true);

create policy bond_quote_links_update
on public.bond_clean_quote_form_links
for update
to anon, authenticated
using (true)
with check (true);

create policy bond_quote_links_delete
on public.bond_clean_quote_form_links
for delete
to anon, authenticated
using (true);
