# Sparkery API Agent Manual

Last updated: 2026-02-23

This document is the full integration guide for AI agents that need to call Sparkery backend actions through Supabase Edge Function `sparkery-api`.

## 1. Base Info

- Function name: `sparkery-api`
- Base URL:
  - `https://<project-ref>.supabase.co/functions/v1/sparkery-api`
- Health:
  - `GET /health`
  - `GET /sparkery/v1/health`

Current production project ref in this repo workflow:

- `mujqgnghptslyiowexgl`

## 2. Authentication

Use one of:

- `Authorization: Bearer <SPARKERY_API_TOKEN>`
- `x-api-key: <SPARKERY_API_TOKEN>`

If auth fails:

- HTTP `401`
- Body: `{"error":"Unauthorized. Use Authorization: Bearer <SPARKERY_API_TOKEN>."}`

## 3. Required Runtime Secrets

Set in Supabase function secrets:

- `SPARKERY_API_TOKEN`: single shared token
- `SPARKERY_APP_ORIGIN`: app origin used for generated share URLs

Runtime also requires Supabase DB credentials from function environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (preferred) or `SUPABASE_ANON_KEY`

## 4. Optional Support Tables (Recommended)

Run these SQL scripts in Supabase SQL Editor:

- `docs/supabase/sparkery-api-audit-idempotency.sql`

This enables:

- idempotency replay store: `public.sparkery_api_idempotency`
- request audit logs: `public.sparkery_api_audit_logs`

If these tables are missing, core APIs still work, but replay/audit persistence is skipped.

## 5. Common Headers

For JSON mutation requests:

- `Content-Type: application/json`

Optional:

- `Idempotency-Key: <unique-key-per-logical-write>`

Response headers:

- `x-request-id`: present on all responses
- `x-idempotency-key`: echoed when idempotency is used
- `x-idempotency-hit: true`: replayed result from idempotency store

## 6. Idempotency Semantics

Applies to POST mutation endpoints.

- Key sources:
  - request header `Idempotency-Key`
  - or body field `idempotencyKey`
- Request hash is computed over:
  - endpoint path
  - request JSON body (sorted keys), excluding `idempotencyKey`
- Same key + same payload:
  - replay stored status/body
- Same key + different payload:
  - HTTP `409` (`Idempotency-Key conflict: request payload mismatch`)
- HTTP `5xx` responses are not stored in idempotency table.

## 7. Employee Resolution Model

Use this when assigning jobs or inspection links.

Priority:

1. exact employee ID (case-insensitive)
2. given-name match against `dispatch_employees.name` / `name_cn`

Ambiguous given names return `409`.

### 7.1 Recommended Pre-step

Call `POST /sparkery/v1/employees/resolve` first, then pass resolver output into create endpoints.

`dispatch/jobs` and `inspection-links` accept all of the following assignment inputs:

- `employeeIds` / `assignedEmployeeIds`: `string[]`
- `assignees` / `employeeGivenNames` / `assignedEmployeeGivenNames`: `string[]`
- arrays of employee objects:
  - `uniqueResolvedEmployees`
  - `resolvedAssignees`
  - `resolvedEmployees`
  - `assignedEmployees`
  - `resolved`
- resolver result objects:
  - `employeeResolution`
  - `resolveResult`
  - `assigneeResolution`

Employee object shape can be either:

- `{ "id": "emp-..." }`
- `{ "employee": { "id": "emp-..." } }`

## 8. Template Matching Model (Inspection Link)

When `propertyTemplateId` is not provided, matching order is:

1. `templateId` exact match (if provided)
2. `address_core` match (Number + Street Name, case-insensitive normalization)
3. normalized property name exact match

Possible outcomes:

- matched: returns `template` and `matchStrategy`
- ambiguous: HTTP `409` with candidate list
- unmatched: HTTP `404`

## 9. Endpoint Catalog

1. `GET /sparkery/v1/employees`
2. `POST /sparkery/v1/employees/resolve`
3. `POST /sparkery/v1/dispatch/jobs`
4. `POST /sparkery/v1/dispatch/jobs/batch`
5. `POST /sparkery/v1/dispatch/jobs/delete`
6. `POST /sparkery/v1/inspection-links`
7. `POST /sparkery/v1/dispatch/weekly-plan-links`
8. `POST /sparkery/v1/dispatch/recurring/import`

## 10. Endpoint Details

### 10.1 GET `/sparkery/v1/employees`

Query params:

- `q` (optional): fuzzy filter by id/full name/chinese name/given-name token

Success `200`:

```json
{
  "ok": true,
  "endpoint": "/sparkery/v1/employees",
  "total": 1,
  "employees": [
    {
      "id": "emp-20260221-pio79mvqs",
      "name": "Emma Liu",
      "nameCn": null,
      "phone": "0434091323",
      "givenName": "emma",
      "givenNameCn": ""
    }
  ]
}
```

### 10.2 POST `/sparkery/v1/employees/resolve`

Request body accepts any one of:

- `assignees: string[]`
- `inputs: string[]`
- `names: string[]`
- `employeeGivenNames: string[]`
- `employeeIds: string[]`

Limits:

- non-empty array required
- max length `200`

Success `200`:

```json
{
  "ok": true,
  "endpoint": "/sparkery/v1/employees/resolve",
  "totalInputs": 3,
  "resolvedCount": 2,
  "unresolvedCount": 1,
  "canAutoAssign": false,
  "resolved": [],
  "uniqueResolvedEmployees": [],
  "ambiguous": [],
  "unmatched": ["Tom"]
}
```

