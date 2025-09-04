// Export TypeScript type definitions
// Example:
// export type { User } from './user';
// export type { ApiResponse } from './api';
// export type { Theme } from './theme';

// 工作流设置相关类型
export type {
  WorkflowSettings,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  WorkflowSettingsModalState,
  WorkflowSettingsFormData,
  WorkflowSettingsResponse,
  UpdateWorkflowSettingsRequest,
  WorkflowSettingsConfig,
  WorkflowSettingsEventType,
  WorkflowSettingsEvent,
} from './workflow';

// 通知相关类型
export {
  type NotificationItem,
  type NotificationCenterProps,
} from './notification';

// Reddit工作流相关类型
export type {
  RedditPost,
  WorkflowStatus,
  WorkflowLog,
  RedditWorkflowConfig,
  RedditWorkflowStats,
  RedditDataFilter,
  RedditDataSort,
  RedditWorkflowPageState,
  RedditApiResponse,
  WorkflowAction,
  WorkflowEventType,
  WorkflowEvent,
} from './reddit';

// 认证相关类型
export type {
  User,
  UserRole,
  Permission,
  AuthState,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  AuthService,
  PermissionChecker,
  RoleChecker,
  AuthContextType,
  RouteGuardConfig,
  ClerkUserData,
  AuthStrategy,
  AuthConfig,
  SessionInfo,
  AuthErrorType,
  AuthError,
} from './auth';

// 导出一致性系统相关类型
export type {
  SourceLocation,
  ExportInfo,
  ConsistencyIssue,
  ConsistencyIssueType,
  IssueSeverity,
  FileChange,
  FixSuggestion,
  FixResult,
  AnalysisSummary,
  ProjectAnalysisResult,
  ScanOptions,
  FileInfo,
  FileMetadata,
  ExportRule,
  ExportConfig,
  // ValidationResult, // Removed - duplicate with workflow.ts
  ParsedExport,
  NamingIssue,
  MatchingIssue,
  ProjectInfo,
  ConsistencyReport,
  FixOptions,
  ReportFormat,
  ReportSummary,
} from './export';
