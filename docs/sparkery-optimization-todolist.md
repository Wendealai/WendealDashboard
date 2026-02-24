# Sparkery Optimization Todo List

Updated: 2026-02-24
Status keys:

- `[ ]` not started
- `[-]` in progress
- `[x]` completed

## Phase 0: Execution Baseline

- [x] Create optimization backlog and implementation order
- [x] Define acceptance criteria for each task and track progress in this file

## Phase 1: Architecture and Performance (P0)

- [x] Implement lazy loading for Sparkery tab pages to reduce initial JS payload
  - Scope: `src/pages/Sparkery/index.tsx`
  - Done when: inactive tabs are not loaded on first render
- [x] Split `BrisbaneQuoteCalculator` into container + hooks + modules
  - Scope: `src/pages/Sparkery/BrisbaneQuoteCalculator.tsx`
  - Done when: main file is under 1500 lines and critical logic has focused tests
- [x] Split `sparkeryDispatchService` into API/Mapper/Domain layers
  - Scope: `src/services/sparkeryDispatchService.ts`
  - Done when: main file is under 1200 lines with unchanged external behavior
- [x] Add virtualization/render chunking for dispatch-heavy pages
  - Scope: `src/pages/Sparkery/DispatchWeekPlan.tsx` and related pages
  - Done when: large datasets keep smooth scrolling and interaction

## Phase 2: Data Reliability and Consistency (P0/P1)

- [x] Strengthen offline queue with exponential backoff, jitter, dead letter queue, idempotency key
  - Scope: `src/pages/Sparkery/dispatch/offlineQueue.ts`
  - Done when: retries are controlled and terminal failures are inspectable
- [x] Add runtime schema validation at service boundaries
  - Scope: `src/services/*` (start with Sparkery/Dispatch services)
  - Done when: critical API input/output has runtime validation
- [x] Remove `any` leaks in Sparkery critical paths
  - Scope: `src/pages/Sparkery/**`, `src/services/**`
  - Done when: key business flow types are explicit end to end

## Phase 3: Template and Maintainability (P1)

- [x] Move quote/receipt generation to a template engine with versioning
  - Scope: `src/pages/Sparkery/BrisbaneQuoteCalculator.tsx` and template modules
  - Done when: adding templates does not require core workflow changes
- [x] Modularize Sparkery styles
  - Scope: `src/pages/Sparkery/sparkery.css`
  - Done when: style domains are separated and low-coupled

## Phase 4: Database and Security (P1/P2)

- [x] Strengthen Dispatch Finance DB policy (RLS/audit/index strategy)
  - Scope: `docs/supabase/dispatch-finance.sql` and Supabase policies
  - Done when: least-privilege access and auditable critical changes are in place
- [x] Remove secret-like build ARG/ENV exposure
  - Scope: `Dockerfile`, `nixpacks.toml`, deployment variable strategy
  - Done when: build logs stop reporting secrets warnings

## Phase 5: Testing and Observability (P1)

- [x] Rebuild testing pyramid: build-smoke / contract / nightly e2e
  - Scope: `src/__tests__`, `jest*.config.js`
  - Done when: deployment is blocked only by high-value failures
- [x] Add Sparkery telemetry on critical flows
  - Scope: quote generation, offline sync, dispatch submit paths
  - Done when: success/failure rates and latency are visible

## Current Batch Status

1. Sparkery tab lazy loading `[x]`
2. Offline queue hardening `[x]`
3. Dispatch render chunking `[x]`
4. Runtime schema validation for dispatch service `[x]`
5. CI testing pyramid rollout `[x]`
6. Dispatch finance SQL hardening `[x]`
7. Sparkery telemetry instrumentation `[x]`
8. Brisbane quote config extraction `[x]`
9. Dispatch service domain split entrypoint `[x]`
10. Type, lint, smoke, contract validation `[x]`
11. Dispatch service API/Mapper layer extraction `[x]`
12. Quote template engine contract tests `[x]`
13. Sparkery style entry modularization `[x]`
14. Dispatch map planner `any` cleanup `[x]`

## Batch 1 Verification

- `npm run typecheck --silent` passed
- `npx eslint src/pages/Sparkery/index.tsx src/pages/Sparkery/dispatch/offlineQueue.ts` passed

## Batch 2 Verification

- `npm run typecheck --silent` passed
- `npx eslint src/pages/Sparkery/DispatchWeekPlan.tsx src/pages/Sparkery/dispatch/offlineQueue.ts src/services/sparkeryDispatchService.ts src/services/sparkeryTelemetry.ts src/pages/Sparkery/BrisbaneQuoteCalculator.tsx src/pages/Sparkery/quoteCalculatorConfig.ts src/__tests__/smoke/dispatchService.smoke.test.ts src/__tests__/contract/offlineQueue.contract.test.ts src/__tests__/contract/sparkeryTelemetry.contract.test.ts` passed
- `npm run test:pyramid --silent` passed

## Batch 3 Verification

- `npm run typecheck --silent` passed
- `npx eslint src/services/sparkeryDispatchService.ts src/services/sparkeryDispatch/domainService.ts` passed
- `npm run test:pyramid --silent` passed

## Batch 4 Verification

- `npm run typecheck --silent` passed
- `npx eslint src/pages/Sparkery/components/dispatch/DispatchMapPlanner.tsx src/pages/Sparkery/quoteCalculator/templateEngine.ts src/pages/Sparkery/quoteCalculator/BrisbaneQuoteCalculatorContainer.tsx src/services/sparkeryDispatch/domainService.ts src/services/sparkeryDispatch/apiLayer.ts src/services/sparkeryDispatch/mapperLayer.ts src/services/sparkeryDispatchService.ts src/__tests__/contract/quoteTemplateEngine.contract.test.ts` passed
- `npm run test:pyramid --silent` passed
- `npm run build --silent` passed
