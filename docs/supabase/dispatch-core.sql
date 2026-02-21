-- Sparkery dispatch core tables: employees + customers + jobs
-- Run in Supabase SQL Editor before dispatch-employee-locations.sql

create table if not exists public.dispatch_employees (
  id text primary key,
  name text not null,
  name_cn text null,
  phone text null,
  skills text[] not null default '{}'::text[],
  status text not null default 'available' check (
    status in ('available', 'off')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    skills <@ ARRAY['bond', 'airbnb', 'regular', 'commercial']::text[]
  )
);

create table if not exists public.dispatch_customer_profiles (
  id text primary key,
  name text not null,
  address text null,
  phone text null,
  default_job_title text null,
  default_description text null,
  default_notes text null,
  recurring_enabled boolean null default false,
  recurring_weekday smallint null check (
    recurring_weekday between 1 and 7
  ),
  recurring_weekdays smallint[] null,
  recurring_start_time text null,
  recurring_end_time text null,
  recurring_service_type text null check (
    recurring_service_type in ('bond', 'airbnb', 'regular', 'commercial')
  ),
  recurring_priority smallint null check (
    recurring_priority between 1 and 5
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispatch_jobs (
  id text primary key,
  title text not null,
  description text null,
  notes text null,
  image_urls text[] null,
  customer_profile_id text null
    references public.dispatch_customer_profiles(id)
    on delete set null,
  customer_name text null,
  customer_address text null,
  customer_phone text null,
  service_type text not null check (
    service_type in ('bond', 'airbnb', 'regular', 'commercial')
  ),
  property_type text null check (
    property_type in ('apartment', 'townhouse', 'house')
  ),
  estimated_duration_hours double precision null,
  status text not null default 'pending' check (
    status in ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')
  ),
  priority smallint not null default 3 check (
    priority between 1 and 5
  ),
  scheduled_date date not null,
  scheduled_start_time text not null,
  scheduled_end_time text not null,
  assigned_employee_ids text[] null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dispatch_jobs_date_time
  on public.dispatch_jobs (scheduled_date, scheduled_start_time);

create index if not exists idx_dispatch_jobs_status
  on public.dispatch_jobs (status);

create index if not exists idx_dispatch_jobs_service_type
  on public.dispatch_jobs (service_type);

create index if not exists idx_dispatch_customer_profiles_updated_at
  on public.dispatch_customer_profiles (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dispatch_employees_updated_at on public.dispatch_employees;
create trigger trg_dispatch_employees_updated_at
before update on public.dispatch_employees
for each row
execute function public.set_updated_at();

drop trigger if exists trg_dispatch_customer_profiles_updated_at on public.dispatch_customer_profiles;
create trigger trg_dispatch_customer_profiles_updated_at
before update on public.dispatch_customer_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_dispatch_jobs_updated_at on public.dispatch_jobs;
create trigger trg_dispatch_jobs_updated_at
before update on public.dispatch_jobs
for each row
execute function public.set_updated_at();

alter table public.dispatch_employees enable row level security;
alter table public.dispatch_customer_profiles enable row level security;
alter table public.dispatch_jobs enable row level security;

drop policy if exists dispatch_employees_select on public.dispatch_employees;
drop policy if exists dispatch_employees_insert on public.dispatch_employees;
drop policy if exists dispatch_employees_update on public.dispatch_employees;
drop policy if exists dispatch_employees_delete on public.dispatch_employees;

create policy dispatch_employees_select
on public.dispatch_employees
for select
to anon, authenticated
using (true);

create policy dispatch_employees_insert
on public.dispatch_employees
for insert
to anon, authenticated
with check (true);

create policy dispatch_employees_update
on public.dispatch_employees
for update
to anon, authenticated
using (true)
with check (true);

create policy dispatch_employees_delete
on public.dispatch_employees
for delete
to anon, authenticated
using (true);

drop policy if exists dispatch_customer_profiles_select on public.dispatch_customer_profiles;
drop policy if exists dispatch_customer_profiles_insert on public.dispatch_customer_profiles;
drop policy if exists dispatch_customer_profiles_update on public.dispatch_customer_profiles;
drop policy if exists dispatch_customer_profiles_delete on public.dispatch_customer_profiles;

create policy dispatch_customer_profiles_select
on public.dispatch_customer_profiles
for select
to anon, authenticated
using (true);

create policy dispatch_customer_profiles_insert
on public.dispatch_customer_profiles
for insert
to anon, authenticated
with check (true);

create policy dispatch_customer_profiles_update
on public.dispatch_customer_profiles
for update
to anon, authenticated
using (true)
with check (true);

create policy dispatch_customer_profiles_delete
on public.dispatch_customer_profiles
for delete
to anon, authenticated
using (true);

drop policy if exists dispatch_jobs_select on public.dispatch_jobs;
drop policy if exists dispatch_jobs_insert on public.dispatch_jobs;
drop policy if exists dispatch_jobs_update on public.dispatch_jobs;
drop policy if exists dispatch_jobs_delete on public.dispatch_jobs;

create policy dispatch_jobs_select
on public.dispatch_jobs
for select
to anon, authenticated
using (true);

create policy dispatch_jobs_insert
on public.dispatch_jobs
for insert
to anon, authenticated
with check (true);

create policy dispatch_jobs_update
on public.dispatch_jobs
for update
to anon, authenticated
using (true)
with check (true);

create policy dispatch_jobs_delete
on public.dispatch_jobs
for delete
to anon, authenticated
using (true);
