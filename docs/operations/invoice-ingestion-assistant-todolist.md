# Invoice Ingestion Assistant Optimization TODO

Updated: 2026-02-25

- [x] Add bounded concurrency for batch recognize and sync.
- [x] Add timeout and retry wrapper for Drive/OCR/Xero requests.
- [x] Add versioned patch merge to reduce stale snapshot overwrite.
- [x] Mirror queue state metadata to IndexedDB with hydrate support.
- [x] Refactor Tools page workflow rendering to map-based structure.
- [x] Refactor WorkflowSidebar to config-driven typed cards and remove `as any`.
- [x] Split invoice ingestion page with reusable subcomponents.
- [x] Add delete confirmation for queue item and supplier.
- [x] Add stronger validation rules for review/settings/supplier forms.
- [x] Add dry-run warning banner in main assistant page.
- [x] Add blob retention policy and automatic cleanup after sync.
- [x] Add service tests for batch failures, idempotency, retry, retention cleanup.

## Phase 2 (2026-02-25)

- [x] Add webhook health check diagnostics with status/latency feedback.
- [x] Add polling-failure visibility (threshold stop + user-facing warning).
- [x] Add direct result-sync API health check button in Invoice OCR page.
- [x] Add direct Supabase connection check button in Invoice OCR page.
- [x] Include OCR telemetry buffer in exported diagnostics payload.

## Phase 3 (2026-02-25)

- [x] Add one-click full diagnostics (Webhook + Result Sync + Supabase).
- [x] Add Diagnostics Center modal with actionable chain status details.
- [x] Auto-run silent full diagnostics when result polling times out/fails.
- [x] Persist client-side health snapshot into completion payload and export.
- [x] Add service tests for result sync / Supabase health check methods.

## Phase 4 (2026-02-25)

- [x] Add diagnostics history ring buffer (latest 50) with persistence.
- [x] Add copy-diagnostics-JSON action (no-download path).
- [x] Add post-success delayed silent re-diagnostics (30s).
- [x] Add unified error code mapping for webhook / API / Supabase.
- [x] Add visibility-aware polling interval strategy.
- [x] Add retry/backoff wrapper for result-sync API reads.
- [x] Add diagnostics export redaction for secrets and token-like fields.
- [x] Add MIME sniffing guard for uploaded files (signature-level check).
- [x] Make polling failure threshold configurable.
- [x] Add traceId across upload/diagnostics/results/telemetry/export.
- [x] Add quick result filters (status/low confidence/recent 24h).
- [x] Add full-text result search (invoice/vendor/execution id).
- [x] Add upload ETA estimation during recognition progress.
- [x] Add queue item actions: move-to-top and re-validate.
- [x] Normalize core OCR UX copy to Chinese (remove mixed-language key paths).
- [x] Add diagnostics center action: copy execution id + request key bundle.
- [x] Add empty-result next-step action block.
- [x] Add mobile responsive refinement for OCR header/actions.
- [x] Add component tests for diagnostics center rendering/state transitions.
- [x] Add component tests for clientHealth alert rendering in results page.
- [x] Add integration test: polling timeout -> auto full diagnostics.
- [x] Add webhook response contract tests (object/array/text compatibility).
- [x] Add stress test fixture for 20-50 file upload path validation.
- [x] Add manual correction entry with local writeback path.
- [x] Add supplier template rule mapping persistence and apply helper.
- [x] Add docx/xlsx intake support path for invoice upload.
- [x] Add basic industry template auto-tags for extracted invoices.

## Phase 5 (2026-02-25)

- [x] Add file-content fingerprint dedupe and historical cache reuse.
- [x] Add resumable chunk upload with interruption recovery.
- [x] Add idempotency-key unique constraint at persistence layer.
- [x] Add webhook request signature verification (HMAC).
- [x] Add global queue concurrency cap with lease timeout reclaim.
- [x] Add failed-file quarantine lane and isolated retry workflow.
- [x] Add field-level manual correction audit history.
- [x] Add RBAC guard for manual correction actions.
- [x] Add result version diff view (original vs corrected).
- [x] Add fuzzy duplicate invoice detection (number/vendor/date/amount).
- [x] Add multi-currency and tax-rate normalization with rate timestamp.
- [x] Add SLA dashboard (P50/P95 latency, failure rate, retry rate).
- [x] Add OpenTelemetry linkage for frontend and backend traces.
- [x] Add alert severity tiers with quiet-window suppression.
- [x] Add supplier template alias matching and priority fallback.
- [x] Add customizable table columns with persistence.
- [x] Add batch operation orchestration (batch tag/confirm/export).
- [x] Add data quality scorecard (completeness/accuracy/consistency).
- [x] Add scheduled diagnostics snapshot archive.
- [x] Add CI performance baseline for bulk upload and polling stress.

## Phase 6 (2026-02-25)

- [x] Add sync pre-duplicate check (local signature + optional Xero precheck endpoint).
- [ ] Add Supabase/server-side primary storage for queue state and snapshots.
- [ ] Add backend async orchestration for OCR/archive/sync jobs.
- [ ] Add real Xero attachment upload (binary) after transaction creation.
- [ ] Add compliance rule engine by transaction type/invoice class.
- [ ] Add ABN validation integration (ABR) with cache and rate-limit guard.
- [ ] Add GST decision engine with tax-type binding policy.
- [ ] Add human-correction learning loop for supplier/rule templates.
- [ ] Add batch approval gate workflow before sync execution.
- [ ] Add error-type remediation flow with targeted retry playbooks.
- [ ] Add post-sync bank reconciliation suggestion workflow.
- [ ] Add security hardening pack (encryption, retention, audit export).
