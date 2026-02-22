-- Sparkery cleaning inspection core tables
-- Run in Supabase SQL Editor

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.cleaning_inspections (
  id text primary key,
  property_id text not null,
  status text not null default 'pending' check (
    status in ('pending', 'in_progress', 'submitted')
  ),
  check_out_date date not null,
  submitted_at timestamptz null,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_cleaning_inspections_updated_at
  on public.cleaning_inspections (updated_at desc);

create index if not exists idx_cleaning_inspections_status_updated_at
  on public.cleaning_inspections (status, updated_at desc);

drop trigger if exists trg_cleaning_inspections_updated_at on public.cleaning_inspections;
create trigger trg_cleaning_inspections_updated_at
before update on public.cleaning_inspections
for each row
execute function public.set_updated_at();

create table if not exists public.cleaning_inspection_properties (
  id text primary key,
  name text not null,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_cleaning_inspection_properties_updated_at
  on public.cleaning_inspection_properties (updated_at desc);

drop trigger if exists trg_cleaning_inspection_properties_updated_at on public.cleaning_inspection_properties;
create trigger trg_cleaning_inspection_properties_updated_at
before update on public.cleaning_inspection_properties
for each row
execute function public.set_updated_at();

create table if not exists public.cleaning_inspection_employees (
  id text primary key,
  name text not null,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_cleaning_inspection_employees_updated_at
  on public.cleaning_inspection_employees (updated_at desc);

drop trigger if exists trg_cleaning_inspection_employees_updated_at on public.cleaning_inspection_employees;
create trigger trg_cleaning_inspection_employees_updated_at
before update on public.cleaning_inspection_employees
for each row
execute function public.set_updated_at();

alter table public.cleaning_inspections enable row level security;
alter table public.cleaning_inspection_properties enable row level security;
alter table public.cleaning_inspection_employees enable row level security;

drop policy if exists cleaning_inspections_select on public.cleaning_inspections;
drop policy if exists cleaning_inspections_insert on public.cleaning_inspections;
drop policy if exists cleaning_inspections_update on public.cleaning_inspections;
drop policy if exists cleaning_inspections_delete on public.cleaning_inspections;

create policy cleaning_inspections_select
on public.cleaning_inspections
for select
to anon, authenticated
using (true);

create policy cleaning_inspections_insert
on public.cleaning_inspections
for insert
to anon, authenticated
with check (true);

create policy cleaning_inspections_update
on public.cleaning_inspections
for update
to anon, authenticated
using (true)
with check (true);

create policy cleaning_inspections_delete
on public.cleaning_inspections
for delete
to anon, authenticated
using (true);

drop policy if exists cleaning_inspection_properties_select on public.cleaning_inspection_properties;
drop policy if exists cleaning_inspection_properties_insert on public.cleaning_inspection_properties;
drop policy if exists cleaning_inspection_properties_update on public.cleaning_inspection_properties;
drop policy if exists cleaning_inspection_properties_delete on public.cleaning_inspection_properties;

create policy cleaning_inspection_properties_select
on public.cleaning_inspection_properties
for select
to anon, authenticated
using (true);

create policy cleaning_inspection_properties_insert
on public.cleaning_inspection_properties
for insert
to anon, authenticated
with check (true);

create policy cleaning_inspection_properties_update
on public.cleaning_inspection_properties
for update
to anon, authenticated
using (true)
with check (true);

create policy cleaning_inspection_properties_delete
on public.cleaning_inspection_properties
for delete
to anon, authenticated
using (true);

drop policy if exists cleaning_inspection_employees_select on public.cleaning_inspection_employees;
drop policy if exists cleaning_inspection_employees_insert on public.cleaning_inspection_employees;
drop policy if exists cleaning_inspection_employees_update on public.cleaning_inspection_employees;
drop policy if exists cleaning_inspection_employees_delete on public.cleaning_inspection_employees;

create policy cleaning_inspection_employees_select
on public.cleaning_inspection_employees
for select
to anon, authenticated
using (true);

create policy cleaning_inspection_employees_insert
on public.cleaning_inspection_employees
for insert
to anon, authenticated
with check (true);

create policy cleaning_inspection_employees_update
on public.cleaning_inspection_employees
for update
to anon, authenticated
using (true)
with check (true);

create policy cleaning_inspection_employees_delete
on public.cleaning_inspection_employees
for delete
to anon, authenticated
using (true);

