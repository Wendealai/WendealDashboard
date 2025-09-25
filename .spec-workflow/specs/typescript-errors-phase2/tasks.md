# Tasks: Fix Remaining TypeScript Compilation Errors (Phase 2)

## Overview
This document contains all remaining TypeScript compilation errors that need to be fixed. Errors are organized by category and file for systematic resolution.

## Task Organization

### Priority Order
1. **Critical**: Errors blocking build (TS7030, TS2322, TS2345, TS2554)
2. **High**: Type safety issues (TS18048, TS2532, TS2339, TS2551)
3. **Medium**: Code quality issues (TS6133, TS6196, TS7006, TS7053)
4. **Low**: Strict mode violations (TS2375, TS2353, TS1484, TS1294)

---

## Function Return Path Errors (TS7030)

### - [ ] Fix App.tsx function return type error
**File**: `src/App.tsx:57`
**Error**: Not all code paths return a value
**Description**: Function has conditional logic but missing return statement
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the function return path error in App.tsx line 57. Analyze the function logic and ensure all code paths return appropriate values. Do not change the function's intended behavior.

### - [ ] Fix useInvoiceOCR.ts function return path error
**File**: `src/hooks/useInvoiceOCR.ts:463`
**Error**: Not all code paths return a value
**Description**: Function with conditional logic missing return statement
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the function return path error in useInvoiceOCR.ts line 463. Ensure all conditional branches return appropriate values while preserving the hook's functionality.

### - [ ] Fix useModal.ts function return path error
**File**: `src/hooks/useModal.ts:149`
**Error**: Not all code paths return a value
**Description**: Modal hook function missing return in some paths
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the function return path error in useModal.ts line 149. Analyze the modal logic and ensure all code paths return proper values.

### - [ ] Fix LoginPage.tsx function return path error
**File**: `src/pages/Auth/LoginPage.tsx:21`
**Error**: Not all code paths return a value
**Description**: Login page function missing return statement
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the function return path error in LoginPage.tsx line 21. Ensure the login validation function returns appropriate values for all cases.

### - [ ] Fix ReportViewer.tsx function return path error
**File**: `src/pages/RNDReport/components/ReportViewer.tsx:844`
**Error**: Not all code paths return a value
**Description**: Report viewer function missing return in conditional logic
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the function return path error in ReportViewer.tsx line 844. Ensure all code paths in the report processing logic return appropriate values.

### - [ ] Fix ReportViewer.tsx function return path error (2)
**File**: `src/pages/RNDReport/components/ReportViewer.tsx:1022`
**Error**: Not all code paths return a value
**Description**: Second function return path error in ReportViewer
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the second function return path error in ReportViewer.tsx line 1022. Analyze the function logic and add missing return statements.

---

## Unused Code Cleanup (TS6133, TS6196)

### - [ ] Remove unused imports in WebhookTest.tsx
**File**: `src/components/WebhookTest.tsx:3`
**Error**: 'useTranslation' is declared but its value is never read
**Description**: Remove unused useTranslation import
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'useTranslation' import from WebhookTest.tsx line 3. Ensure the component still functions correctly without translation.

### - [ ] Remove unused variables in DataDisplayGrid.tsx
**Files**: `src/components/reddit/DataDisplayGrid.tsx`
**Errors**:
- Line 21: 'message' is declared but its value is never read
- Line 24: 'Spin' is declared but its value is never read
- Line 29: 'SearchOutlined' is declared but its value is never read
- Line 40: 'CloseCircleOutlined' is declared but its value is never read
- Line 96: 'searchText' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and variables from DataDisplayGrid.tsx. Keep only the imports and variables that are actually used in the component.

### - [ ] Remove unused imports in WebhookDiagnostic.tsx
**Files**: `src/components/reddit/WebhookDiagnostic.tsx`
**Errors**:
- Line 11: 'Spin' is declared but its value is never read
- Line 25: 'Title' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused 'Spin' and 'Title' imports from WebhookDiagnostic.tsx while preserving component functionality.

