# Multi-Angle Optimization Todo List

Updated: 2026-02-24  
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
