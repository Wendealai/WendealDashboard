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