### - [ ] Remove unused imports in WebhookTestPage.tsx
**Files**: `src/components/reddit/WebhookTestPage.tsx`
**Errors**:
- Line 13: 'Spin' is declared but its value is never read
- Line 15: 'Divider' is declared but its value is never read
- Line 25: 'Title' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused imports from WebhookTestPage.tsx. Keep only the imports that are actually used.

### - [ ] Remove unused imports in WorkflowControlPanel.tsx
**Files**: `src/components/reddit/WorkflowControlPanel.tsx`
**Errors**:
- Line 11: 'Row' is declared but its value is never read
- Line 12: 'Col' is declared but its value is never read
- Line 14: 'Divider' is declared but its value is never read
- Line 16: 'Tooltip' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused Ant Design component imports from WorkflowControlPanel.tsx.

### - [ ] Remove unused variables in WorkflowGrid.tsx
**File**: `src/components/workflow/WorkflowGrid.tsx:98`
**Error**: 'workflowProgressStates' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'workflowProgressStates' variable from WorkflowGrid.tsx.

### - [ ] Remove unused variables in WorkflowSettingsModal.tsx
**File**: `src/components/workflow/WorkflowSettingsModal.tsx:233`
**Error**: 'changedValues' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'changedValues' variable from WorkflowSettingsModal.tsx.

### - [ ] Remove unused imports in AuthContext.tsx
**File**: `src/components/contexts/AuthContext.tsx:13`
**Error**: 'selectAuth' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'selectAuth' import from AuthContext.tsx.

### - [ ] Remove unused variables in useInvoiceOCR.ts
**Files**: `src/hooks/useInvoiceOCR.ts`
**Errors**:
- Line 66: 'selectInvoiceOCR' is declared but its value is never read
- Line 80: 'InvoiceOCRSettings' is declared but never used
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused imports and type declarations from useInvoiceOCR.ts.

### - [ ] Remove unused variables in useAuth.ts
**File**: `src/hooks/useAuth.ts:3`
**Error**: 'User' is declared but never used
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'User' type import from useAuth.ts.

### - [ ] Remove unused imports in useNotifications.ts
**File**: `src/hooks/useNotifications.ts:2`
**Error**: '"../types/notification"' has no exported member named 'NotificationItem'
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix the incorrect import in useNotifications.ts and remove any unused imports.

### - [ ] Remove unused imports in useRedditDataPersistence.ts
**File**: `src/hooks/useRedditDataPersistence.ts:1`
**Error**: 'useEffect' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'useEffect' import from useRedditDataPersistence.ts.

### - [ ] Remove unused imports in useWorkflowSettings.ts
**File**: `src/hooks/useWorkflowSettings.ts:6`
**Error**: 'updateWorkflowSettings' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove the unused 'updateWorkflowSettings' import from useWorkflowSettings.ts.

### - [ ] Remove unused imports in handlers.ts
**File**: `src/mocks/handlers.ts:2`
**Error**: '"../types/notification"' has no exported member named 'NotificationItem'
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix the incorrect import in handlers.ts and remove unused processingOptions variable.

### - [ ] Remove unused imports in AuthLayout.tsx
**File**: `src/pages/Auth/AuthLayout.tsx:5`
**Error**: 'UserOutlined' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused imports from AuthLayout.tsx.

### - [ ] Remove unused imports in LoginPage.tsx
**File**: `src/pages/Auth/LoginPage.tsx:3`
**Error**: 'Divider' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused 'Divider' import from LoginPage.tsx.

### - [ ] Remove unused imports in ProfilePage.tsx
**File**: `src/pages/Auth/ProfilePage.tsx:15`
**Error**: RequireRoleProps interface issue
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix the RequireRoleProps interface issue and remove unused variables in ProfilePage.tsx.

### - [ ] Remove unused imports in Dashboard index.tsx
**Files**: `src/pages/Dashboard/index.tsx`
**Errors**:
- Line 17: 'Divider' is declared but its value is never read
- Line 22: 'Column' is declared but its value is never read
- Line 40: 'MessageOutlined' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports from Dashboard index.tsx.

### - [ ] Remove unused imports in InformationDashboard.tsx
**Files**: `src/pages/InformationDashboard/InformationDashboard.tsx`
**Errors**:
- Line 21: 'ApiOutlined' is declared but its value is never read
- Line 29: 'PlayCircleOutlined' is declared but its value is never read
- Line 47: 'Paragraph' is declared but its value is never read
- Line 125: 'redditError' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and variables from InformationDashboard.tsx.

