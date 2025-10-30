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
  | 'rednote-content-generator'
  | 'global-social-media-generator';

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
 * 小红书文案生成相关类型定义 - 基于新的webhook数据格式
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
  // 扩展字段 - 支持完整的 AI 生成数据结构
  fullReport?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  googleSheetData?: any;
  imageCards?: any[];
  statistics?: any;
  auditStatus?: any;
}

/**
 * 新的webhook返回数据格式类型定义
 */
export interface RedNoteWebhookResponse {
  raw: any;
  xiaohongshu?: {
    title: string;
    content: string;
    hashtags: string;
    publishReady: string;
    shortVersion: string;
  };
  management?: {
    alternativeTitles: string[];
    engagementHooks: string[];
    publishTips: string[];
    visualSuggestions: string[];
    optimizationNotes: string[];
  };
  analytics?: {
    titleCount: number;
    totalTags: number;
    contentLength: number;
    engagementQuestions: number;
    generatedAt: string;
  };
  apiFormat?: {
    title: string;
    content: {
      opening: string;
      body: string;
      conclusion: string;
    };
    tags: string[];
    metadata: {
      visual_suggestions: string[];
      engagement_strategy: {
        comment_hooks: string[];
        interaction_tips: string[];
      };
      optimization_notes: string[];
    };
  };
  // 中文字段支持
  统计数据?: {
    标题字数: number;
    正文字数: number;
    图片卡片数量: number;
  };
  发布内容?: {
    标题: string;
    正文: string;
    完整发布文本: string;
    标签数组: string[];
  };
  审核状态?: {
    风险评估: string;
    是否通过审核: boolean;
    违规词修改记录: string[];
  };
  Google表格数据?: {
    创建时间: string;
    审核状态: string;
    状态: string;
    分类: string;
    标题: string;
    标签: string;
    图片提示词?: string;
    视频提示词?: string;
    图片卡片设计?: string;
  };
  // 新增字段 - 支持完整的 AI 生成数据结构
  图片卡片文案?: any[];
  fullReport?: string;
  imagePrompt?: string;
  videoPrompt?: string;
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
  keyword: string; // 检索关键词
  offset?: string; // 偏移量
  count?: string; // 数量
  sortMethod?: string; // 排序方法 (0相关度 1最多点赞)
  timeRange?: string; // 发布时间范围 (0不限制 1最近1天 7最近7天等)
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

export const DataLoadingState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type DataLoadingState =
  (typeof DataLoadingState)[keyof typeof DataLoadingState];

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

/**
 * 图像生成工作流相关类型定义
 */

export type ImageGenerationMode = 'text-to-image' | 'image-edit';

export type ImageGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ImageGenerationRequest {
  id: string;
  mode: ImageGenerationMode;
  prompt: string;
  imageFile?: File;
  webhookUrl: string;
  createdAt: string;
  status: ImageGenerationStatus;
}

export interface ImageGenerationResponse {
  id: string;
  requestId: string;
  imageUrl: string;
  prompt?: string;
  processingTime?: number;
  createdAt: string;
  errorMessage?: string;
}

export interface ImageGenerationSettings {
  webhookUrl: string;
  defaultPrompt?: string;
  maxImageSize: number;
  supportedFormats: string[];
  timeout: number;
}

export interface ImageGenerationWorkflow extends Workflow {
  mode: ImageGenerationMode;
  settings: ImageGenerationSettings;
  lastGeneratedImage?: string;
}

/**
 * 国外社交媒体文案生成相关类型定义
 */

export interface SocialMediaContentRequest {
  id: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  inputContent: string;
  contentType: string;
  tone: string;
  writingTechnique: string;
  successFactor: string;
  targetAudience?: string;
  keywords?: string[];
  createdAt: string;
}

export interface SocialMediaContentResponse {
  id: string;
  requestId: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  generatedContent: string;
  title?: string;
  hashtags: string[];
  googleSheetUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface SocialMediaWebhookResponse {
  raw: any;
  content?: string;
  post?: string;
  hashtags?: string[];
  title?: string;
  // Twitter 特殊格式支持
  single_tweet?: {
    content: string;
    character_count: string;
    hook_type: string;
    hashtags: string;
    mentions: string;
    ready_to_post: string;
  };
  thread?: {
    total_tweets: string;
    summary: string;
    tweets: string[];
    ready_to_post: string[] | string;
  };
  // LinkedIn 特殊格式支持
  linkedin_post?: {
    content: string;
    character_count: string;
    hook_type: string;
    content_type: string;
    hashtags: string;
    brand_tag: string;
    ready_to_post: string;
  };
  // Instagram 特殊格式支持
  instagram_post?: {
    content: string;
    character_count: string;
    hook_type: string;
    content_type: string;
    hashtags: string;
    ready_to_post: string;
  };
  // Facebook 特殊格式支持
  facebook_post?: {
    content: string;
    character_count: string;
    hook_type: string;
    content_type: string;
    hashtags: string;
    ready_to_post: string;
  };
  quick_publish?: {
    single_tweet_ready?: string;
    thread_ready?: string[];
    post_ready?: string;
    optimal_time?: string;
    viral_score?: string;
    engagement_score?: string;
    discussion_questions?: string[];
  };
  hashtag_strategy?: {
    industry: string[];
    content: string[];
    brand: string;
    all_tags_string: string;
    industry_tags?: string[];
    content_tags?: string[];
    brand_tag?: string;
  };
  engagement?: {
    optimal_timing: string;
    discussion_starters: string[];
    reply_templates: string[];
    cta_suggestions?: string[];
  };
  research_data?: {
    industry_trends: string[];
    supporting_data: string[];
    case_studies: string[];
    latest_trends?: string[];
    expert_quotes?: string[];
  };
  performance?: {
    engagement_potential: string;
    engagement_label: string;
    professional_impact: string;
    optimization_notes: string;
    viral_potential?: string;
    viral_potential_label?: string;
    audience_fit?: string;
  };
  analysis?: {
    core_insights: string[];
    professional_value: string;
    target_engagement: string;
    controversy_potential?: string;
  };
  visual?: {
    image_type: string;
    design_notes: string;
  };
  raw_output?: any;
  generated_at?: string;
  input_info?: {
    platform: string;
    content_type: string;
    tone: string;
    writing_technique: string;
    success_factor: string;
    target_audience: string;
    original_content: string;
  };
  alternative_angles?: string[];
  analytics?: {
    titleCount?: number;
    totalTags?: number;
    contentLength?: number;
    engagementQuestions?: number;
    generatedAt?: string;
  };
  optimization?: {
    tips?: string[] | string;
    visualSuggestions?: string[];
    notes?: string[];
  };
}

export interface GlobalSocialMediaRequest {
  id: string;
  inputContent: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  contentType: string;
  tone: string;
  writingTechnique: string;
  targetAudience?: string;
  keywords?: string[];
  callToAction?: string;
  createdAt: string;
}

export interface GlobalSocialMediaResponse {
  id: string;
  requestId: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  generatedContent: string;
  title?: string;
  hashtags: string[];
  googleSheetUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface GlobalSocialMediaWebhookResponse {
  raw: any;
  socialMedia: {
    platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
    title?: string;
    content: string;
    hashtags: string;
    publishReady: string;
    shortVersion: string;
  };
  management: {
    alternativeTitles: string[];
    engagementHooks: string[];
    publishTips: string[];
    visualSuggestions: string[];
    optimizationNotes: string[];
  };
  analytics: {
    titleCount: number;
    totalTags: number;
    contentLength: number;
    engagementQuestions: number;
    generatedAt: string;
  };
  apiFormat: {
    title?: string;
    content: {
      opening: string;
      body: string;
      conclusion: string;
    };
    tags: string[];
    metadata: {
      visual_suggestions: string[];
      engagement_strategy: {
        comment_hooks: string[];
        interaction_tips: string[];
      };
      optimization_notes: string[];
    };
  };
}

export interface GlobalSocialMediaSettings {
  name: string;
  description: string;
  webhookUrl: string;
  googleSheetId?: string;
  autoSave: boolean;
  maxContentLength: number;
  supportedPlatforms: ('twitter' | 'linkedin' | 'instagram' | 'facebook')[];
}

/**
 * 视频生成工作流相关类型定义
 */

export type VideoGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface VideoGenerationRequest {
  id: string;
  description: string;
  images: File[];
  videoCount: number;
  webhookUrl: string;
  metadata?: {
    userId: string;
    timestamp: string;
    source: 'wendeal-dashboard';
  };
  createdAt: string;
  status: VideoGenerationStatus;
}

export interface VideoGenerationResponse {
  id: string;
  requestId: string;
  videoUrl: string;
  videoId?: string;
  description?: string;
  processingTime?: number;
  createdAt: string;
  errorMessage?: string;
  metadata?: {
    duration: number;
    format: string;
    size: number | string;
    model?: string;
    expiresAt?: number;
  };
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  result: VideoGenerationResponse | null;
  uploadedImages: File[];
}

export interface VideoGenerationSettings {
  webhookUrl: string;
  defaultDescription?: string;
  maxImages: number;
  maxImageSize: number;
  supportedImageFormats: string[];
  timeout: number;
  maxVideoDuration?: number;
}

export interface VideoGenerationWorkflow extends Workflow {
  settings: VideoGenerationSettings;
  lastGeneratedVideo?: string;
}

/**
 * 小红书图片生成相关类型定义
 */

export interface RednoteImgRequest {
  id?: string;
  content: string;
  webhookUrl?: string;
  createdAt?: string;
  timestamp?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  [key: string]: any;
}

export interface RednoteImgResponse {
  id?: string;
  requestId?: string;
  success?: boolean;
  htmlContent?: string;
  html?: string;
  imageUrl?: string;
  processingTime?: number;
  createdAt?: string;
  errorMessage?: string;
  timestamp?: string;
  metadata?: {
    cardCount?: number;
    format?: string;
  };
  [key: string]: any;
}
