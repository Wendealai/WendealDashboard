# Multi-Angle Optimization Todo List

Updated: 2026-02-27  
Status keys:

- `[ ]` not started
- `[-]` in progress
- `[x]` completed

## Phase A: P0 Immediate Impact

- [x] Refine Vite chunk strategy to eliminate oversized catch-all vendor chunk
  - Scope: `vite.config.ts`
  - Done when: `vendor` catch-all is removed and chunking is feature/library grouped
- [x] Remove lazy/static mixed-import warnings for critical routes
  - Scope: `src/router/routes.ts`, `src/pages/Sparkery/index.tsx`, quote form route components
  - Done when: `MainLayout` and `BondCleanQuoteForm` mixed import warnings no longer appear in build output
- [x] Start large component split by introducing stable container entrypoints
  - Scope: `src/pages/SocialMedia/components/InternationalSocialMediaGenerator.tsx`, `src/pages/Sparkery/CleaningInspectionAdmin.tsx`
  - Done when: original entry files become thin wrappers delegating to container files
- [x] Start i18n namespace/domain lazy loading to reduce startup payload
  - Scope: `src/locales/index.ts`, Sparkery entry path
  - Done when: Sparkery override dictionary is loaded on demand, not in initial locale bootstrap
  - Next: split `en-US.ts` and `zh-CN.ts` by domain namespaces
- [x] Remove TypeScript compiler runtime from production bundle
  - Scope: `src/utils/delay.ts`, `src/services/dashboardService.ts`, `src/services/workflowSettingsService.ts`
  - Done when: no `typescript-vendor` chunk is emitted in build output
- [x] Replace Dashboard heatmap implementation to remove `echarts-for-react`
  - Scope: `src/pages/Dashboard/index.tsx`
  - Done when: dashboard heatmap uses `@ant-design/charts` and no `echarts-vendor` chunk is emitted
- [x] Fine-grain split Ant Design and AntV vendors to eliminate >1MB chunk warning
  - Scope: `vite.config.ts`
  - Done when: `antd`/`rc`/`@ant-design`/`@antv` are split into dedicated chunks and build large-chunk warning is cleared
- [x] Remove obsolete ECharts runtime dependencies after dashboard migration
  - Scope: `package.json`, `package-lock.json`, `vite.config.ts`
  - Done when: `echarts` and `echarts-for-react` are removed from dependencies and no ECharts chunk rule remains
- [x] Lazy-load Chinese base locale bundle
  - Scope: `src/locales/index.ts`
  - Done when: startup path embeds only English base bundle and `zh-CN` base dictionary is loaded on demand
- [x] Split English Sparkery locale into route-level lazy override bundle
  - Scope: `src/locales/en-US.ts`, `src/locales/en-US.sparkery-overrides.ts`, `src/locales/index.ts`, `src/pages/Sparkery/index.tsx`
  - Done when: Sparkery dictionary is removed from base `en-US` bundle and loaded on demand when entering Sparkery page
- [x] Split heavy misc vendor dependencies for headroom (`lodash`, canvas/html2pdf chain)
  - Scope: `vite.config.ts`
  - Done when: `lodash-vendor` and `canvas-vendor` chunks are emitted and `vendor-misc` significantly drops

## Phase B: Reliability and Observability

- [x] Add end-to-end telemetry correlation (`traceId`, `jobId`, `userId`)
  - Scope: `src/services/sparkeryTelemetry.ts`, Dispatch/quote paths
  - Done when: one business operation can be traced across all emitted events
  - Progress: `dispatch.job.create.*` and `dispatch.job.update.*` telemetry now emits `traceId` and `jobId`
  - Progress: `quote.print.*`, `quote.custom_report.print.*`, `dispatch.offline.enqueue`, and `dispatch.offline.flush.completed` now emit `traceId`
  - Progress: Sparkery telemetry now auto-enriches events with `userId` (payload first, then runtime/store/auth storage fallback)
  - Progress: `AuthProvider` now synchronizes runtime telemetry `userId` context for stronger cross-event user correlation
  - Progress: quote/offline key telemetry callsites now explicitly pass `userId` in event payloads (in addition to auto-enrichment fallback)
  - Progress: dispatch job mutation chain (`slice -> service -> jobsDomain`) now explicitly passes `userId` into `dispatch.job.create.*` and `dispatch.job.update.*` telemetry
  - Progress: dispatch job failure telemetry (`dispatch.job.create.failed`, `dispatch.job.update.failed`) now includes `actorRole` and `sessionId` dimensions for production triage aggregation
  - Progress: telemetry runtime auto-enriches `appVersion`, `deviceId`, and `networkType` for stronger cross-environment event stitching
- [x] Add error code taxonomy for operational triage
  - Scope: service layer + telemetry payload standards
  - Done when: top failure modes have stable error codes
  - Progress: dispatch jobs telemetry includes stable `errorCode` values (`DISPATCH_FINANCE_SCHEMA_MISSING`, `DISPATCH_SUPABASE_REQUEST_FAILED`, `DISPATCH_SUPABASE_EMPTY_RESPONSE`)
  - Progress: quote/offline telemetry includes stable `errorCode` values (`QUOTE_PRINT_*`, `QUOTE_CUSTOM_REPORT_*`, `DISPATCH_OFFLINE_FLUSH_*`)
- [x] Introduce background sync enhancement for offline queue
  - Scope: dispatch offline queue + service worker channel
  - Done when: queued items continue retrying without active page session
  - Progress: added service-worker sync channel and queue/config message bridge in `offlineQueue.ts` + `offlineBackgroundSync.ts`
  - Progress: `public/sw.js` now handles offline queue persistence and background retry via sync tag `sparkery-dispatch-offline-sync-v1`

