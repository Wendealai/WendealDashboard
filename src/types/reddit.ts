// Reddit工作流相关的类型定义

/**
 * Reddit帖子数据结构
 * 包含从Reddit API获取的帖子信息
 */
export interface RedditPost {
  /** 帖子唯一标识符 */
  id: string;
  /** 帖子标题 */
  title: string;
  /** 帖子内容/描述 */
  content?: string;
  /** 帖子作者 */
  author: string;
  /** 所属子版块 */
  subreddit: string;
  /** 帖子URL */
  url: string;
  /** Reddit永久链接 */
  permalink: string;
  /** 创建时间戳 */
  createdUtc: number;
  /** 投票得分 */
  score: number;
  /** 点赞数 */
  upvotes: number;
  /** 点踩数 */
  downvotes: number;
  /** 评论数量 */
  numComments: number;
  /** 帖子类型 */
  postType: 'text' | 'link' | 'image' | 'video';
  /** 是否置顶 */
  stickied: boolean;
  /** 是否NSFW内容 */
  nsfw: boolean;
  /** 帖子标签/分类 */
  flair?: string;
  /** 缩略图URL */
  thumbnail?: string;
  /** 预览图片URLs */
  previewImages?: string[];
  /** 获取时间戳 */
  fetchedAt: number;
  /** 点赞比例 */
  upvoteRatio?: number;
  /** 标签文本 */
  linkFlairText?: string;
  /** 是否为成人内容 */
  over18?: boolean;
  /** 创建时间ISO字符串 */
  createdAt?: string;
  /** 是否已读 */
  read?: boolean;
  /** 保存状态 */
  saved?: boolean;
  /** 隐藏状态 */
  hidden?: boolean;
}

/**
 * 工作流执行状态
 * 描述Reddit抓取工作流的当前状态
 */
export interface WorkflowStatus {
  /** 工作流ID */
  workflowId: string;
  /** 执行状态 */
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  /** 开始时间 */
  startTime: number | undefined;
  /** 结束时间 */
  endTime: number | undefined;
  /** 执行进度百分比 (0-100) */
  progress: number;
  /** 已处理的帖子数量 */
  processedCount: number;
  /** 总帖子数量 */
  totalCount: number;
  /** 错误信息 */
  error?: string;
  /** 最后更新时间 */
  lastUpdated: number;
  /** 执行日志 */
  logs: WorkflowLog[];
}

/**
 * 工作流执行日志
 * 记录工作流执行过程中的关键事件
 */
export interface WorkflowLog {
  /** 日志ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: 'info' | 'warning' | 'error' | 'debug';
  /** 日志消息 */
  message: string;
  /** 详细信息 */
  details?: any;
}

/**
 * Reddit工作流配置
 * 定义工作流的执行参数和设置
 */
export interface RedditWorkflowConfig {
  /** 配置ID */
  id: string;
  /** 配置名称 */
  name: string;
  /** 目标子版块列表 */
  subreddits: string[];
  /** 排序方式 */
  sortBy: 'hot' | 'new' | 'top' | 'rising';
  /** 时间范围 (仅对top排序有效) */
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  /** 获取帖子数量限制 */
  limit: number;
  /** 最小分数阈值 */
  minScore?: number;
  /** 最大分数阈值 */
  maxScore?: number;
  /** 是否包含NSFW内容 */
  includeNsfw: boolean;
  /** 是否包含置顶帖 */
  includeStickied: boolean;
  /** 执行间隔 (分钟) */
  intervalMinutes?: number;
  /** 是否启用自动执行 */
  autoRun: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 最后修改时间 */
  updatedAt: number;
  /** 是否激活 */
  isActive: boolean;
}

/**
 * Reddit工作流统计信息
 * 提供工作流执行的统计数据
 */
export interface RedditWorkflowStats {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功执行次数 */
  successfulExecutions: number;
  /** 失败执行次数 */
  failedExecutions: number;
  /** 总获取帖子数 */
  totalPostsFetched: number;
  /** 平均执行时间 (秒) */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime: number | undefined;
  /** 最后成功时间 */
  lastSuccessTime: number | undefined;
  /** 错误率百分比 */
  errorRate: number;
  /** 成功率百分比 */
  successRate: number;
  /** 总点赞数 */
  totalUpvotes?: number;
  /** 总评论数 */
  totalComments?: number;
  /** 有效子版块数 */
  validSubreddits?: number;
  /** 总子版块数 */
  totalSubreddits?: number;
  /** 消息长度 */
  messageLength?: number;
}

/**
 * Reddit数据过滤器
 * 用于前端数据展示的过滤条件
 */
export interface RedditDataFilter {
  /** 子版块过滤 */
  subreddits?: string[];
  /** 作者过滤 */
  authors?: string[];
  /** 分数范围 */
  scoreRange?: {
    min?: number;
    max?: number;
  };
  /** 时间范围 */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** 帖子类型过滤 */
  postTypes?: ('text' | 'link' | 'image' | 'video')[];
  /** 是否包含NSFW */
  includeNsfw?: boolean;
  /** 搜索关键词 */
  searchKeyword?: string;
  /** 关键词过滤 */
  keywords?: string[];
  /** 域名过滤 */
  domains?: string[];
  /** 最小分数 */
  minScore?: number;
  /** 最大分数 */
  maxScore?: number;
  /** 日期范围 */
  dateRange?: {
    start?: string;
    end?: string;
  };
  /** 是否包含置顶帖 */
  includeStickied?: boolean;
}

/**
 * Reddit数据排序选项
 * 定义前端数据展示的排序方式
 */
export interface RedditDataSort {
  /** 排序字段 */
  field:
    | 'createdUtc'
    | 'score'
    | 'numComments'
    | 'title'
    | 'author'
    | 'subreddit';
  /** 排序方向 */
  direction: 'asc' | 'desc';
  /** 排序顺序 */
  order?: 'asc' | 'desc';
  /** 时间范围 */
  timeRange?: string;
}

/**
 * Reddit工作流页面状态
 * 管理Reddit工作流页面的UI状态
 */
export interface RedditWorkflowPageState {
  /** 当前选中的配置 */
  selectedConfig?: RedditWorkflowConfig;
  /** 数据过滤器 */
  filter: RedditDataFilter;
  /** 数据排序 */
  sort: RedditDataSort;
  /** 分页信息 */
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  /** 是否显示配置模态框 */
  showConfigModal: boolean;
  /** 是否显示日志模态框 */
  showLogsModal: boolean;
  /** 选中的帖子IDs */
  selectedPostIds: string[];
  /** 视图模式 */
  viewMode: 'table' | 'card' | 'list';
}

/**
 * API响应类型
 * 定义与后端API交互的响应格式
 */
export interface RedditApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 响应时间戳 */
  timestamp: number;
  /** 分页信息 (如果适用) */
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 工作流操作类型
 * 定义可以对工作流执行的操作
 */
export type WorkflowAction = 'start' | 'stop' | 'pause' | 'resume' | 'restart';

/**
 * 工作流事件类型
 * 定义工作流执行过程中的事件类型
 */
export type WorkflowEventType =
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'post_fetched'
  | 'batch_completed'
  | 'error_occurred';

/**
 * 工作流事件数据
 * 定义工作流事件携带的数据
 */
export interface WorkflowEvent {
  /** 事件类型 */
  type: WorkflowEventType;
  /** 工作流ID */
  workflowId: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件数据 */
  data?: any;
  /** 事件消息 */
  message?: string;
}
