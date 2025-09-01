/**
 * 信息展示模块类型定义
 * 定义信息展示相关的接口和类型
 */

// 重新导出API类型以保持一致性
export type { ApiResponse, PaginatedResponse } from '../../services/api';

/**
 * 页面路由参数类型
 */
export interface InformationDashboardParams {
  tab?: string;
  workflowId?: string;
}

/**
 * 页面状态类型
 */
export interface InformationDashboardState {
  loading: boolean;
  error: string | null;
  activeTab: string;
}

/**
 * 工作流状态枚举
 */
export type WorkflowStatus = 'active' | 'inactive' | 'error' | 'pending';

/**
 * 工作流执行状态
 */
export type WorkflowExecutionStatus =
  | 'running'
  | 'success'
  | 'failed'
  | 'waiting'
  | 'cancelled';

/**
 * 工作流类型
 */
export type WorkflowType = 'scheduled' | 'webhook' | 'manual' | 'event';

/**
 * 工作流基础信息
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
  nextExecutionAt?: string;
  executionCount: number;
  successRate: number;
  tags?: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * 工作流执行记录
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
 * 工作流日志
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
 * 工作流触发请求
 */
export interface TriggerWorkflowRequest {
  workflowId: string;
  inputData?: Record<string, any>;
  waitForCompletion?: boolean;
}

/**
 * 工作流触发响应
 */
export interface TriggerWorkflowResponse {
  executionId: string;
  status: WorkflowExecutionStatus;
  message?: string;
}

/**
 * 信息数据项
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
 * 信息数据查询参数
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
 * 信息数据统计
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
 * 工作流统计
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
 * 仪表盘数据
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
 * Redux状态类型
 */
export interface InformationDashboardReduxState {
  // 工作流相关状态
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

  // 工作流执行相关状态
  executions: {
    list: WorkflowExecution[];
    loading: boolean;
    error: string | null;
    activeExecution: WorkflowExecution | null;
  };

  // 信息数据相关状态
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

  // 统计数据状态
  dashboard: {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
  };

  // UI状态
  ui: {
    activeTab: string;
    selectedWorkflow: string | null;
    selectedInformation: string | null;
    sidebarCollapsed: boolean;
    refreshing: boolean;
  };
}

/**
 * API响应类型
 */
export type WorkflowListResponse = ApiResponse<PaginatedResponse<WorkflowInfo>>;
export type WorkflowExecutionResponse = ApiResponse<WorkflowExecution>;
export type InformationListResponse = ApiResponse<
  PaginatedResponse<InformationItem>
>;
export type DashboardDataResponse = ApiResponse<DashboardData>;
export type TriggerWorkflowApiResponse = ApiResponse<TriggerWorkflowResponse>;

/**
 * 组件Props类型
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
 * 表单类型
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