## Phase C: Architecture and Maintainability

- [x] Decompose `sparkeryDispatch` domain service by sub-domains
  - Scope: jobs/employees/customers/recovery modules
  - Done when: each sub-domain file is cohesive and independently testable
  - Progress: extracted jobs domain module `src/services/sparkeryDispatch/jobsDomain.ts` and delegated job APIs from `domainService.ts`
  - Progress: extracted employees domain module `src/services/sparkeryDispatch/employeesDomain.ts` and delegated employee/location/schedule APIs from `domainService.ts`
  - Progress: extracted customers domain module `src/services/sparkeryDispatch/customersDomain.ts` and delegated customer profile/recurring job APIs from `domainService.ts`
  - Progress: extracted recovery domain module `src/services/sparkeryDispatch/recoveryDomain.ts` and delegated migration/backup APIs from `domainService.ts`
  - Verification: added independent contract tests for all four sub-domains in `src/__tests__/contract/sparkeryDispatchDomains.contract.test.ts`
- [x] Continue Sparkery style debt burn-down from legacy stylesheet
  - Scope: `src/pages/Sparkery/styles/sparkery-legacy.css`
  - Done when: style ownership is domain-separated and low-coupled
  - Progress: migrated dispatch style ownership from `sparkery-legacy.css` into `sparkery-dispatch.css` (including mobile responsive dispatch rules)
  - Verification: `sparkery-legacy.css` no longer contains dispatch selectors; dispatch styles are isolated in `sparkery-dispatch.css`
- [x] Extract domain hooks/utilities from large SocialMedia/Sparkery containers
  - Scope: large container files
  - Done when: pure business logic is in hooks/services, component body is view-oriented
  - Progress: extracted telemetry-context logic from dispatch employee tasks container into `src/pages/Sparkery/dispatch/useDispatchTelemetryContext.ts`
  - Progress: `DispatchEmployeeTasksPage` now consumes the hook and focuses on view orchestration
  - Progress: extracted Sparkery tab prefetch orchestration into `src/pages/Sparkery/useSparkeryTabPrefetch.ts` and slimmed `src/pages/Sparkery/index.tsx`

## Phase D: Delivery, Cost, and Security

- [x] Split CI quality gates into release-blocking and debug-experimental tiers
  - Scope: `.github/workflows/*.yml`
  - Done when: low-value debug suites cannot block production deployment
  - Progress: `quality.yml` now separates release-blocking and debug-experimental jobs
- [x] Add dependency/image vulnerability scanning and SBOM export
  - Scope: CI pipeline
  - Done when: each release has security scan output and artifact manifest
  - Progress: added `security-sbom.yml` with dependency review, npm audit, Trivy scan, and SBOM artifact export
- [x] Add API usage caching and rate limiting strategy for high-cost providers
  - Scope: service layer and webhook integrations
  - Done when: repeated equivalent requests are deduplicated with measurable cost reduction
  - Progress: added `apiUsageOptimizer` and integrated optimized cached/rate-limited call path in `chatService.ts`

## Phase E: Priority Backlog (P0/P1/P2)

### P0 (Do First)

- [x] Enable service-worker background sync for dispatch offline queue retries
  - Scope: `src/pages/Sparkery/dispatch/offlineQueue.ts`, service worker channel, app bootstrap registration
  - Done when: queued actions continue retrying after page close/reopen, with observable retry telemetry
- [x] Extend telemetry context with `appVersion`, `deviceId`, `networkType`
  - Scope: `src/services/sparkeryTelemetry.ts`, dispatch/quote/offline callsites
  - Done when: all critical success/failure events carry consistent environment dimensions
- [x] Add server-side telemetry sink and queryable event table
  - Scope: Supabase telemetry schema + ingestion endpoint + client flush
  - Done when: key telemetry events are searchable centrally (not only localStorage) with retention policy
- [x] Add unified Supabase retry + circuit-breaker wrapper
  - Scope: `src/services/sparkeryDispatch/apiLayer.ts`, shared request utilities
  - Done when: transient network/5xx errors use bounded retry and sustained failures open circuit with graceful fallback
- [x] Add immutable finance audit log for dispatch mutations
  - Scope: Supabase table/RLS + `confirm/apply adjustment/payment` write paths
  - Done when: each finance mutation records before/after snapshot, actor, and timestamp, and cannot be overwritten

### P1 (Do Next)

- [x] Standardize idempotency-key generation for dispatch/quote write operations
- Scope: dispatch job mutations, quote print/report generation, offline queue actions
- Done when: duplicate submit/replay returns one logical write result without data divergence
- Progress: added `sparkeryIdempotency.ts` and integrated idempotency keys for dispatch job create/update mutation writes
- Progress: quote print and custom report print paths now emit deterministic idempotency keys in telemetry payloads
- Progress: offline queue actions now carry deterministic idempotency keys and deduplicate enqueued operations by key
- Progress: added idempotency-aware optimized API usage path for chat provider calls
- [x] Add composite indexes for high-frequency dispatch queries
  - Scope: `docs/supabase/*.sql` migrations for `dispatch_jobs`
  - Done when: common filters (`scheduled_date`, `status`, assignee) use indexes and query latency is measurably reduced
- [x] Split CI test gates into release-blocking vs debug-experimental lanes
  - Scope: `.github/workflows/*.yml`
  - Done when: production deploy is blocked only by core quality gates; debug suites run in non-blocking lane
