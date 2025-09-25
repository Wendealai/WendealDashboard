/**
 * Information Dashboard module type definitions
 * Defines interfaces and types related to information display
 */

// Import API types for consistency
import type { ApiResponse, PaginatedResponse } from '../../services';

// Re-export API types for consistency
export type { ApiResponse, PaginatedResponse };

/**
 * Page route parameter types
 */
export interface InformationDashboardParams {
  tab?: string;
  workflowId?: string;
}

/**
 * Page state types
 */
export interface InformationDashboardState {
  loading: boolean;
  error: string | null;
  activeTab: string;
}

/**
 * Workflow status enumeration
 */
export type WorkflowStatus = 'active' | 'inactive' | 'error' | 'pending';

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus =
  | 'running'
  | 'success'
  | 'failed'
  | 'waiting'
  | 'cancelled';

/**
 * Workflow types
 */
export type WorkflowType =
  | 'scheduled'
  | 'webhook'
  | 'manual'
  | 'event'
  | 'invoice-ocr';

/**
 * Workflow basic information
 */
export interface WorkflowInfo {
  id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  lastExecution?: string;
  nextExecutionAt?: string;
  executionCount: number;
  successRate: number;
  nodeCount?: number;
  tags?: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * Workflow alias for compatibility
 */
export type Workflow = WorkflowInfo;

/**
 * Workflow trigger request alias for compatibility
 */
export type WorkflowTriggerRequest = TriggerWorkflowRequest;

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  errorMessage?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  logs?: WorkflowLog[];
}

/**
 * Workflow log
 */
export interface WorkflowLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  nodeName?: string;
  data?: Record<string, any>;
}

/**
 * Workflow trigger request
 */
export interface TriggerWorkflowRequest {
  workflowId: string;
  inputData?: Record<string, any>;
  data?: string;
  waitTill?: boolean;
  waitForCompletion?: boolean;
}

/**
 * Workflow trigger response
 */
export interface TriggerWorkflowResponse {
  executionId: string;
  status: WorkflowExecutionStatus;
  message?: string;
}

/**
 * Reddit workflow response
 */
export interface RedditWorkflowResponse {
  success: boolean;
  posts?: any[];
  subreddits?: any[];
  stats?: any;
  metadata?: any;
  headerInfo?: any;
  summary?: any;
  message?: string;
  timestamp?: string;
  validSubreddits?: any;
  totalSubreddits?: number;
  messageLength?: number;
  apiSource?: any;
}

/**
 * Information data item
 */
export interface InformationItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'number' | 'date' | 'url' | 'json' | 'image';
  category: string;
  source: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'archived' | 'draft';
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * Information data query parameters
 */
export interface InformationQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  type?: InformationItem['type'];
  priority?: InformationItem['priority'];
  status?: InformationItem['status'];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Information data statistics
 */
export interface InformationStats {
  total: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  recentCount: number;
  trendData: {
    date: string;
    count: number;
  }[];
}

/**
 * Workflow statistics
 */
export interface WorkflowStats {
  total: number;
  active: number;
  inactive: number;
  error: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  executionTrend: {
    date: string;
    count: number;
    successCount: number;
    failedCount: number;
  }[];
}

/**
 * Dashboard data
 */
export interface DashboardData {
  workflowStats: WorkflowStats;
  informationStats: InformationStats;
  recentExecutions: WorkflowExecution[];
  recentInformation: InformationItem[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    lastCheck: string;
    issues?: string[];
  };
}

/**
 * Redux state types
 */
export interface InformationDashboardReduxState {
  // Workflow related state
  workflows: {
    list: WorkflowInfo[];
    loading: boolean;
    error: string | null;
    pagination: {
      current: number;
      pageSize: number;
      total: number;
    };
  };

  // Workflow execution related state
  executions: {
    list: WorkflowExecution[];
    loading: boolean;
    error: string | null;
    activeExecution: WorkflowExecution | null;
  };

  // Information data related state
  information: {
    list: InformationItem[];
    loading: boolean;
    error: string | null;
    pagination: {
      current: number;
      pageSize: number;
      total: number;
    };
    filters: InformationQueryParams;
  };

  // Statistics data state
  dashboard: {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
  };

  // UI state
  ui: {
    activeTab: string;
    selectedWorkflow: string | null;
    selectedInformation: string | null;
    sidebarCollapsed: boolean;
    refreshing: boolean;
  };
}

/**
 * API response types
 */
export type WorkflowListResponse = ApiResponse<PaginatedResponse<WorkflowInfo>>;
export type WorkflowExecutionResponse = ApiResponse<WorkflowExecution>;
export type InformationListResponse = ApiResponse<
  PaginatedResponse<InformationItem>
>;
export type DashboardDataResponse = ApiResponse<DashboardData>;
export type TriggerWorkflowApiResponse = ApiResponse<TriggerWorkflowResponse>;

/**
 * Component Props types
 */
export interface WorkflowPanelProps {
  workflows: WorkflowInfo[];
  loading: boolean;
  onTrigger: (workflowId: string, inputData?: Record<string, any>) => void;
  onRefresh: () => void;
  onViewDetails: (workflowId: string) => void;
}

export interface InformationGridProps {
  data: InformationItem[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: InformationQueryParams;
  onPageChange: (page: number, pageSize: number) => void;
  onFilterChange: (filters: InformationQueryParams) => void;
  onRefresh: () => void;
  onViewDetails: (item: InformationItem) => void;
}

export interface DashboardStatsProps {
  workflowStats: WorkflowStats;
  informationStats: InformationStats;
  loading: boolean;
  onRefresh: () => void;
}

/**
 * Form types
 */
export interface WorkflowTriggerFormData {
  workflowId: string;
  inputData: Record<string, any>;
  waitForCompletion: boolean;
}

export interface InformationFilterFormData {
  search: string;
  category: string;
  type: InformationItem['type'] | '';
  priority: InformationItem['priority'] | '';
  status: InformationItem['status'] | '';
  tags: string[];
  dateRange: [string, string] | null;
}

// Invoice OCR 相关类型导出
export * from './types/invoiceOCR';