### - [ ] Remove unused imports in InvoiceOCRPage.tsx
**Files**: `src/pages/InformationDashboard/InvoiceOCRPage.tsx`
**Errors**:
- Line 35: 'Statistic' is declared but its value is never read
- Line 39: 'Badge' is declared but its value is never read
- Line 53: 'ExclamationCircleOutlined' is declared but its value is never read
- Line 64: 'InvoiceOCRBatchTask' is declared but never used
- Line 69: 'Step' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and type declarations from InvoiceOCRPage.tsx.

### - [ ] Remove unused imports in AirtableTable.tsx
**Files**: `src/pages/InformationDashboard/components/AirtableTable.tsx`
**Errors**:
- Line 18: 'Input' is declared but its value is never read
- Line 24: 'ShopOutlined' is declared but its value is never read
- Line 39: 'TableSort' is declared but never used
- Line 40: 'TablePagination' is declared but never used
- Line 42: All imports in import declaration are unused
- Line 48: 'Title' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and type declarations from AirtableTable.tsx.

### - [ ] Remove unused imports in InformationGrid.tsx
**Files**: `src/pages/InformationDashboard/components/InformationGrid.tsx`
**Errors**:
- Line 32: 'SearchOutlined' is declared but its value is never read
- Line 52-54: Import errors for InformationType, InformationPriority, InformationStatus
- Line 59: 'RangePicker' is declared but its value is never read
- Line 80: 'stats' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix import errors and remove unused imports from InformationGrid.tsx.

### - [ ] Remove unused imports in InputForm.tsx
**Files**: `src/pages/InformationDashboard/components/InputForm.tsx`
**Errors**:
- Line 8: 'tkWebhookService' is declared but its value is never read
- Line 25: 'Title' is declared but its value is never read
- Line 42: 't' is declared but its value is never read
- Line 92: 'industryOptions' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and variables from InputForm.tsx.

### - [ ] Remove unused imports in InvoiceFileUpload.tsx
**Files**: `src/pages/InformationDashboard/components/InvoiceFileUpload.tsx`
**Errors**:
- Line 48: 'notification' is declared but its value is never read
- Line 70: 'InvoiceOCRSettings' is declared but never used
- Line 73-75: Invoice file type imports unused
- Line 76: 'InvoiceOCRProcessingOptions' import error
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix import errors and remove unused imports from InvoiceFileUpload.tsx.

### - [ ] Remove unused imports in InvoiceOCRCard.tsx
**File**: `src/pages/InformationDashboard/components/InvoiceOCRCard.tsx:55`
**Error**: 'PlayCircleOutlined' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused 'PlayCircleOutlined' import from InvoiceOCRCard.tsx.

### - [ ] Remove unused imports in InvoiceOCRResults.tsx
**Files**: `src/pages/InformationDashboard/components/InvoiceOCRResults.tsx`
**Errors**:
- Line 46: 'Alert' is declared but its value is never read
- Line 79: 'TableOutlined' is declared but its value is never read
- Line 81: 'FileExcelOutlined' is declared but its value is never read
- Line 90: 'InvoiceOCRStatus' is declared but never used
- Line 92-94: Multiple unused type imports
- Line 107: 'Paragraph' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and type declarations from InvoiceOCRResults.tsx.

### - [ ] Remove unused imports in InvoiceOCRSettings.tsx
**File**: `src/pages/InformationDashboard/components/InvoiceOCRSettings.tsx:29`
**Error**: 'Text' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused 'Text' import from InvoiceOCRSettings.tsx.

### - [ ] Remove unused imports in ResultPanel.tsx
**Files**: `src/pages/InformationDashboard/components/ResultPanel.tsx`
**Errors**:
- Line 16: 'Alert' is declared but its value is never read
- Line 18: 'Row' is declared but its value is never read
- Line 19: 'Col' is declared but its value is never read
- Line 28: 'ShareAltOutlined' is declared but its value is never read
- Line 34: 'Title' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports from ResultPanel.tsx.