- [x] Continue Sparkery route prefetch and fine-grained lazy loading
  - Scope: `src/router/routes.ts`, Sparkery heavy sub-pages/components
  - Done when: Sparkery first interactive load and route-switch latency both improve with no chunk regression warnings

### P2 (Harden and Scale)

- [x] Add security scanning pipeline with dependency/image scan and SBOM artifact
  - Scope: CI security stage + release artifacts
  - Done when: each release includes vulnerability report, policy threshold, and SBOM output
- [x] Define service SLOs and production alerting for dispatch critical paths
- Scope: telemetry aggregation + alert rules + dashboard
- Done when: SLOs (latency/error-rate) are tracked continuously with actionable alert routes
- Progress: documented SLO/error budget model and alert routing in `docs/operations/sparkery-slo-alerting.md`
- [x] Build one-click rollback workflow for frontend + migration safety checks
  - Scope: deploy scripts/playbook + migration pre-check + rollback command
  - Done when: rollback is executable in one command with documented guardrails and verification steps
  - Progress: added rollback workflow + helper scripts (`release-rollback.yml`, `scripts/release-rollback.mjs`, `scripts/migration-safety-check.mjs`)

## Verification (Current Batch)

- `npm run typecheck --silent` passed
- `npm run test:contract --silent` passed
- `npm run build --silent` passed
- `npm run test:pyramid --silent` passed
- Build check: mixed lazy/static warnings for `MainLayout` and `BondCleanQuoteForm` are cleared
- Build check: `typescript-vendor` and `echarts-vendor` are no longer emitted
- Build check: no `Some chunks are larger than 1000 kBs` warning remains
- Build check: generated lazy chunk includes `zh-CN-*.js` and loads separately from entry bundle
- Build check: generated lazy chunk includes `en-US.sparkery-overrides-*.js`
- Build check: `vendor-misc` reduced from ~980 kB to ~480 kB after split (`lodash-vendor`, `canvas-vendor`)
- Domain check: jobs operations in `sparkeryDispatchService` now delegate to `src/services/sparkeryDispatch/jobsDomain.ts` with unchanged public API
- Domain check: employee/location/schedule operations in `sparkeryDispatchService` now delegate to `src/services/sparkeryDispatch/employeesDomain.ts` with unchanged public API
- Domain check: customer profile + recurring job generation operations now delegate to `src/services/sparkeryDispatch/customersDomain.ts` with unchanged public API
- Domain check: migration and backup operations now delegate to `src/services/sparkeryDispatch/recoveryDomain.ts` with unchanged public API
- Domain check: dedicated contract test suite validates jobs/employees/customers/recovery domains independently
- Reliability check: dispatch jobs telemetry now records `traceId` and stable `errorCode` for failure/success correlation
- Reliability check: quote printing and offline queue telemetry now records `traceId`; failure/partial paths emit stable `errorCode`
- Reliability check: telemetry contract validates `userId` auto-enrichment and explicit `userId` precedence
- Reliability check: telemetry contract validates runtime `userId` context injection path
- Reliability check: offline queue contract validates explicit `userId` propagation from caller options to telemetry
- Reliability check: dispatch domain contract validates explicit `userId` propagation for job create/update telemetry
- Reliability check: dispatch offline queue supports service-worker background sync replay with queue/config message bridge
- Maintainability check: dispatch selectors are isolated in `sparkery-dispatch.css`; `sparkery-legacy.css` no longer contains dispatch styles
- Maintainability check: Sparkery tab prefetch logic moved to `useSparkeryTabPrefetch` hook to keep page container view-focused

## Phase F: Cleaning Inspection One-off Template Excellence (P0/P1/P2)

### P0 (Do First)

- [x] Add one-off template presets by cleaning intent and property profile matrix
  - Scope: `src/pages/Sparkery/CleaningInspectionAdminContainer.tsx`
  - Done when: each one-off generation always produces a deterministic section+checklist baseline for common scenarios
- [x] Add one-off template quality guard (minimum checklist coverage + mandatory evidence sections)
  - Scope: one-off generator flow + checklist editor guardrails
  - Done when: users cannot generate a one-off link with empty or low-coverage critical sections
- [x] Add inline report preview before one-off link creation
  - Scope: one-off modal + report template rendering path
  - Done when: user can preview final report structure/content before clicking create link
- [x] Add “quick duplicate & adjust” for one-off drafts in current session
  - Scope: one-off modal state management
  - Done when: similar one-off jobs can be generated by cloning and editing in <=3 clicks
- [x] Add one-off generation telemetry funnel
  - Scope: Sparkery telemetry events around open/edit/create/submit
  - Done when: conversion from one-off draft to submitted inspection is measurable by scenario type

### P1 (Do Next)

- [x] Add section bundle macros (kitchen deep-clean pack, move-out pack, office hygiene pack)
  - Scope: one-off section/checklist editor
  - Done when: user can apply/remove prebuilt bundles without manually editing every item
- [x] Add bulk checklist operations (bulk photo-required toggle, bulk delete, bulk reorder)
  - Scope: one-off checklist editor UX
  - Done when: large one-off checklists can be edited quickly with batch actions
- [x] Add per-customer one-off memory (non-recurring preference profile)
  - Scope: local/session preferences + customer mapping
  - Done when: same customer’s repeated ad-hoc jobs auto-load preferred one-off defaults
- [x] Add one-off draft autosave + recovery
  - Scope: local cache layer + modal restore prompt
  - Done when: accidental tab close/refresh does not lose one-off draft work
- [x] Add template drift detector against actual submission edits
  - Scope: compare generated checklist vs final submitted checklist
  - Done when: high-frequency manual edits are surfaced as candidate improvements to presets

### P2 (Harden and Scale)

