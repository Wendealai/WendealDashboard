/**
 * Social Media Dashboard Type Definitions
 * 社交媒体仪表板类型定义 - 兼容Information Dashboard
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
 * 工作流信息接口 - 与Information Dashboard兼容
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  type?: WorkflowType;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  lastExecution?: string;
  nodeCount?: number;
}

/**
 * 工作流信息接口 - 兼容性别名
 */
export interface WorkflowInfo extends Workflow {
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

// TK Viral Extract related types
export interface ViralContentRecord {
  id: string;
  fields: {
    title?: string;
    content?: string;
    platform?: string;
    views?: number;
    likes?: number;
    shares?: number;
    industry?: string;
    city?: string;
    country?: string;
    creator?: string;
    viralScore?: number;
    url?: string;
    contactInfo?: string;
  };
  createdTime: string;
}

export interface TKViralExtractProps {
  onParametersChange?: (parameters: WorkflowParameters) => void;
  onDataLoaded?: (data: ViralContentRecord[]) => void;
  onError?: (error: Error) => void;
}

export interface WorkflowParameters {
  keyword: string;        // 检索关键词
  offset?: string;        // 偏移量
  count?: string;         // 数量
  sortMethod?: string;    // 排序方法 (0相关度 1最多点赞)
  timeRange?: string;     // 发布时间范围 (0不限制 1最近1天 7最近7天等)
}

export interface SimplifiedInputFormProps {
  value: WorkflowParameters;
  onSubmit: (params: WorkflowParameters) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export interface AirtableTableProps {
  data: ViralContentRecord[];
  loading?: boolean;
  error?: string | null;
  onDataChange?: (data: ViralContentRecord[]) => void;
  airtableService?: any;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onPageChange?: (page: number, pageSize: number) => void;
}

export enum DataLoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Airtable工作流相关类型定义
 */

export interface AirtableWorkflowResponse {
  success: boolean;
  workflowId: string;
  executionId: string;
  status: 'processing' | 'completed' | 'failed';
  data?: ViralContentRecord[];
  error?: string;
  processingTime?: number;
}