### - [ ] Remove unused imports in SmartOpportunities.tsx
**Files**: `src/pages/InformationDashboard/components/SmartOpportunities.tsx`
**Errors**:
- Line 24: 'onDataLoaded' is declared but its value is never read
- Line 25: 'onError' is declared but its value is never read
- Line 27: 't' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused parameters and variables from SmartOpportunities.tsx.

### - [ ] Remove unused imports in WorkflowPanel.tsx
**Files**: `src/pages/InformationDashboard/components/WorkflowPanel.tsx`
**Errors**:
- Line 6: 'useMemo' is declared but its value is never read
- Line 9: 'Card' is declared but its value is never read
- Line 10: 'Button' is declared but its value is never read
- Line 12: 'Space' is declared but its value is never read
- Line 16: 'Tooltip' is declared but its value is never read
- Line 17: 'Row' is declared but its value is never read
- Line 18: 'Col' is declared but its value is never read
- Line 19: 'List' is declared but its value is never read
- Line 21: 'Alert' is declared but its value is never read
- Line 22: 'Progress' is declared but its value is never read
- Line 23: 'Empty' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused React and Ant Design imports from WorkflowPanel.tsx.

### - [ ] Remove unused imports in WorkflowSidebar.tsx
**Files**: `src/pages/InformationDashboard/components/WorkflowSidebar.tsx`
**Errors**:
- Line 26: 'selectWorkflowStats' is declared but its value is never read
- Line 29: 'Workflow' import error
- Line 35: All destructured elements are unused
- Line 45: 'RedditWorkflowResponse' not found
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix import errors and remove unused imports from WorkflowSidebar.tsx.

### - [ ] Remove unused imports in types.ts
**File**: `src/pages/InformationDashboard/types.ts:274`
**Error**: 'ApiResponse' and 'PaginatedResponse' not found
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix the missing type imports in InformationDashboard types.ts.

### - [ ] Remove unused imports in NotFound index.tsx
**File**: `src/pages/NotFound/index.tsx:7`
**Error**: 'Text' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused 'Text' import from NotFound index.tsx.

### - [ ] Remove unused imports in NotificationDemo.tsx
**Files**: `src/pages/NotificationDemo/NotificationDemo.tsx`
**Errors**:
- Line 25: 'setCurrentUser' is declared but its value is never read
- Line 27: 'settings' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused variables from NotificationDemo.tsx.

### - [ ] Remove unused imports in Profile index.tsx
**Files**: `src/pages/Profile/index.tsx`
**Errors**:
- Line 76: Unused avatar file variables
- Line 159: 'values' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused variables from Profile index.tsx.

### - [ ] Remove unused imports in RAGSystem components
**Files**: `src/pages/RAGSystem/components/RAGChat.tsx`, `src/pages/RAGSystem/components/RAGToolbar.tsx`
**Errors**:
- RAGChat.tsx: 'Card' and 'Text' unused
- RAGToolbar.tsx: 'CloudUploadOutlined' unused
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused imports from RAGSystem components.

### - [ ] Remove unused imports in RNDReport RNDReport.tsx
**Files**: `src/pages/RNDReport/RNDReport.tsx`
**Errors**:
- Line 42: 'Alert' is declared but its value is never read
- Line 50: 'PlusOutlined' is declared but its value is never read
- Line 61: 'ReportSettings' is declared but its value is never read
- Line 75: 'useAppSelector' is declared but its value is never read
- Line 86: 'dispatch' is declared but its value is never read
- Line 863: 'categoryId' is declared but its value is never read
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove all unused imports and variables from RNDReport.tsx.

### - [ ] Remove unused imports in RNDReport components
**Files**: `src/pages/RNDReport/components/CategoryManager.tsx`, `src/pages/RNDReport/components/ReportList.tsx`, `src/pages/RNDReport/components/ReportSettings.tsx`, `src/pages/RNDReport/components/ReportViewer.tsx`, `src/pages/RNDReport/components/UploadConfirmationDialog.tsx`, `src/pages/RNDReport/components/UploadZone.tsx`
**Errors**: Multiple unused imports across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, systematically remove all unused imports and variables from RNDReport components.