- [x] Add one-off governance policy (TTL cleanup, payload size cap, image-count cap)
  - Scope: submission and archive lifecycle policy
  - Done when: one-off records remain lightweight and long-term storage growth is bounded
- [x] Add role-based controls for advanced one-off edit permissions
  - Scope: admin/editor role capability boundaries
  - Done when: high-risk edits (compliance sections, mandatory evidence rules) require privileged role
- [x] Add cloud-side one-off template recommendation endpoint
  - Scope: Supabase function + client integration
  - Done when: presets can be centrally tuned and delivered without frontend redeploy
- [x] Add SLA and alerting for inspection generation/open-link failures
  - Scope: telemetry aggregation + alert thresholds
  - Done when: failures in one-off generation and link-open flows are alerted with actionable diagnostics
- [x] Add contract tests for one-off generation schema and backward compatibility
  - Scope: `src/__tests__/contract/**` for one-off payload and section/checklist contracts
  - Done when: one-off data contracts are protected against breaking refactors
  - Progress: added contract suite `src/__tests__/contract/inspectionOneOff.contract.test.ts`

## Phase G: Bundle De-monolithization (P0)

- [x] Replace catch-all `vendor` chunk with stable dependency-family split strategy
  - Scope: `vite.config.ts` (`build.rollupOptions.output.manualChunks`)
  - Done when: build output no longer contains single mega vendor chunk and chunk-size warning is cleared
  - Progress: introduced grouped + package-aware chunking for react, antd ecosystem, antv/d3, pdf, xlsx, i18n, markdown, and package fallback

## Verification (Phase G)

- Build before: `vendor` chunk `4,781.26 kB` and chunk-size warning present
- Build after: largest chunk `antv-vendor` `938.69 kB`; no chunk-size warning emitted
- Command: `npm run build --silent` passed

## Phase H: Cleaning Inspection Admin UI Deep Optimization

### P0 (High-frequency workflow)

- [x] Add archive saved-view system (save/apply/delete filter presets)
  - Scope: archive filter toolbar + local cache persistence
  - Done when: user can restore full search+filter context in one click
- [x] Add archive quick-filter chips for operational triage
  - Scope: filter model + UI (`Needs Attention`, `Stale 48h+`, `No Assignee`)
  - Done when: high-priority records can be isolated without manual multi-filtering
- [x] Add batch-selection workflow on archive cards
  - Scope: card checkbox + select-visible control
  - Done when: users can multi-select and manage visible records efficiently
- [x] Add batch actions (copy links / open selected / bulk delete)
  - Scope: batch action bar + execution handlers
  - Done when: repetitive archive operations are reduced to one action row
- [x] Add keyboard shortcuts for high-frequency actions
  - Scope: inspection admin page shortcut handler
  - Done when: `Ctrl/Cmd+Shift+N/R/F` supports create one-off, refresh, focus search

### P1 (Information density and review speed)

- [x] Add submission progress and refresh freshness signal in overview
  - Scope: overview metrics card
  - Done when: user sees completion ratio and data freshness without scrolling
- [x] Add expandable card details for rapid inspection context
  - Scope: archive card detail panel
  - Done when: section/checklist/photo/damage summary is visible inline
- [x] Add operation center panel for recent UI actions
  - Scope: local operation log stream
  - Done when: key UI actions (refresh/copy/open/delete/view ops) are traceable in-page
- [x] Add selected-card visual emphasis and denser action affordances
  - Scope: archive card styling and action cluster
  - Done when: selected items are clearly distinguishable for batch workflows
- [x] Add archived view dirty-state behavior
  - Scope: active view tracking
  - Done when: editing filters/search automatically exits the saved-view locked state
- [x] Add list/board dual-layout archive view
  - Scope: archive render pipeline + status swimlane cards
  - Done when: operators can switch between linear scan and status-column triage without losing filters
- [x] Add right-side detail drawer for archive cards
  - Scope: card action cluster + detail drawer content blocks
  - Done when: key inspection metadata and summary stats are reviewable without leaving page

### P2 (Robustness and responsive polish)

- [x] Persist archive views and action logs with bounded retention
  - Scope: local storage for views/logs + limits
  - Done when: state survives reload while storage growth stays bounded
- [x] Normalize date-range filtering for reversed input
  - Scope: archive filter evaluator
  - Done when: date-from > date-to still produces deterministic filtering
- [x] Add archive selection cleanup on data churn
  - Scope: archive selection state lifecycle
  - Done when: stale selected/expanded IDs are automatically pruned after refresh/delete
- [x] Add aria labels for key row actions (search/open/copy/select)
  - Scope: archive interaction controls
  - Done when: primary interaction controls provide explicit accessible labels
- [x] Add responsive layout rules for new view/batch/log modules
  - Scope: `sparkery-legacy.css` mobile breakpoints
  - Done when: filter presets, batch bar, and logs remain usable on mobile widths
- [x] Harden delete undo mapping to deleted record identity
  - Scope: archive delete toast + undo handler parameterization
  - Done when: consecutive deletes still restore the intended record without cross-over

## Verification (Phase H)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase I: Inspection Ops Throughput Expansion

### P0 (Operator throughput)

- [x] Add status-column WIP guardrails in board mode
  - Scope: board column rendering + threshold highlight
  - Done when: overloaded columns surface warning state instead of blending into normal flow
- [x] Add operational quick filters for due-today/overdue/missing-required-photos
  - Scope: archive filter model + quick chip segmented controls
  - Done when: urgent and quality-risk inspections can be isolated in one click
- [x] Add batch mutation actions (status / assignees / check-out date)
  - Scope: selected-items action panel + persistence via inspection service
  - Done when: common fleet updates no longer require opening records one-by-one
