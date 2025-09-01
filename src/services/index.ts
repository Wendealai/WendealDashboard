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
export * from './auth';
export * from './dashboard';
export * from './notification';
export * from './dashboardService';

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