### - [ ] Remove unused imports in Settings index.tsx
**File**: `src/pages/Settings/index.tsx:25`
**Error**: 'ThemeMode' is declared but never used
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused 'ThemeMode' import from Settings index.tsx.

### - [ ] Remove unused imports in SocialMedia components
**Files**: Multiple SocialMedia component files
**Errors**: Extensive unused imports across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, systematically clean up all unused imports from SocialMedia components.

### - [ ] Remove unused imports in Tools components
**Files**: Multiple Tools component files
**Errors**: Extensive unused imports across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, systematically clean up all unused imports from Tools components.

### - [ ] Remove unused imports in services
**Files**: `src/services/airtableService.ts`, `src/services/auth/ClerkAuthService.ts`, `src/services/notionWebhookServer.ts`, `src/services/tkViralExtractAirtableService.ts`, `src/services/workflowService.ts`
**Errors**: Multiple unused variables in service files
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused variables from service files.

### - [ ] Remove unused imports in utils
**Files**: `src/utils/codeCleanup/BackupManager.ts`, `src/utils/codeCleanup/CodeAnalyzer.ts`, `src/utils/exportConfig.ts`, `src/utils/rndReportUtils.ts`
**Errors**: Multiple unused imports and type issues
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, fix type import issues and remove unused imports from utility files.

### - [ ] Remove unused imports in router
**File**: `src/router/routes.ts`
**Errors**: Unused component imports
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a code quality specialist, remove unused component imports from routes.ts.

---

## Type Assignment Errors (TS2322)

### - [ ] Fix ThemeContext.tsx type assignment error
**File**: `src/contexts/ThemeContext.tsx:204`
**Error**: Type 'CustomTheme | undefined' is not assignable to type 'CustomTheme'
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the type assignment error in ThemeContext.tsx line 204. Ensure the theme value is properly typed and not undefined.

### - [ ] Fix Profile index.tsx type assignment error
**File**: `src/pages/Profile/index.tsx:86`
**Error**: Type translation result not assignable to string
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix the type assignment error in Profile index.tsx line 86. Handle the translation function result properly.

---

## Argument Type Mismatches (TS2345, TS2554)

### - [ ] Fix useWorkflowSettings.ts argument errors
**Files**: `src/hooks/useWorkflowSettings.ts`
**Errors**:
- Line 136: Expected 1-2 arguments, but got 0
- Line 137: Argument type mismatch
- Line 138: Argument type mismatch
- Line 159: Property 'isValid' does not exist
- Line 160: Property 'errors' does not exist
- Line 165: Expected 2-3 arguments, but got 1
- Line 220: Expected 1-2 arguments, but got 0
- Line 221: Argument type mismatch
- Line 222: Argument type mismatch
- Line 241: Property access errors
- Line 256: Return type mismatch
- Line 276: Argument type mismatch
- Line 277: Argument type mismatch
- Line 307: Parameter type issues
- Line 318: Property access errors
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all argument type mismatches and function call errors in useWorkflowSettings.ts. Ensure proper parameter passing and return types.

### - [ ] Fix Dashboard index.tsx argument errors
**Files**: `src/pages/Dashboard/index.tsx`
**Errors**:
- Line 103: Implicit any type in array
- Line 122: Variable implicitly has any type
- Line 136: Implicit any type in array
- Line 138: Unused variable
- Line 178: Variable implicitly has any type
- Line 417: 'dataIndex' does not exist in type 'ExportColumn'
- Line 422: 'dataIndex' does not exist in type 'ExportColumn'
- Line 427: 'dataIndex' does not exist in type 'ExportColumn'
- Line 432: 'dataIndex' does not exist in type 'ExportColumn'
- Line 437: 'dataIndex' does not exist in type 'ExportColumn'
- Line 573: Parameter implicitly has any type
- Line 656: 'smooth' does not exist on chart component
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all type errors in Dashboard index.tsx including implicit any types, property access errors, and chart configuration issues.

### - [ ] Fix InformationDashboard component errors
**Files**: Multiple InformationDashboard component files
**Errors**: Extensive type errors across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, systematically fix all type errors in InformationDashboard components including property access, argument mismatches, and type assignments.

