/**
 * Smart Opportunities Type Definitions
 * 小红书文案生成器相关类型定义
 */

/**
 * 商业机会记录接口
 * 对应Airtable中的单个记录
 */
export interface OpportunityRecord {
  /** 记录ID */
  id: string;
  /** 记录字段数据 */
  fields: {
    /** 商业名称 */
    businessName: string;
    /** 行业领域 */
    industry: string;
    /** 城市 */
    city: string;
    /** 国家 */
    country: string;
    /** 描述信息 */
    description: string;
    /** 联系方式 */
    contactInfo?: string;
    /** 创建时间 */
    createdTime: string;
  };
  /** Airtable创建时间 */
  createdTime: string;
}

/**
 * 工作流参数接口
 * 用户输入的参数
 */
export interface WorkflowParameters {
  /** 行业领域（如：barber, real estate agency） */
  industry: string;
  /** 城市名称 */
  city: string;
  /** 国家名称 */
  country: string;
}

/**
 * Airtable配置接口
 * API连接配置信息
 */
export interface AirtableConfig {
  /** API密钥 */
  apiKey: string;
  /** Base ID */
  baseId: string;
  /** 表名称 */
  tableName: string;
}

/**
 * Smart Opportunities组件Props接口
 */
export interface SmartOpportunitiesProps {
  /** 工作流参数变化回调 */
  onParametersChange?: (parameters: WorkflowParameters) => void;
  /** 数据加载完成回调 */
  onDataLoaded?: (data: OpportunityRecord[]) => void;
  /** 错误处理回调 */
  onError?: (error: Error) => void;
}

/**
 * InputForm组件Props接口
 */
export interface InputFormProps {
  /** 当前参数值 */
  value: WorkflowParameters;
  /** 参数变化回调 */
  onChange: (parameters: WorkflowParameters) => void;
  /** 表单提交回调 */
  onSubmit: (parameters: WorkflowParameters) => void;
  /** 加载状态 */
  loading?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
}

/**
 * AirtableTable组件Props接口
 */
export interface AirtableTableProps {
  /** 表格数据 */
  data: OpportunityRecord[];
  /** 加载状态 */
  loading?: boolean;
  /** 错误信息 */
  error?: string | null;
  /** 数据变化回调 */
  onDataChange?: (data: OpportunityRecord[]) => void;
  /** 排序变化回调 */
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  /** 分页变化回调 */
  onPageChange?: (page: number, pageSize: number) => void;
}

/**
 * Airtable API响应接口
 */
export interface AirtableApiResponse {
  /** 记录数组 */
  records: OpportunityRecord[];
  /** 分页偏移量 */
  offset?: string;
}

/**
 * 工作流执行结果接口
 */
export interface WorkflowExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 执行ID */
  executionId?: string;
  /** 错误信息 */
  error?: string;
  /** 数据 */
  data?: any;
}

/**
 * Smart Opportunities错误类型枚举
 */
export const SmartOpportunitiesErrorType = {
  /** 网络错误 */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** API错误 */
  API_ERROR: 'API_ERROR',
  /** 参数验证错误 */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** 数据解析错误 */
  PARSING_ERROR: 'PARSING_ERROR',
  /** 认证错误 */
  AUTH_ERROR: 'AUTH_ERROR',
} as const;

export type SmartOpportunitiesErrorType =
  (typeof SmartOpportunitiesErrorType)[keyof typeof SmartOpportunitiesErrorType];

/**
 * Smart Opportunities错误接口
 */
export interface SmartOpportunitiesError {
  /** 错误类型 */
  type: SmartOpportunitiesErrorType;
  /** 错误消息 */
  message: string;
  /** 原始错误 */
  originalError?: Error;
  /** 错误代码 */
  code?: string;
}

/**
 * 表格列配置接口
 */
export interface TableColumn {
  /** 列标题 */
  title: string;
  /** 数据字段 */
  dataIndex: string;
  /** 列键 */
  key: string;
  /** 是否可排序 */
  sortable?: boolean;
  /** 列宽度 */
  width?: number | string;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
}

/**
 * 表格排序配置接口
 */
export interface TableSort {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 表格分页配置接口
 */
export interface TablePagination {
  /** 当前页码 */
  current: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean;
  /** 是否显示页码选择器 */
  showSizeChanger?: boolean;
}

/**
 * 数据加载状态枚举
 */
export const DataLoadingState = {
  /** 初始状态 */
  IDLE: 'IDLE',
  /** 加载中 */
  LOADING: 'LOADING',
  /** 加载成功 */
  SUCCESS: 'SUCCESS',
  /** 加载失败 */
  ERROR: 'ERROR',
} as const;

export type DataLoadingState =
  (typeof DataLoadingState)[keyof typeof DataLoadingState];
