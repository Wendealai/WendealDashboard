/**
 * Workflow related type definitions
 * 工作流相关类型定义
 */

/**
 * 工作流状态枚举
 */
export type WorkflowStatus = 'active' | 'inactive' | 'error';

/**
 * 工作流信息接口
 */
export interface Workflow {
  /** 工作流ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流状态 */
  status: WorkflowStatus;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 工作流类型 */
  type?: string;
  /** 工作流配置 */
  settings?: Record<string, any>;
  /** 统计信息 */
  statistics?: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    averageProcessingTime: number;
    lastProcessedAt?: string;
  };
}

/**
 * 工作流触发请求接口
 */
export interface WorkflowTriggerRequest {
  /** 工作流ID */
  workflowId: string;
  /** 输入数据 */
  data?: Record<string, any>;
  /** 是否等待完成 */
  waitTill?: boolean;
}

/**
 * 工作流执行结果接口
 */
export interface WorkflowExecutionResult {
  /** 执行ID */
  executionId: string;
  /** 工作流ID */
  workflowId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 执行结果 */
  result?: Record<string, any>;
  /** 错误信息 */
  error?: string;
}

/**
 * 工作流统计信息接口
 */
export interface WorkflowStats {
  /** 总工作流数 */
  totalWorkflows: number;
  /** 活跃工作流数 */
  activeWorkflows: number;
  /** 今日执行数 */
  executionsToday: number;
  /** 成功率 */
  successRate: number;
}
