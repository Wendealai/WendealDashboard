# Sparkery API (Supabase Edge Function)

This document describes the first API gateway for Sparkery:

- `GET /sparkery/v1/employees`
- `POST /sparkery/v1/employees/resolve`
- `POST /sparkery/v1/dispatch/jobs`
- `POST /sparkery/v1/dispatch/jobs/batch`
- `POST /sparkery/v1/dispatch/jobs/delete`
- `POST /sparkery/v1/inspection-links`
- `POST /sparkery/v1/dispatch/weekly-plan-links`
- `POST /sparkery/v1/dispatch/recurring/import`

Function name: `sparkery-api`

## 1. Deploy

1. Install and login Supabase CLI.
2. Link your project.
3. Deploy function:

```bash
supabase functions deploy sparkery-api --no-verify-jwt
```

## 2. Required Secrets

Set function secrets:

```bash
supabase secrets set SPARKERY_API_TOKEN=your_long_token
supabase secrets set SPARKERY_APP_ORIGIN=https://your-app-domain.com
```

Notes:

- `SPARKERY_API_TOKEN` is the single shared auth token.
- `SPARKERY_APP_ORIGIN` is used to build full inspection share URLs.
- Function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from runtime.

## 3. Auth

Use one of:

- `Authorization: Bearer <SPARKERY_API_TOKEN>`
- `x-api-key: <SPARKERY_API_TOKEN>`

Optional:

- `Idempotency-Key: <unique-key>`

When set, mutation endpoints will return the same result for duplicate retry requests.

## 4. Endpoints

### 4.1 List Employees

`GET /functions/v1/sparkery-api/sparkery/v1/employees`

Optional query:

- `q`: filters by id, full name, chinese name, or given name token.

Example:

```bash
curl "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/employees?q=emma" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>"
```

### 4.2 Resolve Employees (Batch)

`POST /functions/v1/sparkery-api/sparkery/v1/employees/resolve`

Use this endpoint to resolve multiple names/IDs before creating jobs.

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/employees/resolve" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "assignees": ["Emma", "emp-20260221-pio79mvqs", "Tom"]
  }'
```

Response includes:

- `resolved` (per input match result)
- `ambiguous` (inputs that match multiple employees)
- `unmatched` (inputs that match none)
- `canAutoAssign` (true only when all inputs resolved)

### 4.3 Create Dispatch Job

`POST /functions/v1/sparkery-api/sparkery/v1/dispatch/jobs`

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/jobs" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "3803 Airbnb turnover clean",
    "scheduledDate": "2026-02-25",
    "startTime": "08:30",
    "endTime": "11:30",
    "customerAddress": "8 Margaret St, Brisbane City",
    "serviceType": "airbnb",
    "priority": 3,
    "assignees": ["Tom"]
  }'
```

Required fields:

- `title`
- `scheduledDate` (YYYY-MM-DD)
- `startTime` (HH:mm)
- `endTime` (HH:mm)
- `customerAddress`

Employee matching:

- Uses `assignees` / `employeeGivenNames` by given name first.
- `assignees` also accepts employee IDs directly (same as `employeeIds`).
- You can pass resolver output directly via:
  - `employeeResolution` (full object from `/employees/resolve`)
  - `uniqueResolvedEmployees` / `resolvedAssignees` / `resolved` (arrays with employee id)
- If duplicate matches exist, API returns `409`.

Example (pass resolver result directly):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/jobs" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Office clean",
    "scheduledDate": "2026-02-27",
    "startTime": "09:00",
    "endTime": "11:00",
    "customerAddress": "10 Queen St, Brisbane City",
    "employeeResolution": {
      "resolved": [
        {
          "input": "Emma",
          "employee": { "id": "emp-20260221-pio79mvqs" }
        }
      ]
    }
  }'