- [x] Add filtered archive CSV export
  - Scope: archive toolbar export action
  - Done when: current query result can be exported for external review/reconciliation

### P1 (Review speed)

- [x] Add drawer-level previous/next navigation
  - Scope: detail drawer controls + filtered archive index tracking
  - Done when: reviewer can navigate neighboring records without closing drawer
- [x] Add keyboard acceleration (`J/K`) for drawer navigation
  - Scope: page-level shortcut listener for non-input focus
  - Done when: keyboard users can rapidly traverse archive records
- [x] Add shortcut help panel (`?`) and toolbar entry
  - Scope: keyboard helper modal + explicit trigger button
  - Done when: hotkeys are discoverable without external documentation

### P2 (Interaction polish)

- [x] Make batch action panel sticky with mobile fallback
  - Scope: archive batch card CSS + responsive overrides
  - Done when: multi-select actions remain reachable during long-list scrolling

## Verification (Phase I)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase J: Inspection Review Intelligence (UI)

### P0 (Signal-first workflow)

- [x] Add archive field-visibility persistence and quick visibility presets
  - Scope: archive filter panel + local storage
  - Done when: operators can hide/show dense metadata and keep preference after reload
- [x] Include field-visibility in saved views
  - Scope: saved view schema and apply/dirty-state checks
  - Done when: applying a saved view restores both filters and visible-field profile
- [x] Add date preset shortcuts (All / Today / Last 7d / Last 30d)
  - Scope: archive date filtering controls
  - Done when: date range can be switched in one click without manual from/to edits

### P1 (Triage acceleration)

- [x] Add operational signal strip with live counts
  - Scope: filtered result summaries (`Overdue`, `Due Today`, `Missing Required Photos`, `No Assignee`, `Stale 48h+`)
  - Done when: risk dimensions are visible and directly clickable as quick filters
- [x] Add quick subset selection actions
  - Scope: selection controls for visible records
  - Done when: one click can select overdue/due-today/missing-photo/no-assignee subsets or invert visible selection
- [x] Add batch copy IDs action
  - Scope: batch toolbar + clipboard flow
  - Done when: selected inspection IDs can be copied directly for support/escalation workflows

### P2 (Detail-panel throughput)

- [x] Add inline drawer mutation for assignees/status/check-out date
  - Scope: archive detail drawer quick-edit card
  - Done when: reviewer can complete common updates without leaving drawer
- [x] Add card-level risk badges for overdue/due-today/missing-photos/no-assignee
  - Scope: archive card title metadata
  - Done when: high-risk records are visually elevated in both list and board layouts

## Verification (Phase J)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase K: Power-User Interaction Compression

### P0 (Faster board + keyboard operations)

- [x] Add board-column collapse/expand with persisted preference
  - Scope: board column head controls + local storage
  - Done when: operators can fold low-priority columns and keep preference after reload
- [x] Add keyboard shortcuts for bulk selection and copy actions
  - Scope: archive page keybindings (`Ctrl/Cmd+Shift+A/I/L/D`)
  - Done when: visible select, invert, copy links, and copy IDs are executable without mouse

### P1 (Discoverability)

- [x] Expand shortcut hint text and help modal command list
  - Scope: shortcut hint banner + `?` help modal
  - Done when: new selection/copy shortcuts are discoverable in-page

## Verification (Phase K)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase L: Long-Session Operations Ergonomics

### P0 (Night-shift batch comfort)

- [x] Add configurable archive auto-refresh interval (`Off/15s/30s/60s`)
  - Scope: overview control + polling scheduler + local persistence
  - Done when: operator controls refresh pressure based on workload/network
- [x] Add one-click visible detail expand/collapse
  - Scope: quick selection strip + keyboard shortcuts
  - Done when: reviewer can open/close detail blocks for all visible records in one action

### P1 (Drawer navigation efficiency)

- [x] Add “Next Unsubmitted” drawer navigation action
  - Scope: detail drawer navigation row
  - Done when: reviewer can jump across unfinished records without scanning submitted ones
- [x] Extend shortcut catalog with detail expand/collapse commands
  - Scope: shortcut hint and help modal
  - Done when: power-user commands remain discoverable and consistent with behavior

## Verification (Phase L)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase M: Inspection Ops Control Tower (UI)

### P0 (Control and triage depth)

- [x] Add advanced archive filters (`mine-only`, `exclude status`, `missing-field` flags, `searchMode`)
  - Scope: archive filter model + URL sync + evaluation pipeline
  - Done when: operators can compose richer triage predicates without leaving page
- [x] Add search-result cycling (`Prev/Next`) with active match count
  - Scope: search navigation controls + focused drawer sync
  - Done when: text matches can be traversed quickly across filtered records
- [x] Add pinned saved views and keep pinned-first ordering
  - Scope: saved-view state + view menu rendering
  - Done when: frequently used operational views stay at top across sessions
- [x] Add board status-column controls (move left/right, hide/show, collapse persistence)
  - Scope: board preference state + column header controls
  - Done when: board layout can be tuned per operator workflow and remembered
- [x] Add board drag-to-status mutation
  - Scope: card drag events + status update handler
  - Done when: status transitions can be completed by drop interaction

### P1 (Review throughput and resilience)

- [x] Add card meta controls (pin/star/review tags + custom tags)
  - Scope: archive card state + detail actions + local persistence
  - Done when: operators can mark priority/review state and annotate ad-hoc tags
- [x] Add card SLA indicator with countdown and progress signal
  - Scope: card risk panel
  - Done when: urgency is visible directly on cards without opening detail
