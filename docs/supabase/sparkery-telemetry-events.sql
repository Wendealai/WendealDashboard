-- Sparkery telemetry server sink
-- Run in Supabase SQL Editor.

create table if not exists public.sparkery_telemetry_events (
  id text primary key,
  name text not null,
  timestamp timestamptz not null,
  success boolean null,
  duration_ms integer null,
  user_id text null,
  actor_role text null,
  session_id text null,
  app_version text null,
  device_id text null,
  network_type text null,
  data jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now()
);

create index if not exists idx_sparkery_telemetry_events_name_timestamp
  on public.sparkery_telemetry_events (name, timestamp desc);

create index if not exists idx_sparkery_telemetry_events_user_timestamp
  on public.sparkery_telemetry_events (user_id, timestamp desc);

create index if not exists idx_sparkery_telemetry_events_trace_id
  on public.sparkery_telemetry_events ((data ->> 'traceId'));

create index if not exists idx_sparkery_telemetry_events_error_code
  on public.sparkery_telemetry_events ((data ->> 'errorCode'))
  where data ? 'errorCode';

alter table public.sparkery_telemetry_events enable row level security;

drop policy if exists sparkery_telemetry_events_insert
  on public.sparkery_telemetry_events;
drop policy if exists sparkery_telemetry_events_select
  on public.sparkery_telemetry_events;

create policy sparkery_telemetry_events_insert
on public.sparkery_telemetry_events
for insert
to anon, authenticated
with check (true);

create policy sparkery_telemetry_events_select
on public.sparkery_telemetry_events
for select
to authenticated
using (true);
