// 工作流设置相关的类型定义

/**
 * 工作流设置接口
 * 定义工作流的基本配置信息
 */
export interface WorkflowSettings {
  /** 工作流名称 */
  name: string;
  /** Webhook地址 */
  webhookUrl: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 验证结果接口
 * 用于表单验证和错误处理
 */
export interface ValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: ValidationError[];
  /** 警告信息列表 */
  warnings: ValidationWarning[] | undefined;
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  /** 字段名 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  /** 字段名 */
  field: string;
  /** 警告消息 */
  message: string;
  /** 警告代码 */
  code?: string;
}

/**
 * 工作流设置模态框状态
 * 扩展基础ModalState以支持工作流设置特定功能
 */
export interface WorkflowSettingsModalState {
  /** 模态框是否打开 */
  isOpen: boolean;
  /** 模态框类型 */
  type: 'create' | 'edit' | null;
  /** 当前编辑的工作流设置数据 */
  data: WorkflowSettings | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在保存 */
  saving: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * 工作流设置表单数据
 */
export interface WorkflowSettingsFormData {
  /** 工作流名称 */
  name: string;
  /** Webhook地址 */
  webhookUrl: string;
}

/**
 * 工作流设置服务响应
 */
export interface WorkflowSettingsResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: WorkflowSettings;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}

/**
 * 工作流设置更新请求
 */
export interface UpdateWorkflowSettingsRequest {
  /** 工作流名称 */
  name?: string;
  /** Webhook地址 */
  webhookUrl?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 工作流设置配置选项
 */
export interface WorkflowSettingsConfig {
  /** 最大名称长度 */
  maxNameLength: number;
  /** 最小名称长度 */
  minNameLength: number;
  /** 允许的URL协议 */
  allowedProtocols: string[];
  /** 是否允许本地主机URL */
  allowLocalhost: boolean;
  /** 验证超时时间（毫秒） */
  validationTimeout: number;
}

/**
 * 工作流设置事件类型
 */
export type WorkflowSettingsEventType =
  | 'settings-updated'
  | 'settings-created'
  | 'settings-deleted'
  | 'validation-failed'
  | 'save-failed';

/**
 * 工作流设置事件
 */
export interface WorkflowSettingsEvent {
  /** 事件类型 */
  type: WorkflowSettingsEventType;
  /** 事件数据 */
  data: any;
  /** 事件时间戳 */
  timestamp: number;
}

/**
 * 发票OCR处理结果 - 增强版本
 * 包含详细的处理统计和分析信息
 */
export interface InvoiceOCRResult {
  /** 处理时间戳 */
  processingTimestamp: string;
  /** 处理摘要统计 */
  summary: InvoiceProcessingSummary;
  /** 财务统计摘要 */
  financialSummary: FinancialSummary;
  /** 处理详情 */
  processingDetails: ProcessingDetails;
  /** 质量指标 */
  qualityMetrics: QualityMetrics;
  /** 处理建议 */
  recommendations: string[];
}

/**
 * 发票处理摘要统计
 */
export interface InvoiceProcessingSummary {
  /** 总处理项目数 */
  totalItems: number;
  /** OCR处理文档数 */
  ocrDocuments: number;
  /** 提取记录数 */
  extractedRecords: number;
  /** Google Sheets记录数 */
  googleSheetsRecords: number;
  /** 成功提取数 */
  successfulExtractions: number;
  /** 失败提取数 */
  failedExtractions: number;
  /** 重复记录数 */
  duplicateRecords: number;
  /** 质量问题数 */
  qualityIssues: number;
  /** 成功率 */
  successRate: string;
  /** 唯一发票数量 */
  uniqueInvoices: number;
}

/**
 * 财务统计摘要
 */
export interface FinancialSummary {
  /** 总金额 */
  totalAmount: string;
  /** 平均金额 */
  averageAmount: string;
  /** 最小金额 */
  minAmount: string;
  /** 最大金额 */
  maxAmount: string;
  /** 中位数金额 */
  medianAmount: string;
  /** 记录数量 */
  count: number;
}

/**
 * 处理详情
 */
export interface ProcessingDetails {
  /** 成功处理的发票列表 */
  successfulInvoices: SuccessfulInvoice[];
  /** 失败提取记录 */
  failedExtractions: FailedExtraction[];
  /** 质量问题记录 */
  qualityIssues: QualityIssue[];
  /** 重复记录 */
  duplicates: DuplicateRecord[];
}

/**
 * 成功处理的发票信息
 */
export interface SuccessfulInvoice {
  /** 发票号码 */
  invoiceNumber: string;
  /** 供应商名称 */
  vendorName: string;
  /** 总金额 */
  totalAmount: number;
  /** 索引位置 */
  index: number;
}

/**
 * 失败提取记录
 */
export interface FailedExtraction {
  /** 索引位置 */
  index: number;
  /** 错误信息 */
  error: string;
}

/**
 * 质量问题记录
 */
export interface QualityIssue {
  /** 索引位置 */
  index: number;
  /** 发票号码 */
  invoiceNumber: string;
  /** 是否有效 */
  isValid: boolean;
  /** 问题列表 */
  issues: string[];
}

/**
 * 重复记录
 */
export interface DuplicateRecord {
  /** 发票号码 */
  invoiceNumber: string;
  /** 索引位置 */
  index: number;
}

/**
 * 质量指标
 */
export interface QualityMetrics {
  /** 数据完整性百分比 */
  dataCompleteness: string;
  /** 重复率百分比 */
  duplicateRate: string;
  /** 错误率百分比 */
  errorRate: string;
}

/**
 * 增强版Webhook响应
 * 包含发票OCR处理的详细结果数组
 */
export interface EnhancedWebhookResponse {
  /** 处理结果数组 */
  results: InvoiceOCRResult[];
  /** 响应状态 */
  status?: 'success' | 'error' | 'partial';
  /** 响应消息 */
  message?: string;
  /** Google Sheets URL */
  googleSheetsUrl?: string;
}

/**
 * Smart Opportunities 工作流配置
 */
export interface SmartOpportunitiesConfig {
  /** 配置ID */
  id: string;
  /** 配置名称 */
  name: string;
  /** 默认行业 */
  defaultIndustry?: string;
  /** 默认城市 */
  defaultCity?: string;
  /** 默认国家 */
  defaultCountry?: string;
  /** 自动刷新间隔（分钟） */
  autoRefreshMinutes?: number;
  /** 最大结果数量 */
  maxResults?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 是否激活 */
  isActive: boolean;
}

/**
 * Smart Opportunities 工作流统计
 */
export interface SmartOpportunitiesStats {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功执行次数 */
  successfulExecutions: number;
  /** 失败执行次数 */
  failedExecutions: number;
  /** 总记录数 */
  totalRecordsFound: number;
  /** 平均执行时间（秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime: string;
  /** 最后成功时间 */
  lastSuccessTime: string;
  /** 错误率百分比 */
  errorRate: number;
  /** 成功率百分比 */
  successRate: number;
  /** 缓存命中率 */
  cacheHitRate?: number;
}
