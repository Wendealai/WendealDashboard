// Export service modules
export { default as ApiService } from './api';
export { default as AuthService } from './auth';
export { default as DashboardService } from './dashboard';
export { default as NotificationService } from './notification';

// 导出工作流验证服务
export {
  WorkflowValidationService,
  workflowValidationService,
  validateWorkflowSettings,
  validateWorkflowName,
  validateWebhookUrl,
  validateWebhookConnectivity,
} from './workflowValidationService';

// Workflow settings service
export {
  WorkflowSettingsService,
  workflowSettingsService,
  getWorkflowSettings,
  saveWorkflowSettings,
  updateWorkflowSettings,
  validateWorkflowSettings as validateWorkflowSettingsData,
  resetWorkflowSettings,
} from './workflowSettingsService';

export * from './api';
export type { ApiResponse, PaginatedResponse } from './api';
export * from './auth';
export * from './notification';
export {
  fetchDashboardStats,
  fetchRecentActivities,
  fetchSystemStatus,
  refreshDashboardData,
} from './dashboardService';

// 导出认证服务接口
export type {
  IAuthService,
  IAuthServiceFactory,
  IAuthServiceProvider,
} from './auth/IAuthService';

// 导出认证服务实现
export { LocalAuthService } from './auth/LocalAuthService';
export { ClerkAuthService } from './auth/ClerkAuthService';

// 导出权限管理服务
export { PermissionService, permissionService } from './auth/PermissionService';
export {
  hasPermission,
  hasRole,
  canAccessRoute,
  canPerformAction,
  isAdmin,
  isManagerOrAbove,
  isEmployeeOrAbove,
} from './auth/PermissionService';

// 导出RAG API服务
export { ragApiService } from './ragApi';
export type { RAGMessage, RAGResponse, FileUploadResponse } from './ragApi';

// 导出其他服务
export { invoiceOCRService } from './invoiceOCRService';
export { workflowService } from './workflowService';
export { informationService } from './informationService';
export { redditWebhookService } from './redditWebhookService';
export { n8nWebhookService } from './n8nWebhookService';
export type { ParsedSubredditData } from './redditWebhookService';
export type { ActivityItem } from './dashboardService';