### - [ ] Fix RNDReport component errors
**Files**: Multiple RNDReport component files
**Errors**: Extensive type errors across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, systematically fix all type errors in RNDReport components including property access, argument mismatches, and type assignments.

### - [ ] Fix SocialMedia component errors
**Files**: Multiple SocialMedia component files
**Errors**: Extensive type errors across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, systematically fix all type errors in SocialMedia components including property access, argument mismatches, and type assignments.

### - [ ] Fix Tools component errors
**Files**: Multiple Tools component files
**Errors**: Extensive type errors across all components
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, systematically fix all type errors in Tools components including property access, argument mismatches, and type assignments.

---

## Property Access Errors (TS2339, TS2551)

### - [ ] Fix all property access errors
**Files**: All files with TS2339 and TS2551 errors
**Errors**: Properties do not exist on types, incorrect property names
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all property access errors across the codebase. Use optional chaining, type guards, and correct property names to resolve these issues.

---

## Undefined Access Errors (TS18048, TS2532)

### - [ ] Fix all undefined access errors
**Files**: All files with TS18048 and TS2532 errors
**Errors**: Accessing potentially undefined values
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all undefined access errors using null checks, optional chaining, and proper type guards.

---

## Implicit Any Types (TS7006, TS7053)

### - [ ] Fix all implicit any type errors
**Files**: All files with TS7006 and TS7053 errors
**Errors**: Parameters and variables without explicit types
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, add explicit type annotations to all parameters and variables that currently have implicit any types.

---

## Strict Optional Properties (TS2375)

### - [ ] Fix exactOptionalPropertyTypes errors
**Files**: All files with TS2375 errors
**Errors**: exactOptionalPropertyTypes violations
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all exactOptionalPropertyTypes violations by properly handling undefined values in optional properties.

---

## Object Literal Errors (TS2353)

### - [ ] Fix object literal property errors
**Files**: All files with TS2353 errors
**Errors**: Unknown properties in object literals
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all object literal property errors by updating interfaces or using type assertions where appropriate.

---

## Import/Export Errors (TS2724, TS2305, TS2307)

### - [ ] Fix all import/export errors
**Files**: All files with import/export errors
**Errors**: Missing exports, incorrect import paths, module resolution issues
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix all import and export errors by correcting paths, adding missing exports, and ensuring proper module resolution.

---

## Type-Only Import Issues (TS1484)

### - [ ] Fix type-only import violations
**Files**: All files with TS1484 errors
**Errors**: verbatimModuleSyntax violations
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, convert regular imports to type-only imports where appropriate and fix verbatimModuleSyntax violations.

---

## Unknown Type Errors (TS18046)

### - [ ] Fix unknown type access errors
**Files**: All files with TS18046 errors
**Errors**: Variables typed as unknown requiring assertions
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, add proper type assertions or type guards for variables typed as unknown.

---

## Comparison Type Errors (TS2367)

### - [ ] Fix type comparison errors
**Files**: All files with TS2367 errors
**Errors**: Type comparisons that never match
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix type comparison logic to use proper type guards and valid comparisons.

---

## Spread Type Errors (TS2698)

### - [ ] Fix spread operation errors
**Files**: All files with TS2698 errors
**Errors**: Invalid spread syntax
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix spread operation syntax to ensure proper object/array spreading.

---

## Syntax Errors (TS1294)

### - [ ] Fix erasableSyntaxOnly errors
**Files**: All files with TS1294 errors
**Errors**: erasableSyntaxOnly violations
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a TypeScript specialist, fix erasableSyntaxOnly violations by using proper syntax for erasable types.

---

## Final Validation

### - [ ] Run final TypeScript compilation check
**Description**: Ensure all errors are resolved and build succeeds
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a QA specialist, run full TypeScript compilation and verify zero errors. Ensure build completes successfully with exit code 0.

### - [ ] Push final changes to GitHub
**Description**: Commit and push all fixes to repository
**_Prompt**: Implement the task for spec typescript-errors-phase2, first run spec-workflow-guide to get the workflow guide then implement the task: As a DevOps specialist, commit all TypeScript error fixes with descriptive message and push to GitHub master branch.