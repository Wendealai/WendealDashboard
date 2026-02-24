-- Sparkery dispatch query performance indexes
-- Run in Supabase SQL Editor.

create index if not exists idx_dispatch_jobs_date_status
  on public.dispatch_jobs (scheduled_date, status);

create index if not exists idx_dispatch_jobs_date_priority
  on public.dispatch_jobs (scheduled_date, priority);

create index if not exists idx_dispatch_jobs_assignee_gin
  on public.dispatch_jobs
  using gin (assigned_employee_ids);

create index if not exists idx_dispatch_jobs_customer_profile_date
  on public.dispatch_jobs (customer_profile_id, scheduled_date desc)
  where customer_profile_id is not null;

analyze public.dispatch_jobs;
