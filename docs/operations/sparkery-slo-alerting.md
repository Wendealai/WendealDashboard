# Sparkery SLO And Alerting Baseline

Updated: 2026-02-24

## SLO Targets

- `dispatch.job.update` success rate (rolling 30m): `>= 99.0%`
- `dispatch.job.update` p95 duration: `<= 800ms`
- `dispatch.offline.flush.completed` failure rate (rolling 30m): `<= 2.0%`
- `quote.print` + `quote.custom_report.print` failure rate (rolling 30m): `<= 3.0%`

## Source Of Truth

- Supabase table: `public.sparkery_telemetry_events`
- Key dimensions:
  - `name`
  - `timestamp`
  - `success`
  - `data->>'errorCode'`
  - `user_id`, `actor_role`, `session_id`
  - `app_version`, `device_id`, `network_type`

## Suggested Alert Rules

- `dispatch job update error spike`
  - condition: `dispatch.job.update.failed / (dispatch.job.update.failed + dispatch.job.update.succeeded) > 0.03` for 10m
  - severity: `high`
- `offline queue network interruption`
  - condition: count of `dispatch.offline.flush.completed` with `errorCode=DISPATCH_OFFLINE_FLUSH_NETWORK_INTERRUPTED` > 20 in 15m
  - severity: `medium`
- `quote print regression`
  - condition: quote print failure rate > 5% in 15m
  - severity: `medium`
- `finance schema breakage`
  - condition: count of `DISPATCH_FINANCE_SCHEMA_MISSING` > 0 in 5m
  - severity: `critical`

## SQL Examples

```sql
-- dispatch update success rate (last 30 min)
with metrics as (
  select
    count(*) filter (where name = 'dispatch.job.update.succeeded') as ok_count,
    count(*) filter (where name = 'dispatch.job.update.failed') as fail_count
  from public.sparkery_telemetry_events
  where timestamp >= now() - interval '30 minutes'
)
select
  ok_count,
  fail_count,
  case
    when (ok_count + fail_count) = 0 then 1
    else ok_count::numeric / (ok_count + fail_count)
  end as success_rate
from metrics;
```

```sql
-- dispatch update p95 duration (last 30 min)
select
  percentile_cont(0.95) within group (order by duration_ms) as p95_duration_ms
from public.sparkery_telemetry_events
where name = 'dispatch.job.update.succeeded'
  and duration_ms is not null
  and timestamp >= now() - interval '30 minutes';
```
