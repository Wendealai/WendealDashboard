# Sparkery Agent Context (Project Overview)

Last updated: 2026-02-23

This file gives AI agents the minimum project context required before using the Sparkery API docs.

## 1. What Sparkery Does in This Project

Sparkery is the operations module for:

- dispatching cleaning/service jobs
- assigning employees
- generating daily/weekly execution links
- creating inspection links and reports tied to property templates
- importing recurring jobs into real weekly tasks

In short: Sparkery turns scheduling + assignment input into executable field-work records.

## 2. Core Data Model (Mental Map)

Main entities:

- `dispatch_employees`: employee roster used for assignment matching
- `dispatch_jobs`: scheduled jobs with date/time/address/assignees
- `cleaning_inspection_properties`: property templates (sections/checklists/reference images)
- `cleaning_inspections`: per-task inspection record generated from template + date + assignees

High-level flow:

1. Employee(s) are resolved.
2. A dispatch job is created/updated.
3. An inspection link can be generated from job data (or direct template input).
4. Staff submit inspection results, persisted in `cleaning_inspections`.

## 3. Matching Rules You Must Respect

Employee matching priority:

1. employee ID exact match (case-insensitive)
2. given name match (`name` / `name_cn`)

If more than one candidate matches given name, API returns `409` ambiguous.

Template matching priority (inspection link):

1. `propertyTemplateId` / `templateId`
2. address core match: `Number + Street Name` (case-insensitive normalized)
3. normalized property name exact match

If no match: `404`; if multiple matches: `409`.

## 4. Runtime and Environment Boundaries

Deployment boundary:

- Sparkery API runs as Supabase Edge Function: `sparkery-api`

Secrets required (names only, never expose values in docs/prompts):

- `SPARKERY_API_TOKEN`
- `SPARKERY_APP_ORIGIN`

Function runtime dependencies:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (preferred) or `SUPABASE_ANON_KEY`

Project context currently used in this repo workflow:

- Supabase project ref: `mujqgnghptslyiowexgl`

## 5. API Usage Policy for Agents

Always follow this order for assignment workflows:

1. call `POST /sparkery/v1/employees/resolve`
2. verify `canAutoAssign=true` or handle ambiguous/unmatched safely
3. send create request (`dispatch/jobs` or `inspection-links`)

Reliability rules:

- attach `Idempotency-Key` on all mutation requests
- log/store `x-request-id` from every response
- on retries, keep same payload + same idempotency key

Preferred API source docs:

1. `docs/supabase/sparkery-api.openapi.yaml` (machine-readable contract)
2. `docs/supabase/sparkery-api-agent-manual.md` (behavioral rules/workflows)

## 6. Guardrails (What Agents Must NOT Do)

Without explicit user authorization, do NOT:

- bypass API and write directly to production tables
- rotate/change production secrets
- change matching rules silently
- delete jobs/inspections in bulk as a fallback strategy
- treat ambiguous employee/template results as auto-success

If blocked, the agent should return a precise error and next safe action.

## 7. Recommended Reading Order for New Agents

1. `docs/supabase/sparkery-agent-context.md` (this file)
2. `docs/supabase/sparkery-api-agent-manual.md`
3. `docs/supabase/sparkery-api.openapi.yaml`
4. `supabase/functions/sparkery-api/index.ts` (implementation source of truth)

## 8. Bootstrap Prompt Template (Copy for New AI Agents)

Use this as the first instruction when handing over to another AI agent:

```text
You are integrating with Sparkery API in this repository.
Read these files in order before taking action:
1) docs/supabase/sparkery-agent-context.md
2) docs/supabase/sparkery-api-agent-manual.md
3) docs/supabase/sparkery-api.openapi.yaml

Constraints:
- Use API-first approach (do not write DB directly unless explicitly instructed).
- For assignments, always resolve employees first via /sparkery/v1/employees/resolve.
- For mutations, always send Idempotency-Key and record x-request-id.
- Treat 409 ambiguous as a blocking state requiring disambiguation.
```
