# Sparkery i18n Migration TODO

Goal

- Enforce strict language separation for Sparkery (English or Chinese only per active language).
- Integrate with global top-right language switch (`i18next` current language).
- Default language remains English (`en-US`).

Rules

- No mixed labels like `English / 中文` in the same rendered UI for a single language mode.
- No hardcoded end-user UI text in migrated files.
- Use translation keys under `sparkery.*`.

Status legend

- `pending`: not started
- `in_progress`: currently refactoring
- `done`: migrated to i18n and checked

## Phase 1: Sparkery shell + Dispatch suite

- [done] `src/pages/Sparkery/index.tsx`
- [done] `src/pages/Sparkery/DispatchDashboard.tsx`
- [done] `src/pages/Sparkery/DispatchFinanceDashboard.tsx`
- [done] `src/pages/Sparkery/DispatchEmployeeTasksPage.tsx`
- [done] `src/pages/Sparkery/components/dispatch/DispatchFiltersBar.tsx`
- [done] `src/pages/Sparkery/components/dispatch/WeeklyFinanceBoard.tsx`
- [done] `src/pages/Sparkery/components/dispatch/FinanceAgingBoard.tsx`
- [done] `src/pages/Sparkery/components/dispatch/CashflowForecastBoard.tsx`
- [done] `src/pages/Sparkery/components/dispatch/WeeklyDispatchBoard.tsx`
- [done] `src/pages/Sparkery/components/dispatch/DispatchAdminSetupModal.tsx`
- [done] `src/pages/Sparkery/components/dispatch/DispatchJobFormModal.tsx`
- [done] `src/pages/Sparkery/components/dispatch/DispatchMapPlanner.tsx`
- [done] `src/pages/Sparkery/DispatchRecurringTemplatesPage.tsx`
- [done] `src/pages/Sparkery/DispatchLocationReport.tsx`
- [done] `src/pages/Sparkery/DispatchWeekPlan.tsx`
- [done] `src/pages/Sparkery/components/ReimbursementPage.tsx`

## Phase 2: Quote and submission pages

- [done] `src/pages/Sparkery/BrisbaneQuoteCalculator.tsx`
- [done] `src/pages/Sparkery/BondCleanQuoteSubmissions.tsx`
- [done] `src/pages/Sparkery/BondCleanQuoteForm.tsx`
- [done] `src/pages/Sparkery/BondCleanQuoteFormCN.tsx`

## Phase 3: Inspection and procurement pages

- [done] `src/pages/Sparkery/CleaningInspectionAdmin.tsx`
- [done] `src/pages/Sparkery/ChinaProcurementReport.tsx`

## Locale resources

- [done] `src/locales/en-US.ts` add `sparkery` namespace keys
- [done] `src/locales/zh-CN.sparkery-overrides.ts` add safe Chinese overrides for new Sparkery pages
- [done] `src/locales/zh-CN.ts` Sparkery keys aligned at runtime via deep merge in `src/locales/index.ts`

## Verification

- [done] review/update text-assertion tests under Sparkery
- [done] run lint on changed files
- [done] run TypeScript build
