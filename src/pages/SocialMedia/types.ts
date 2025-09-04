/**
 * Social Media Dashboard Type Definitions
 * 社交媒体仪表板类型定义
 */

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
export type WorkflowType =
  | 'scheduled'
  | 'webhook'
  | 'manual'
  | 'event'
  | 'social-media'
  | 'rednote-content-generator';

/**
 * 工作流信息接口
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
 * 工作流执行接口
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
}

/**
 * 社交媒体数据接口
 */
export interface SocialMediaData {
  id: string;
  platform: 'reddit' | 'twitter' | 'facebook' | 'instagram';
  title: string;
  content: string;
  author: string;
  score?: number;
  comments?: number;
  shares?: number;
  url: string;
  createdAt: string;
  tags?: string[];
}

/**
 * Reddit数据接口
 */
export interface RedditData {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
  subreddit: string;
  thumbnail?: string;
}

/**
 * 小红书文案生成相关类型定义
 */
export interface RedNoteContentRequest {
  id: string;
  inputContent: string;
  contentType: string;
  tone: string;
  writingTechnique: string;
  successFactor: string;
  targetAudience?: string;
  keywords?: string[];
  createdAt: string;
}

export interface RedNoteContentResponse {
  id: string;
  requestId: string;
  generatedContent: string;
  title: string;
  hashtags: string[];
  googleSheetUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface RedNoteWorkflowSettings {
  name: string;
  description: string;
  webhookUrl: string;
  googleSheetId?: string;
  autoSave: boolean;
  maxContentLength: number;
}