### 10.3 POST `/sparkery/v1/dispatch/jobs`

Required:

- `title` (or alias `taskContent`)
- `scheduledDate` (or alias `date`) in `YYYY-MM-DD`
- `startTime` (or alias `scheduledStartTime`) in `HH:mm`
- `endTime` (or alias `scheduledEndTime`) in `HH:mm`
- `customerAddress` (or alias `address`)

Optional:

- `jobId` (else auto-generated)
- `customerName` / alias `propertyName`
- `description`, `notes`
- `customerProfileId`, `customerPhone`
- `serviceType` (`bond|airbnb|regular|commercial`, default `regular`)
- `priority` (`1..5`, default `3`)
- `propertyType`, `estimatedDurationHours`
- any assignment fields described in section 7.1

Success:

- `201 Created`
- returns inserted `job` and `matchedEmployees`

### 10.4 POST `/sparkery/v1/dispatch/jobs/batch`

Request:

- `jobs: object[]` required, max `100`
- `continueOnError: boolean` optional

Each `jobs[i]` uses the exact same payload rules as single job create.

Response:

- all success: `201`
- partial success + `continueOnError=true`: `200`
- fail fast mode (`continueOnError=false`): first error status

Body includes:

- `createdJobs`
- `errors[]` with `index/status/error/details`

### 10.5 POST `/sparkery/v1/dispatch/jobs/delete`

Request:

- `jobId: string` or `jobIds: string[]` or `ids: string[]`
- max total IDs `200`

Response `200`:

- `requestedCount`
- `deletedCount`
- `missingCount`
- `deletedJobs`
- `missingIds`

### 10.6 POST `/sparkery/v1/inspection-links`

Path purpose:

- create/upsert inspection record and return share URL

Request options:

- `jobId` (optional): if present, load dispatch job and inherit date/address/name/assignees as fallback
- `checkOutDate` (or alias `date`) required unless `jobId` provides scheduled date
- `propertyTemplateId` (or alias `templateId`) optional but recommended
- `propertyName` (or alias `property`) optional
- `propertyAddress` (or alias `address`) optional
- `inspectionId` optional custom ID
- assignment fields from section 7.1 optional

Success:

- `201`
- body includes:
  - `inspectionId`
  - `shareUrl`
  - `matchStrategy`
  - `template`
  - `employees`
  - `fromJobId`

### 10.7 POST `/sparkery/v1/dispatch/weekly-plan-links`

Request:

- `employeeId` or `employeeGivenName` (or alias `assignee`) required
- `weekStart` optional (`YYYY-MM-DD`, default current week Monday)
- `weekEnd` optional (default `weekStart + 6 days`)
- `includeCompleted` optional, default `false`

Behavior:

- resolves exactly one employee
- loads assigned jobs in date range
- default filters out `completed` and `cancelled`
- returns weekly plan URL and job IDs

### 10.8 POST `/sparkery/v1/dispatch/recurring/import`

Request:

- `weekStart` optional (`YYYY-MM-DD`, default current week Monday)
- `weekEnd` optional (default `weekStart + 6 days`)

Behavior:

- scans recurring customer profiles (`recurring_enabled=true`)
- generates pending jobs for configured weekdays/time
- deduplicates by `customer_profile_id + scheduled_date + start_time`

Response:

- `scannedProfiles`
- `createdCount`
- `skippedExistingCount`
- `skippedInvalidConfigCount`
- `skippedNoWeekdayCount`
- `createdCountByDate`
- `createdJobsPreview` (up to 60)

## 11. Error Matrix (Common)

- `400` bad input, missing required fields, invalid format
- `401` unauthorized
- `404` not found (employee/job/template route mismatch)
- `409` ambiguity or idempotency conflict
- `500` unexpected backend/database failure

Error shape:

```json
{
  "error": "message",
  "details": {}
}
```

`details` may be omitted.

## 12. Agent Integration Patterns

### 12.1 Safe Assignment Pattern

1. call `POST /sparkery/v1/employees/resolve`
2. if `canAutoAssign=true`, pass full resolver output under `employeeResolution`
3. call create endpoint (`dispatch/jobs` or `inspection-links`)
4. store `x-request-id` for tracing

### 12.2 Reliable Writes Pattern

1. generate stable `Idempotency-Key` per logical operation
2. retry on network timeout with same key and same payload
3. if `x-idempotency-hit=true`, treat as success replay

### 12.3 Weekly Plan Generation Pattern

1. resolve employee first (ID preferred)
2. call `weekly-plan-links`
3. use `jobCountByDate` and `jobIds` for UI and downstream route planning

## 13. Minimal cURL Templates

```bash
# 1) Resolve employee
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/employees/resolve" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"assignees":["Emma"]}'

# 2) Create job using resolver output
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/jobs" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: job-20260223-001" \
  -d '{
    "title":"API Job",
    "scheduledDate":"2026-02-25",
    "startTime":"08:30",
    "endTime":"11:30",
    "customerAddress":"8 Margaret St, Brisbane City",
    "employeeResolution":{"resolved":[{"input":"Emma","employee":{"id":"emp-20260221-pio79mvqs"}}]}
  }'

# 3) Generate inspection link from job
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/inspection-links" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"job-123"}'
```

## 14. Source of Truth

When behavior conflicts with docs, trust implementation:

- `supabase/functions/sparkery-api/index.ts`

Supporting docs:

- `docs/supabase/sparkery-api-edge-function.md`
- `docs/supabase/sparkery-api-audit-idempotency.sql`
- `docs/supabase/sparkery-api.openapi.yaml`
