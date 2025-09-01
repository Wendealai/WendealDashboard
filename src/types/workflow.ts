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
  warnings?: ValidationWarning[];
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