- [x] Add inline detail edits for key text fields (property name/notes)
  - Scope: expanded card detail editor
  - Done when: lightweight corrections can be completed in place
- [x] Add batch action preview + scheduled execution + progress tracking
  - Scope: batch mutation pipeline, preview modal, scheduled-at option
  - Done when: bulk updates provide explicit confirmation and progress/failure visibility
- [x] Add batch failed-item retry preparation flow
  - Scope: batch progress state and failed-id handoff
  - Done when: failed subset can be retried without rebuilding selection

### P2 (Session ergonomics and observability)

- [x] Add filter memory snapshots and session restore
  - Scope: local snapshot history + restore controls
  - Done when: operators can recover previous triage context quickly
- [x] Add detail drawer width slider with persistence
  - Scope: drawer layout controls
  - Done when: review density can be adjusted to monitor size and retained
- [x] Add detail navigator shortcuts (`next unchecked`, `next missing photo`)
  - Scope: drawer navigation actions
  - Done when: quality gaps are reviewable as a dedicated sequence
- [x] Add action-log center controls (type filter/search/retention/collapse/CSV export)
  - Scope: operation log panel and export handler
  - Done when: recent actions can be filtered, summarized, and exported for audit
- [x] Add mobile filter drawer + bottom action bar for archive workflows
  - Scope: responsive controls and mobile UX shell
  - Done when: triage actions remain reachable on narrow screens
- [x] Add accessibility preference toggles (color-blind mode, focus contrast, font scale, SR compact)
  - Scope: UI preference state + root class application
  - Done when: accessibility display preferences are user-configurable and persisted
- [x] Add incremental archive list rendering with explicit load-more
  - Scope: list rendering pipeline
  - Done when: large filtered lists remain responsive while preserving full access

## Verification (Phase M)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase N: UI Hundred-Challenge Wave 1

### P0 (Command and navigation layer)

- [x] Add command palette modal with action search and execution
  - Scope: archive admin header + modal interaction layer
  - Done when: operators can trigger common actions from a single searchable command panel
- [x] Add `Ctrl/Cmd+K` shortcut to open command palette
  - Scope: global keyboard shortcut handler
  - Done when: keyboard-first operators can open command center instantly
- [x] Add command-level favorite action pinning
  - Scope: command action metadata + local storage persistence
  - Done when: favorite quick actions are pinned and persisted across sessions
- [x] Add quick action execution hub card
  - Scope: overview action panel
  - Done when: favorite actions are runnable in one click without opening menus
- [x] Add recent-view quick apply row
  - Scope: saved view integration
  - Done when: latest saved views are accessible as direct buttons

### P1 (Triage and feedback efficiency)

- [x] Add search history persistence and replay selector
  - Scope: archive search panel + local storage
  - Done when: recent search terms can be recalled and reused quickly
- [x] Add no-result smart recovery actions
  - Scope: empty-state card actions
  - Done when: users can clear search/quick filters/exclude status directly from empty state
- [x] Add Ops Inbox modal with unread badge
  - Scope: operation log derived alert center
  - Done when: warning/error operations are visible in dedicated inbox with unread count
- [x] Add unread tracking for Ops Inbox
  - Scope: local read checkpoint persistence
  - Done when: unread count reflects new warning/error events since last inbox open
- [x] Add recent operations replay affordance
  - Scope: quick action card + action log mapping
  - Done when: selected recent operation types can be replayed as mapped quick actions

### P2 (Accessibility and density controls)

- [x] Add archive density mode `dense`
  - Scope: filter model + card render class + CSS
  - Done when: cards support a denser visual mode for high-volume scans
- [x] Add UI preference `Reduce Motion`
  - Scope: UI prefs model + root class + CSS motion overrides
  - Done when: transitions/animations are effectively minimized for sensitive users
- [x] Add UI preference `Spacing` (`normal` / `tight`)
  - Scope: UI prefs model + root class + CSS spacing control
  - Done when: layout spacing can be compacted globally for information density
- [x] Add onboarding “UI Tour” modal
  - Scope: operator guidance entrypoint
  - Done when: key workflow hints are available in-page for onboarding and refresh
- [x] Add floating back-to-top affordance
  - Scope: page-level navigation utility
  - Done when: long archive sessions can quickly return to top controls

## Verification (Phase N)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase O: UI Hundred-Challenge Wave 2

### P0 (Workspace orchestration)

- [x] Add workspace module stack with per-module anchor IDs
  - Scope: `CleaningInspectionAdminContainer` archive panel modules
  - Done when: every primary module (`workspace/system_health/quick_start/overview/ui_preferences/quick_actions/search/batch/results/logs`) can be jumped to and controlled
- [x] Add persisted module ordering impact to render order
  - Scope: module-order state + order-style application
  - Done when: module move up/down in workspace control changes actual page ordering
- [x] Add module-level show/hide coverage for all major blocks
  - Scope: module visibility checks wrapping archive modules
  - Done when: hidden modules are fully removed from render tree until re-enabled

### P1 (Night operations and discoverability)

- [x] Add night-review visual treatment
  - Scope: inspection admin root + card variants in `sparkery-legacy.css`
  - Done when: enabling night-review mode applies a distinct low-glare visual layer across control cards
- [x] Add search syntax hint for key:value triage
  - Scope: search card inline hint copy
  - Done when: users can discover `status:/assignee:/id:/tag:/address:/customer:/oneoff:` syntax without docs

### P2 (Recall and continuity)

- [x] Add “Recent Opened” modal for fast context return
  - Scope: header action + modal list + detail/open/copy link actions
  - Done when: users can reopen recently reviewed inspections and clear history when needed
