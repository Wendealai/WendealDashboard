-- Sparkery dispatch: employee real-time location table
-- Run in Supabase SQL Editor (after dispatch-core.sql)

create table if not exists public.dispatch_employee_locations (
  employee_id text primary key
    references public.dispatch_employees(id)
    on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision null,
  source text not null default 'mobile' check (
    source in ('gps', 'manual', 'mobile')
  ),
  label text null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_dispatch_employee_locations_updated_at
  on public.dispatch_employee_locations (updated_at desc);

alter table public.dispatch_employee_locations enable row level security;

drop policy if exists dispatch_employee_locations_select
  on public.dispatch_employee_locations;
drop policy if exists dispatch_employee_locations_insert
  on public.dispatch_employee_locations;
drop policy if exists dispatch_employee_locations_update
  on public.dispatch_employee_locations;
drop policy if exists dispatch_employee_locations_delete
  on public.dispatch_employee_locations;

create policy dispatch_employee_locations_select
on public.dispatch_employee_locations
for select
to anon, authenticated
using (true);

create policy dispatch_employee_locations_insert
on public.dispatch_employee_locations
for insert
to anon, authenticated
with check (true);

create policy dispatch_employee_locations_update
on public.dispatch_employee_locations
for update
to anon, authenticated
using (true)
with check (true);

create policy dispatch_employee_locations_delete
on public.dispatch_employee_locations
for delete
to anon, authenticated
using (true);
