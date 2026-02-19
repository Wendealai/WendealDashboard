import { configureStore } from '@reduxjs/toolkit';
import userSlice from './slices/userSlice';
import uiSlice from './slices/uiSlice';
import dashboardSlice from './slices/dashboardSlice';
import authSlice from './slices/authSlice';
import informationDashboardSlice from './slices/informationDashboardSlice';
import redditWorkflowSlice from './slices/redditWorkflowSlice';
import invoiceOCRSlice from './slices/invoiceOCRSlice';
import sparkeryDispatchSlice from './slices/sparkeryDispatchSlice';

export const store = configureStore({
  reducer: {
    user: userSlice,
    ui: uiSlice,
    dashboard: dashboardSlice,
    auth: authSlice,
    informationDashboard: informationDashboardSlice,
    redditWorkflow: redditWorkflowSlice,
    invoiceOCR: invoiceOCRSlice,
    sparkeryDispatch: sparkeryDispatchSlice,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'auth/login/fulfilled',
          'auth/login/rejected',
          'auth/register/rejected',
          'auth/logout/rejected',
          'auth/refreshToken/rejected',
          'auth/getCurrentUser/rejected',
          'auth/updateProfile/rejected',
          'auth/changePassword/rejected',
          'auth/validateToken/rejected',
          'auth/initialize/rejected',
          'auth/initialize/fulfilled',
        ],
        ignoredActionsPaths: [
          'payload.details',
          'payload.user.createdAt',
          'payload.user.updatedAt',
          'payload.user.lastLoginAt',
          'payload.sessionExpiry',
        ],
        ignoredPaths: [
          'auth.error.details',
          'auth.user.createdAt',
          'auth.user.updatedAt',
          'auth.user.lastLoginAt',
          'auth.sessionExpiry',
          'auth.lastActivity',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 在开发环境下将store暴露到window对象，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__REDUX_STORE__ = store;
}

// Export actions
export { userSlice } from './slices/userSlice';
export { uiSlice } from './slices/uiSlice';

// Export reddit workflow slice and actions
export {
  redditWorkflowSlice,
  fetchWorkflowStatus,
  fetchWorkflowStats,
  executeWorkflowAction,
  fetchRedditPosts,
  searchRedditPosts,
  fetchRedditStats,
  fetchAvailableSubreddits,
  clearRedditCache,
  // Actions
  setActiveTab,
  setSelectedPost,
  setSidebarCollapsed,
  setAutoRefresh,
  setAutoRefreshInterval,
  setDataFilters,
  setDataSort,
  resetDataFilters,
  setCurrentPage,
  setPageSize,
  updateWorkflowConfig,
  setWorkflowConfig,
  addWorkflowEvent,
  setEventListening,
  clearEvents,
  clearWorkflowError,
  clearDataError,
  clearError,
  setRefreshing,
  // Selectors
  selectRedditWorkflow,
  selectWorkflowStatus,
  selectWorkflowConfig,
  selectWorkflowStats,
  selectWorkflowLogs,
  selectWorkflowLoading,
  selectWorkflowError,
  selectRedditPosts,
  selectDataLoading,
  selectDataError,
  selectDataPagination,
  selectDataFilters,
  selectDataSort,
  selectUIState,
  selectActiveTab,
  selectSelectedPost,
  selectSidebarCollapsed,
  selectAutoRefresh,
  selectAutoRefreshInterval,
  selectRefreshing,
  selectWorkflowEvents,
  selectEventListening,
  selectError,
  selectRedditLoading,
  selectRedditStats,
} from './slices/redditWorkflowSlice';

// Export dashboard slice and actions
export {
  default as dashboardSlice,
  loadDashboardStats,
  loadRecentActivities,
  loadSystemStatus,
  refreshAllDashboardData,
} from './slices/dashboardSlice';

// Export information dashboard slice and actions
export {
  default as informationDashboardSlice,
  fetchWorkflows,
  triggerWorkflow,
  fetchWorkflowExecutions,
  fetchInformationList,
  fetchDashboardData,
  // Selectors
  selectWorkflows,
  selectExecutions,
  selectInformation,
  selectDashboard,
  selectUI,
  selectWorkflowsLoading,
  selectExecutionsLoading,
  selectInformationLoading,
  selectDashboardLoading,
  selectWorkflowsList,
  selectExecutionsList,
  selectInformationList,
  selectDashboardData,
  selectSelectedWorkflow,
  selectSelectedInformation,
  selectWorkflowsError,
  selectExecutionsError,
  selectInformationError,
  selectDashboardError,
  selectWorkflowsPagination,
  selectInformationPagination,
  selectInformationFilters,
  selectInformationData,
  selectLoading,
  selectInformationStats,
  selectActiveExecution,
  selectDashboardLastUpdated,
} from './slices/informationDashboardSlice';

// Export auth slice and actions
export {
  default as authSlice,
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  validateToken,
  initializeAuth,
  clearError as clearAuthError,
  updateLastActivity,
  setLoading,
  clearAuthState,
  setAuthStrategy,
  setSessionExpiry,
  setUser,
  setTokens,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  selectToken,
  selectRefreshToken,
  selectLastActivity,
  selectSessionExpiry,
  selectAuthStrategy,
  selectUserPermissions,
  selectUserRole,
  selectIsSessionExpired,
  selectIsSessionExpiringSoon,
  getAuthService,
} from './slices/authSlice';

// Export Invoice OCR slice and actions
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
  // Actions
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
  resetState as resetInvoiceOCRState,
  // Selectors
  selectInvoiceOCRState,
  selectInvoiceOCRState as selectInvoiceOCR,
  selectInvoiceOCRWorkflows,
  selectCurrentInvoiceOCRWorkflow,
  selectCurrentInvoiceOCRWorkflow as selectActiveWorkflow,
  selectInvoiceOCRResults,
  selectCurrentInvoiceOCRResult,
  selectCurrentInvoiceOCRResult as selectCurrentResult,
  selectInvoiceOCRStatistics,
  selectInvoiceOCRExecutions,
  selectInvoiceOCRBatchTasks,
  selectCurrentInvoiceOCRBatchTask,
  selectCurrentInvoiceOCRBatchTask as selectCurrentBatchTask,
  selectInvoiceOCRLoading,
  selectInvoiceOCRErrors,
  selectInvoiceOCRErrors as selectInvoiceOCRError,
  selectUploadProgress,
} from './slices/invoiceOCRSlice';

// Export Sparkery Dispatch slice and actions
export {
  default as sparkeryDispatchSlice,
  fetchDispatchJobs,
  fetchDispatchEmployees,
  createDispatchJob,
  updateDispatchJob,
  assignDispatchJob,
  updateDispatchJobStatus,
  deleteDispatchJob,
  setSelectedWeekStart as setDispatchSelectedWeekStart,
  setFilters as setDispatchFilters,
  clearDispatchError,
  selectDispatchState,
  selectDispatchJobs,
  selectDispatchEmployees,
  selectDispatchWeekRange,
  selectDispatchJobsByDate,
} from './slices/sparkeryDispatchSlice';