- [x] Add workspace module control visual grid styling
  - Scope: `sparkery-legacy.css` module-control styles
  - Done when: module controls are readable and compact across desktop/mobile

## Verification (Phase O)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase P: UI Hundred-Challenge Wave 3 (Kickoff)

### P0 (Navigation and control context)

- [x] Add header breadcrumb for context hierarchy
  - Scope: `CleaningInspectionAdminContainer` header shell
  - Done when: operators can see current page hierarchy (`Sparkery / Inspection Admin`) at a glance
- [x] Add keyboard-accessible skip link to main content
  - Scope: inspection admin root + main module container anchor
  - Done when: keyboard/screen-reader users can jump directly to main content area
- [x] Add module directory quick-nav row
  - Scope: header module directory
  - Done when: visible modules can be jumped to from one compact directory bar
- [x] Add quick playbook/docs entry in header
  - Scope: header action cluster
  - Done when: operators can open docs in one click without leaving workflow context

### P1 (Operational signal refinement)

- [x] Add refresh-source labeling (`Initial` / `Manual` / `Auto Focus` / `Auto Interval`)
  - Scope: archive refresh lifecycle + cloud meta strip
  - Done when: last refresh provenance is visible for troubleshooting stale/lagging data
- [x] Add dedicated `Today Focus` module
  - Scope: archive module stack and module controls
  - Done when: high-priority records (overdue/due today/no-assignee/missing photos) are surfaced in a dedicated action panel
- [x] Extend filter conflict hints
  - Scope: filter hint engine
  - Done when: date-range reversal and search/filter token conflicts are explicitly warned in UI

### P2 (Results readability and grouping)

- [x] Add results grouping control (`none/status/assignee/date`)
  - Scope: search/filter panel + local persistence
  - Done when: list-mode results can be grouped by operational dimension without losing existing filters
- [x] Add grouped list rendering with section headers and counts
  - Scope: list render path
  - Done when: grouped results show clear headers and local item counts before cards

## Verification (Phase P)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase Q: UI Hundred-Challenge Wave 3 (Execution Batch 1)

### P0 (Prioritization and flow control)

- [x] Add `Today Priority` ranking mode (`Off / Soft / Hard`)
  - Scope: archive filter panel + mobile filter drawer + sort pipeline
  - Done when: operators can switch urgency-aware ordering without breaking pinned/starred/reviewed behavior
- [x] Persist `Today Priority` mode and URL query state
  - Scope: local storage key + storage sync + URL parameter sync
  - Done when: priority mode survives refresh and can be shared/recovered from query state

### P1 (Results ergonomics)

- [x] Add sticky results toolbar with operational quick actions
  - Scope: results module top strip
  - Done when: visible/total/group/collapsed/prioritization context and quick actions are always reachable while scrolling
- [x] Add grouped list collapse/expand interactions
  - Scope: grouped list headers + group state controls
  - Done when: each group can be collapsed independently and all groups can be collapsed/expanded in one click
- [x] Add grouped collapsed-state hint rendering
  - Scope: grouped list card body fallback
  - Done when: collapsed groups display explicit hint instead of disappearing silently
- [x] Add mobile sticky group headers for grouped lists
  - Scope: `sparkery-legacy.css` mobile media query
  - Done when: grouped list headers remain visible while scrolling long mobile groups

### P2 (Diagnosis and accessibility)

- [x] Add empty-state diagnostic signal tags
  - Scope: no-match empty state card
  - Done when: users can see why results are empty (search/filter/advanced conflicts) and recover faster
- [x] Add one-click priority reset in empty state
  - Scope: no-match empty state actions
  - Done when: urgency ranking can be cleared immediately when it contributes to confusion
- [x] Add missing aria-label coverage for icon-only archive actions
  - Scope: pin/star/review/delete icon buttons
  - Done when: screen-reader users receive actionable labels for all key icon-only controls

## Verification (Phase Q)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase R: UI Hundred-Challenge Wave 3 (Execution Batch 2)

### P0 (Filter discoverability and speed)

- [x] Add search preset quick chips
  - Scope: search module under syntax hint
  - Done when: operators can inject common triage tokens (`status:pending`, `oneoff:true`, etc.) with one click
- [x] Add active-filter bar with per-chip clear
  - Scope: results module toolbar area
  - Done when: currently applied filters are visible and each can be removed independently without reopening full controls

### P1 (Results operations)

- [x] Add results-toolbar quick risk toggles
  - Scope: sticky results toolbar
  - Done when: `Overdue / Due Today / No Assignee / Missing Photos` can be toggled directly from the results top area
- [x] Add grouped header high-priority count tag
  - Scope: grouped list section headers
  - Done when: each group surfaces high-priority item count before opening items

### P2 (Mobile flow)

- [x] Add mobile filter drawer `Clear & Close`
  - Scope: bottom filter drawer actions
  - Done when: users can fully reset filter context and dismiss drawer in one action
- [x] Add mobile filter drawer `Apply & Top`
  - Scope: bottom filter drawer primary action
  - Done when: applying filters returns users to top context for faster list scan
- [x] Add active-filter bar responsive styling
  - Scope: `sparkery-legacy.css` mobile media rules
  - Done when: active filter chips remain readable and non-overflowing on narrow screens

## Verification (Phase R)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase S: UI Hundred-Challenge Wave 3 (Execution Batch 3)

### P0 (Results command density)

- [x] Add results-toolbar quick view controls
  - Scope: sticky results toolbar
  - Done when: layout/density/sort can be changed from the results top bar without returning to the full filter grid