```

### 4.4 Generate Inspection Link

`POST /functions/v1/sparkery-api/sparkery/v1/inspection-links`

Example (template + given name):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/inspection-links" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyTemplateId": "prop-abc123",
    "checkOutDate": "2026-02-25",
    "assignees": ["Tom"]
  }'
```

Example (from dispatch job):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/inspection-links" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job-123456"
  }'
```

Template matching order:

1. `propertyTemplateId` / `templateId`
2. Address core (`Number + Street Name`, case-insensitive)
3. Property name exact normalized match

### 4.5 Batch Create Dispatch Jobs

`POST /functions/v1/sparkery-api/sparkery/v1/dispatch/jobs/batch`

Notes:

- Each item in `jobs[]` supports the same employee fields as single create:
  - `employeeIds`
  - `assignees`
  - `employeeResolution` (full result object from `/employees/resolve`)
  - `uniqueResolvedEmployees` / `resolvedAssignees` / `resolved`

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/jobs/batch" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: batch-20260223-01" \
  -d '{
    "continueOnError": true,
    "jobs": [
      {
        "title": "3803 Airbnb turnover clean",
        "scheduledDate": "2026-02-25",
        "startTime": "08:30",
        "endTime": "11:30",
        "customerAddress": "8 Margaret St, Brisbane City",
        "serviceType": "airbnb",
        "assignees": ["Tom"]
      },
      {
        "title": "Office deep clean",
        "scheduledDate": "2026-02-26",
        "startTime": "13:00",
        "endTime": "16:00",
        "customerAddress": "99 George St, Brisbane City",
        "serviceType": "commercial",
        "assignees": ["Tom"]
      }
    ]
  }'
```

Example (reuse resolver output object in batch item):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/jobs/batch" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: batch-20260223-02" \
  -d '{
    "continueOnError": true,
    "jobs": [
      {
        "title": "3803 Airbnb turnover clean",
        "scheduledDate": "2026-02-25",
        "startTime": "08:30",
        "endTime": "11:30",
        "customerAddress": "8 Margaret St, Brisbane City",
        "employeeResolution": {
          "resolved": [
            {
              "input": "Emma",
              "employee": { "id": "emp-20260221-pio79mvqs" }
            }
          ]
        }
      }
    ]
  }'
```

### 4.6 Delete Dispatch Jobs

`POST /functions/v1/sparkery-api/sparkery/v1/dispatch/jobs/delete`

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/jobs/delete" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: delete-20260223-01" \
  -d '{
    "jobIds": ["job-123", "job-456"]
  }'
```

### 4.7 Generate Weekly Plan Link

`POST /functions/v1/sparkery-api/sparkery/v1/dispatch/weekly-plan-links`

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/weekly-plan-links" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeGivenName": "Tom",
    "weekStart": "2026-02-23"
  }'
```

Behavior:

- Matches one employee by `employeeId` or `employeeGivenName`.
- Collects all assigned jobs for that week.
- Returns `planUrl`, `jobIds`, and `jobCountByDate`.

### 4.8 Import Recurring Jobs

`POST /functions/v1/sparkery-api/sparkery/v1/dispatch/recurring/import`

Example:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sparkery-api/sparkery/v1/dispatch/recurring/import" \
  -H "Authorization: Bearer <SPARKERY_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "weekStart": "2026-02-23",
    "weekEnd": "2026-03-01"
  }'
```

Behavior:

- Reads recurring customer profiles in dispatch.
- Creates missing weekly jobs (deduplicates by profile + date + start time).
- Returns created/skipped counts and preview list.

## 6. Optional Support Tables (Recommended)

Run SQL:

- `docs/supabase/sparkery-api-audit-idempotency.sql`

It creates:

- `public.sparkery_api_idempotency` (Idempotency-Key replay store)
- `public.sparkery_api_audit_logs` (request audit logs)

## 7. Health Check

Public endpoint:

`GET /functions/v1/sparkery-api/health`

or

`GET /functions/v1/sparkery-api/sparkery/v1/health`
