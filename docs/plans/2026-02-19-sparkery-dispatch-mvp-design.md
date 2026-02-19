# Sparkery Dispatch MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Phase-1 Sparkery dispatch MVP: weekly scheduling board + basic job assignment workflow.

**Architecture:** Frontend-first vertical slice with typed models, `localStorage` mock service, Redux Toolkit async thunks, and a dedicated Dispatch dashboard page wired into Sparkery routes/tabs.

**Tech Stack:** React 18, TypeScript, Ant Design, Redux Toolkit, Jest/RTL, Vite.

---

## MVP Scope

- Include: weekly board (7 days), create/edit jobs, assign/reassign staff, status flow (`pending` → `assigned` → `in_progress` → `completed`/`cancelled`).
- Include: simple staff availability state (`available`/`off`).
- Exclude: Google Maps route optimization, drag-and-drop timeline, vehicle module, DB migration.

---

### Task 1: Domain Types

**Files**

- Create: `src/pages/Sparkery/dispatch/types.ts`
- Test: `src/pages/Sparkery/dispatch/__tests__/types.compile.test.ts`

**Steps**

1. Write failing type usage test for `DispatchJob` required fields.
2. Run: `npm run test:run -- src/pages/Sparkery/dispatch/__tests__/types.compile.test.ts` (expect fail).
3. Implement types: `DispatchJob`, `DispatchEmployee`, `EmployeeSchedule`, `DispatchFilters`, enums/unions for service/status/priority.
4. Re-run test (expect pass).

---

### Task 2: Mock Dispatch Service

**Files**

- Create: `src/services/sparkeryDispatchService.ts`
- Test: `src/services/__tests__/sparkeryDispatchService.test.ts`

**Steps**

1. Write failing tests for CRUD + assignment + status update.
2. Run targeted test (expect fail).
3. Implement service methods:
   - `getJobs({ weekStart, weekEnd })`
   - `createJob`, `updateJob`, `deleteJob`
   - `assignJob`, `updateJobStatus`
   - `getEmployees`, `upsertEmployeeSchedule`
4. Persist to `localStorage` with seeded default employees.
5. Re-run test (expect pass).

---

### Task 3: Redux Slice

**Files**

- Create: `src/store/slices/sparkeryDispatchSlice.ts`
- Modify: `src/store/index.ts`
- Test: `src/store/slices/__tests__/sparkeryDispatchSlice.test.ts`

**Steps**

1. Write failing tests for initial state + fulfilled reducers.
2. Add thunks: `fetchDispatchJobs`, `fetchDispatchEmployees`, `createDispatchJob`, `updateDispatchJob`, `assignDispatchJob`, `updateDispatchJobStatus`, `deleteDispatchJob`.
3. Add reducers/selectors: week/filter/error + grouped-by-day selector.
4. Register reducer as `sparkeryDispatch` in store.
5. Re-run tests (expect pass).

---

### Task 4: Dispatch Dashboard UI

**Files**

- Create: `src/pages/Sparkery/DispatchDashboard.tsx`
- Create: `src/pages/Sparkery/components/dispatch/DispatchJobFormModal.tsx`
- Create: `src/pages/Sparkery/components/dispatch/WeeklyDispatchBoard.tsx`
- Create: `src/pages/Sparkery/components/dispatch/DispatchFiltersBar.tsx`
- Test: `src/pages/Sparkery/__tests__/DispatchDashboard.test.tsx`

**Steps**

1. Write failing UI tests: 7-day columns, create job flow, assignment reflection.
2. Implement page:
   - week selector + refresh
   - pending/unassigned jobs list
   - daily board with job cards
   - modal form (title/customer/service/property/date/time/priority)
   - status action buttons
3. Connect to Redux thunks and success/error messages.
4. Re-run tests (expect pass).

---

### Task 5: Route + Sparkery Entry Integration

**Files**

- Modify: `src/router/routes.ts`
- Modify: `src/pages/Sparkery/index.tsx`
- Test: `src/router/__tests__/sparkeryDispatchRoutes.test.ts`

**Steps**

1. Add routes:
   - `/sparkery/dispatch`
   - `/sparkery/schedule` (same dashboard for MVP)
   - `/sparkery/staff` (placeholder or hidden)
2. Add Sparkery tab entry for Dispatch.
3. Re-run route tests (expect pass).

---

### Task 6: Verification + Checklist

**Files**

- Create: `docs/plans/2026-02-19-sparkery-dispatch-mvp-checklist.md`

**Steps**

1. Run: `npm run build` (expect pass).
2. Run targeted tests for service/slice/dashboard/route.
3. Manual QA:
   - create jobs across different days
   - assign/reassign staff
   - status transitions
   - refresh persistence (`localStorage`)
   - no Sparkery tab regressions

---

## Guardrails

- Do not change `BrisbaneQuoteCalculator` behavior in this feature branch.
- Keep state serializable and selectors pure.
- Keep implementation YAGNI for MVP; no route optimization logic now.
