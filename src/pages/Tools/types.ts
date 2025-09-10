/**
 * Tools module type definitions
 * Defines interfaces and types related to tools functionality
 */

// Re-export API types for consistency
export type { ApiResponse, PaginatedResponse } from '../../services';

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
export interface Workflow {
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
  nodeCount?: number;
}

/**
 * Workflow trigger request
 */
export interface TriggerWorkflowRequest {
  workflowId: string;
  inputData?: Record<string, any>;
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
