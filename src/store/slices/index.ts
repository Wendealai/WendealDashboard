// Export all slices
export {
  userSlice,
  setUser,
  clearUser,
  setLoading as setUserLoading,
  setError as setUserError,
  clearError as clearUserError,
} from './userSlice';
export {
  uiSlice,
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  setLoading as setUILoading,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
} from './uiSlice';
export {
  default as invoiceOCRSlice,
  fetchInvoiceOCRWorkflows,
  createInvoiceOCRWorkflow,
  updateInvoiceOCRWorkflow,
  deleteInvoiceOCRWorkflow,
  uploadAndProcessFiles,
  fetchInvoiceOCRResults,
  fetchInvoiceOCRStatistics,
  fetchInvoiceOCRExecutions,
  setSelectedWorkflow,
  setSelectedResults,
  toggleResultSelection,
  setFilterParams,
  setPagination,
  updateUploadProgress,
  clearUploadProgress,
  setCurrentWorkflow,
  setCurrentResult,
  setCurrentBatchTask,
  clearErrors,
  selectInvoiceOCRState,
  selectInvoiceOCRWorkflows,
  selectCurrentInvoiceOCRWorkflow,
  selectInvoiceOCRResults,
  selectInvoiceOCRStatistics,
  selectInvoiceOCRExecutions,
  selectInvoiceOCRBatchTasks,
  selectInvoiceOCRLoading,
  selectInvoiceOCRErrors,
} from './invoiceOCRSlice';

// Export types
export type { default as UserState } from './userSlice';
export type { default as UIState } from './uiSlice';
export type { InvoiceOCRState } from './invoiceOCRSlice';
