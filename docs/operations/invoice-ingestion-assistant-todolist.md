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
