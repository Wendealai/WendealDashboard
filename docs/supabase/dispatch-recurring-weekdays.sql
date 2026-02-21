-- Sparkery dispatch recurring weekdays migration
-- Run in Supabase SQL Editor if dispatch_customer_profiles already exists.

alter table if exists public.dispatch_customer_profiles
  add column if not exists recurring_weekdays smallint[] null;

update public.dispatch_customer_profiles
set recurring_weekdays = array[recurring_weekday]
where recurring_weekday is not null
  and (
    recurring_weekdays is null
    or cardinality(recurring_weekdays) = 0
  );
