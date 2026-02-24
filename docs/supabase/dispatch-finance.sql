-- Sparkery dispatch finance migration
-- Production-safe version:
-- 1) Applies lock/statement timeout guards.
-- 2) Keeps receivable_total consistent with base_fee + manual_adjustment.
-- 3) Builds finance indexes concurrently to reduce blocking.

set lock_timeout = '5s';
set statement_timeout = '15min';

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
set receivable_total = coalesce(
  receivable_total,
  coalesce(base_fee, 0) + coalesce(manual_adjustment, 0)
);

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

alter table if exists public.dispatch_jobs
  drop constraint if exists dispatch_jobs_receivable_total_consistency_check;

alter table if exists public.dispatch_jobs
  add constraint dispatch_jobs_receivable_total_consistency_check check (
    receivable_total >= 0
    and abs(receivable_total - (base_fee + manual_adjustment)) < 0.000001
  );

create or replace function public.sync_dispatch_job_receivable_total()
returns trigger
language plpgsql
as $$
begin
  new.receivable_total := coalesce(new.base_fee, 0) + coalesce(new.manual_adjustment, 0);
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.dispatch_jobs') is not null then
    execute 'drop trigger if exists trg_dispatch_jobs_sync_receivable_total on public.dispatch_jobs';
    execute 'create trigger trg_dispatch_jobs_sync_receivable_total before insert or update of base_fee, manual_adjustment on public.dispatch_jobs for each row execute function public.sync_dispatch_job_receivable_total()';
  end if;
end;
$$;

create index concurrently if not exists idx_dispatch_jobs_finance_confirmed_at
  on public.dispatch_jobs (finance_confirmed_at desc);

create index concurrently if not exists idx_dispatch_jobs_payment_received_at
  on public.dispatch_jobs (payment_received_at desc);

create index concurrently if not exists idx_dispatch_jobs_schedule_status
  on public.dispatch_jobs (scheduled_date, status);

create index concurrently if not exists idx_dispatch_jobs_outstanding_payment
  on public.dispatch_jobs (scheduled_date desc)
  where finance_confirmed_at is not null and payment_received_at is null;

create table if not exists public.dispatch_job_finance_audit (
  id bigint generated always as identity primary key,
  job_id text not null,
  changed_at timestamptz not null default now(),
  changed_by text null,
  change_reason text null,
  old_base_fee double precision null,
  new_base_fee double precision null,
  old_manual_adjustment double precision null,
  new_manual_adjustment double precision null,
  old_receivable_total double precision null,
  new_receivable_total double precision null,
  old_payment_received_at timestamptz null,
  new_payment_received_at timestamptz null
);

create index if not exists idx_dispatch_job_finance_audit_job_id_changed_at
  on public.dispatch_job_finance_audit (job_id, changed_at desc);

create or replace function public.audit_dispatch_job_finance_changes()
returns trigger
language plpgsql
as $$
begin
  if (
    old.base_fee is distinct from new.base_fee
    or old.manual_adjustment is distinct from new.manual_adjustment
    or old.receivable_total is distinct from new.receivable_total
    or old.payment_received_at is distinct from new.payment_received_at
  ) then
    insert into public.dispatch_job_finance_audit (
      job_id,
      changed_by,
      change_reason,
      old_base_fee,
      new_base_fee,
      old_manual_adjustment,
      new_manual_adjustment,
      old_receivable_total,
      new_receivable_total,
      old_payment_received_at,
      new_payment_received_at
    ) values (
      new.id,
      coalesce(new.finance_confirmed_by, new.payment_received_by),
      coalesce(new.finance_lock_reason, 'finance_fields_updated'),
      old.base_fee,
      new.base_fee,
      old.manual_adjustment,
      new.manual_adjustment,
      old.receivable_total,
      new.receivable_total,
      old.payment_received_at,
      new.payment_received_at
    );
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.dispatch_jobs') is not null then
    execute 'drop trigger if exists trg_dispatch_jobs_finance_audit on public.dispatch_jobs';
    execute 'create trigger trg_dispatch_jobs_finance_audit after update on public.dispatch_jobs for each row execute function public.audit_dispatch_job_finance_changes()';
  end if;
end;
$$;

-- Optional RLS hardening (enable only after confirming auth/session flow):
-- alter table public.dispatch_jobs enable row level security;
-- alter table public.dispatch_customer_profiles enable row level security;
-- create policy if not exists dispatch_jobs_authenticated_read on public.dispatch_jobs
--   for select to authenticated using (true);
-- create policy if not exists dispatch_jobs_authenticated_write on public.dispatch_jobs
--   for all to authenticated using (true) with check (true);

reset lock_timeout;
reset statement_timeout;
