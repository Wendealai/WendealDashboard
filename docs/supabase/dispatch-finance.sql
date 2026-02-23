-- Sparkery dispatch finance migration
-- Run in Supabase SQL Editor if dispatch tables already exist.

alter table if exists public.dispatch_customer_profiles
  add column if not exists recurring_fee double precision null default 0;

alter table if exists public.dispatch_customer_profiles
  drop constraint if exists dispatch_customer_profiles_recurring_fee_check;

alter table if exists public.dispatch_customer_profiles
  add constraint dispatch_customer_profiles_recurring_fee_check check (
    recurring_fee is null or recurring_fee >= 0
  );

alter table if exists public.dispatch_jobs
  add column if not exists pricing_mode text null;

alter table if exists public.dispatch_jobs
  add column if not exists fee_currency text null;

alter table if exists public.dispatch_jobs
  add column if not exists base_fee double precision null;

alter table if exists public.dispatch_jobs
  add column if not exists manual_adjustment double precision null;

alter table if exists public.dispatch_jobs
  add column if not exists receivable_total double precision null;

alter table if exists public.dispatch_jobs
  add column if not exists finance_confirmed_at timestamptz null;

alter table if exists public.dispatch_jobs
  add column if not exists finance_confirmed_by text null;

alter table if exists public.dispatch_jobs
  add column if not exists finance_locked_at timestamptz null;

alter table if exists public.dispatch_jobs
  add column if not exists finance_lock_reason text null;

alter table if exists public.dispatch_jobs
  add column if not exists payment_received_at timestamptz null;

alter table if exists public.dispatch_jobs
  add column if not exists payment_received_by text null;

update public.dispatch_jobs
set pricing_mode = coalesce(pricing_mode, 'one_time_manual');

update public.dispatch_jobs
set fee_currency = coalesce(fee_currency, 'AUD');

update public.dispatch_jobs
set base_fee = coalesce(base_fee, 0);

update public.dispatch_jobs
set manual_adjustment = coalesce(manual_adjustment, 0);

update public.dispatch_jobs
set receivable_total = coalesce(receivable_total, coalesce(base_fee, 0) + coalesce(manual_adjustment, 0));

alter table if exists public.dispatch_jobs
  alter column pricing_mode set default 'one_time_manual';

alter table if exists public.dispatch_jobs
  alter column pricing_mode set not null;

alter table if exists public.dispatch_jobs
  alter column fee_currency set default 'AUD';

alter table if exists public.dispatch_jobs
  alter column fee_currency set not null;

alter table if exists public.dispatch_jobs
  alter column base_fee set default 0;

alter table if exists public.dispatch_jobs
  alter column base_fee set not null;

alter table if exists public.dispatch_jobs
  alter column manual_adjustment set default 0;

alter table if exists public.dispatch_jobs
  alter column manual_adjustment set not null;

alter table if exists public.dispatch_jobs
  alter column receivable_total set default 0;

alter table if exists public.dispatch_jobs
  alter column receivable_total set not null;

alter table if exists public.dispatch_jobs
  drop constraint if exists dispatch_jobs_pricing_mode_check;

alter table if exists public.dispatch_jobs
  add constraint dispatch_jobs_pricing_mode_check check (
    pricing_mode in ('recurring_fixed', 'one_time_manual')
  );

alter table if exists public.dispatch_jobs
  drop constraint if exists dispatch_jobs_fee_currency_check;

alter table if exists public.dispatch_jobs
  add constraint dispatch_jobs_fee_currency_check check (
    fee_currency in ('AUD')
  );

alter table if exists public.dispatch_jobs
  drop constraint if exists dispatch_jobs_base_fee_check;

alter table if exists public.dispatch_jobs
  add constraint dispatch_jobs_base_fee_check check (
    base_fee >= 0
  );

create index if not exists idx_dispatch_jobs_finance_confirmed_at
  on public.dispatch_jobs (finance_confirmed_at desc);

create index if not exists idx_dispatch_jobs_payment_received_at
  on public.dispatch_jobs (payment_received_at desc);