- [x] Add active-filter count indicator
  - Scope: results toolbar status tags
  - Done when: operators can read how many filters are currently constraining the result set

### P1 (Grouped execution speed)

- [x] Add grouped header selection controls
  - Scope: grouped list header actions
  - Done when: each group supports one-click select/clear for all member inspections
- [x] Add grouped header `Only This Group` shortcut
  - Scope: grouped list header actions
  - Done when: operators can focus the current group context directly into filters/search

### P2 (Mobile touch efficiency)

- [x] Add mobile action-bar selected count badge
  - Scope: mobile action bar selection control
  - Done when: current selection volume is visible without opening batch panel
- [x] Add responsive behavior for results-toolbar selects
  - Scope: `sparkery-legacy.css` mobile media rules
  - Done when: toolbar select controls collapse to full width on mobile and avoid overflow

## Verification (Phase S)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase T: UI Hundred-Challenge Wave 3 (Execution Batch 4)

### P0 (Grouped execution focus)

- [x] Add grouped-list focus state with visual highlight
  - Scope: grouped list containers
  - Done when: active group focus is visible and stable while operating on many groups
- [x] Add grouped-list next/previous focus controls
  - Scope: results toolbar + keyboard shortcuts
  - Done when: operators can jump group focus using toolbar buttons and `Ctrl/Cmd+Shift+J/K`

### P1 (Filter-to-view speed path)

- [x] Add active-filter quick-save view action
  - Scope: active filter bar
  - Done when: operators can save the current filtered context without typing a name every time
- [x] Add pinned-view quick apply inside active filter area
  - Scope: active filter bar secondary row
  - Done when: pinned saved views are available as one-click shortcuts near current filters

### P2 (No-result recovery UX)

- [x] Add contextual empty-state recovery actions
  - Scope: empty-state action row
  - Done when: users can directly recover with targeted actions (`Last 7 Days`, clear advanced filters, ungroup, detach saved view)
- [x] Add selected-visible summary in results toolbar
  - Scope: results toolbar status tags
  - Done when: current visible selection ratio is always readable during triage

## Verification (Phase T)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase U: Report HTML Beautification & Print Hardening

### P0 (Cross-report visual baseline)

- [x] Upgrade export diagnostic HTML report visual system
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: summary cards, issue cards, print-ready layout, and severity hierarchy are consistently rendered
- [x] Upgrade CLI diagnostic HTML renderer
  - Scope: `src/cli/diagnostic.ts`
  - Done when: generated HTML has responsive summary grid, typed issue cards, and printable hero/header behavior

### P1 (Business report template quality)

- [x] Improve China procurement report cover readability
  - Scope: `src/utils/chinaProcurementPdfTemplate.ts`
  - Done when: cover includes attachment/coverage/line-item summary strip and footer generation timestamp
- [x] Improve cleaning inspection cover signal density
  - Scope: `src/utils/cleaningInspectionPdfTemplate.ts`
  - Done when: cover includes checklist completion, completion rate, required-photo missing count, and damage count

### P2 (Quote/receipt template UX)

- [x] Add quote/receipt summary strip and table accessibility upgrades
  - Scope: `src/pages/Sparkery/quoteCalculator/BrisbaneQuoteCalculatorContainer.tsx`
  - Done when: quote and custom receipt/quote templates include summary cards + table aria labels + stronger responsive behavior
- [x] Harden report print window open strategy
  - Scope: `src/pages/Sparkery/quoteCalculator/BrisbaneQuoteCalculatorContainer.tsx`, `src/utils/chinaProcurementPdfTemplate.ts`, `src/utils/cleaningInspectionPdfTemplate.ts`
  - Done when: print windows open with safer flags and report wrappers include stronger document metadata

## Phase V: Report HTML Operator Experience Upgrade

### P0 (Diagnostic report triage speed)

- [x] Add interactive severity filtering and keyword search in CLI diagnostic HTML
  - Scope: `src/cli/diagnostic.ts`
  - Done when: users can filter `error/warning/info`, search issues by text, and read visible-count feedback in-page
- [x] Add visible-issue export action for focused troubleshooting handoff
  - Scope: `src/cli/diagnostic.ts`
  - Done when: filtered issue set can be exported as plain text without re-running scan

### P1 (Report generator navigation and discoverability)

- [x] Add grouped issue navigation sidebar for generated HTML reports
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: issue groups are directly reachable via anchor navigation
- [x] Add generated-report toolbar with severity filters + keyword search
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: large reports can be narrowed without losing grouped structure

### P2 (Print behavior consistency)

- [x] Add print fallback behavior for filtered views
  - Scope: `src/cli/diagnostic.ts`, `src/utils/reportGenerator.ts`
  - Done when: print action renders all issues even if page is currently filtered

## Verification (Phase V)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed

## Phase W: Report HTML Operator Controls Wave 2

### P0 (Bulk navigation controls)

- [x] Add grouped issue bulk collapse/expand controls
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: users can compress large issue groups and restore in one click

### P1 (Filtered handoff export)

- [x] Add generated-report visible issue export action
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: current filter result can be exported as plain text for developer handoff

### P2 (Collapsed-state UX and print safety)

- [x] Add collapsed-group hint rendering and filter-aware visibility handling
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: collapsed mode stays understandable and hidden groups follow filter results correctly
- [x] Preserve/restore collapse state around print lifecycle
  - Scope: `src/utils/reportGenerator.ts`
  - Done when: print output always includes full visible content and UI state returns after print

## Verification (Phase W)

- `npx tsc -p tsconfig.app.json --noEmit --incremental false` passed
- `npm run build --silent` passed
