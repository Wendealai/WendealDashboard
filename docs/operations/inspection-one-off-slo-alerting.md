# Inspection One-off SLO & Alerting

Updated: 2026-02-26

## Scope

This document defines SLO/alerting for one-off inspection generation in `Cleaning Inspection Admin`.

Critical user journey:

1. Open one-off modal.
2. Generate/edit template.
3. Create inspection link.
4. Open link successfully.

## Telemetry Events

Required frontend events:

- `inspection.one_off.modal.opened`
- `inspection.one_off.recommendation.loaded`
- `inspection.one_off.template.regenerated`
- `inspection.one_off.preview.rendered`
- `inspection.one_off.draft.restored`
- `inspection.one_off.create.started`
- `inspection.one_off.create.succeeded`
- `inspection.one_off.create.failed`
- `inspection.one_off.link.open.failed`

Mandatory dimensions:

- `scenarioKey`
- `actorRole`
- `sessionId`
- `userId` (auto-enriched by telemetry runtime when available)

## SLO Targets

- One-off create success rate: `>= 99.5%` (rolling 7 days)
- One-off create p95 latency: `<= 4s` (from create click to local/cloud persistence completed)
- Link-open failure rate: `<= 0.2%` (popup blocked or browser open failure)

## Suggested Alert Rules

- `P1`: create success rate `< 98.5%` for 10 minutes
- `P2`: create success rate `< 99.5%` for 60 minutes
- `P1`: link-open failure rate `> 2%` for 10 minutes
- `P2`: recommendation endpoint cloud fallback ratio `> 50%` for 2 hours

## Triage Checklist

1. Filter failed events by `scenarioKey`, `actorRole`, `sessionId`.
2. Split by `syncSource` (`supabase` vs `local`) to identify cloud-specific failures.
3. Check governance/quality rejection reasons from UI telemetry context.
4. Validate popup policy changes in browser if `link.open.failed` spikes.
5. If recommendation source degrades to local fallback, check Supabase function logs for `/sparkery/v1/inspection/one-off-recommendations`.
