/**
 * Export Error Diagnosis System Types
 * TypeScript类型定义，用于导出错误诊断系统
 */

/**
 * 导出信息接口
 * 描述一个导出声明的基本信息
 */
export interface ExportInfo {
  /** 导出名称 */
  name: string;
  /** 导出类型 */
  type:
    | 'named'
    | 'default'
    | 'namespace'
    | 'type'
    | 'interface'
    | 'class'
    | 'function'
    | 'const'
    | 'let'
    | 'var';
  /** 导出位置 */
  location: FileLocation;
  /** 是否已使用 */
  isUsed: boolean;
  /** 引用计数 */
  referenceCount: number;
  /** 最后修改时间 */
  lastModified: Date;
  /** 值类型 */
  valueType?: string;
  /** 导出值（可选，用于静态分析） */
  value?: any;
  /** 导出注释 */
  comment?: string;
  /** 导出修饰符 */
  modifiers?: string[];
}

/**
 * 文件位置信息
 */
export interface FileLocation {
  /** 文件路径 */
  filePath: string;
  /** 行号 */
  line: number;
  /** 列号 */
  column: number;
  /** 代码片段 */
  codeSnippet?: string;
}

/**
 * 导出问题接口
 * 描述一个具体的导出相关问题
 */
export interface ExportIssue {
  /** 问题ID */
  id: string;
  /** 问题类型 */
  type: ExportIssueType;
  /** 问题严重程度 */
  severity: IssueSeverity;
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description: string;
  /** 问题位置 */
  location: FileLocation;
  /** 检测时间 */
  detectedAt: Date;
  /** 相关导出信息 */
  relatedExport?: ExportInfo;
  /** 相关导入信息 */
  relatedImport?: ImportInfo;
  /** 问题代码 */
  code?: string;
  /** 建议的修复方案 */
  suggestions?: FixSuggestion[];
  /** 问题上下文 */
  context?: {
    /** 周围代码 */
    surroundingCode?: string;
    /** 相关文件 */
    relatedFiles?: string[];
    /** 依赖关系 */
    dependencies?: string[];
  };
}

/**
 * 导入信息接口
 */
export interface ImportInfo {
  /** 导入模块 */
  module: string;
  /** 导入名称 */
  name: string;
  /** 导入类型 */
  type: 'named' | 'default' | 'namespace' | 'side-effect';
  /** 导入位置 */
  location: FileLocation;
  /** 是否已解析 */
  isResolved: boolean;
  /** 解析后的实际导出 */
  resolvedExport?: ExportInfo;
}

/**
 * 修复建议接口
 */
export interface FixSuggestion {
  /** 建议ID */
  id: string;
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 建议类型 */
  type: 'add' | 'remove' | 'modify' | 'move' | 'rename';
  /** 置信度 (0-1) */
  confidence: number;
  /** 修复代码 */
  fixCode?: string;
  /** 修复位置 */
  fixLocation?: FileLocation;
  /** 影响范围 */
  impact: 'file' | 'module' | 'project';
  /** 是否安全修复 */
  isSafe: boolean;
  /** 潜在风险 */
  risks?: string[];
}

/**
 * 诊断报告接口
 */
export interface DiagnosticReport {
  /** 报告ID */
  id: string;
  /** 扫描时间 */
  timestamp: Date;
  /** 扫描配置 */
  config: DiagnosticConfig;
  /** 扫描统计信息 */
  statistics: DiagnosticStatistics;
  /** 发现的问题列表 */
  issues: ExportIssue[];
  /** 修复建议列表 */
  suggestions: FixSuggestion[];
  /** 扫描的文件列表 */
  scannedFiles: string[];
  /** 扫描用时（毫秒） */
  duration: number;
  /** 报告状态 */
  status: 'completed' | 'failed' | 'cancelled';
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * 诊断配置接口
 */
export interface DiagnosticConfig {
  /** 扫描的文件模式 */
  filePatterns: string[];
  /** 忽略的文件模式 */
  ignorePatterns: string[];
  /** 扫描深度 */
  maxDepth: number;
  /** 是否包含类型定义 */
  includeTypes: boolean;
  /** 是否包含测试文件 */
  includeTests: boolean;
  /** 是否启用缓存 */
  enableCache: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpiry: number;
  /** 并发扫描数量 */
  concurrency: number;
  /** 超时时间（毫秒） */
  timeout: number;
}

/**
 * 诊断统计信息
 */
export interface DiagnosticStatistics {
  /** 扫描的文件总数 */
  totalFiles: number;
  /** 扫描的导出总数 */
  totalExports: number;
  /** 发现的问题总数 */
  totalIssues: number;
  /** 按严重程度统计的问题 */
  issuesBySeverity: Record<IssueSeverity, number>;
  /** 按类型统计的问题 */
  issuesByType: Record<ExportIssueType, number>;
  /** 扫描的文件大小总和（字节） */
  totalFileSize: number;
  /** 平均处理时间（毫秒/文件） */
  averageProcessingTime: number;
}

/**
 * 导出问题类型枚举
 */
export enum ExportIssueType {
  /** 未使用的导出 */
  UNUSED_EXPORT = 'unused_export',
  /** 缺失的导出 */
  MISSING_EXPORT = 'missing_export',
  /** 导出名称冲突 */
  EXPORT_NAME_CONFLICT = 'export_name_conflict',
  /** 循环依赖 */
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  /** 错误的导出类型 */
  INCORRECT_EXPORT_TYPE = 'incorrect_export_type',
  /** 导出位置不当 */
  EXPORT_LOCATION_ISSUE = 'export_location_issue',
  /** 导入导出不匹配 */
  IMPORT_EXPORT_MISMATCH = 'import_export_mismatch',
  /** 类型导出问题 */
  TYPE_EXPORT_ISSUE = 'type_export_issue',
  /** 动态导入问题 */
  DYNAMIC_IMPORT_ISSUE = 'dynamic_import_issue',
  /** 重新导出问题 */
  REEXPORT_ISSUE = 'reexport_issue',
}

/**
 * 问题严重程度枚举
 */
export enum IssueSeverity {
  /** 错误 - 必须修复 */
  ERROR = 'error',
  /** 警告 - 建议修复 */
  WARNING = 'warning',
  /** 信息 - 可选修复 */
  INFO = 'info',
  /** 提示 - 代码优化建议 */
  HINT = 'hint',
}

/**
 * 扫描选项接口
 */
export interface ScanOptions {
  /** 根目录 */
  rootDir: string;
  /** 配置文件路径 */
  configPath?: string;
  /** 输出格式 */
  outputFormat: 'json' | 'text' | 'html';
  /** 输出文件路径 */
  outputPath?: string;
  /** 是否显示进度 */
  showProgress: boolean;
  /** 是否启用详细输出 */
  verbose: boolean;
  /** 是否修复问题 */
  fixIssues: boolean;
  /** 修复确认模式 */
  fixConfirmation: 'auto' | 'manual' | 'none';
}

/**
 * 扫描结果接口
 */
export interface ScanResult {
  /** 是否成功 */
  success: boolean;
  /** 诊断报告 */
  report?: DiagnosticReport;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
  /** 处理的文件数量 */
  processedFiles?: number;
  /** 处理时间（毫秒） */
  processingTime?: number;
}

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  /** 文件路径 */
  filePath: string;
  /** 文件修改时间 */
  mtime: number;
  /** 导出信息列表 */
  exports: ExportInfo[];
  /** 缓存时间 */
  cachedAt: number;
  /** 缓存版本 */
  version: string;
}

/**
 * 依赖关系图接口
 */
export interface DependencyGraph {
  /** 节点列表（文件路径） */
  nodes: string[];
  /** 边列表（依赖关系） */
  edges: Array<{
    from: string;
    to: string;
    type: 'import' | 'export' | 'reexport';
  }>;
  /** 循环依赖列表 */
  cycles: string[][];
}

/**
 * 诊断引擎接口
 */
export interface IDiagnosticEngine {
  /** 扫描项目 */
  scan(options: ScanOptions): Promise<ScanResult>;
  /** 获取缓存统计 */
  getCacheStats(): { hits: number; misses: number; size: number };
  /** 清除缓存 */
  clearCache(): Promise<void>;
  /** 获取支持的文件类型 */
  getSupportedFileTypes(): string[];
}

/**
 * 诊断服务接口
 */
export interface IDiagnosticService {
  /** 执行诊断 */
  diagnose(config: DiagnosticConfig): Promise<DiagnosticReport>;
  /** 获取诊断历史 */
  getDiagnosticHistory(limit?: number): Promise<DiagnosticReport[]>;
  /** 获取诊断配置 */
  getDiagnosticConfig(): Promise<DiagnosticConfig>;
  /** 更新诊断配置 */
  updateDiagnosticConfig(config: Partial<DiagnosticConfig>): Promise<void>;
}

/**
 * 命令行选项接口
 */
export interface CliOptions {
  /** 扫描目录 */
  dir?: string;
  /** 配置文件 */
  config?: string;
  /** 输出格式 */
  format?: 'json' | 'text' | 'html';
  /** 输出文件 */
  output?: string;
  /** 显示进度 */
  progress?: boolean;
  /** 详细输出 */
  verbose?: boolean;
  /** 修复问题 */
  fix?: boolean;
  /** 帮助信息 */
  help?: boolean;
  /** 版本信息 */
  version?: boolean;
}

/**
 * 默认诊断配置
 */
export const DEFAULT_DIAGNOSTIC_CONFIG: DiagnosticConfig = {
  filePatterns: ['**/*.{ts,tsx,js,jsx}'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/*.d.ts',
  ],
  maxDepth: 10,
  includeTypes: true,
  includeTests: false,
  enableCache: true,
  cacheExpiry: 24 * 60 * 60 * 1000, // 24小时
  concurrency: 4,
  timeout: 30000, // 30秒
};

/**
 * 导出问题类型描述映射
 */
export const EXPORT_ISSUE_TYPE_LABELS: Record<ExportIssueType, string> = {
  [ExportIssueType.UNUSED_EXPORT]: '未使用的导出',
  [ExportIssueType.MISSING_EXPORT]: '缺失的导出',
  [ExportIssueType.EXPORT_NAME_CONFLICT]: '导出名称冲突',
  [ExportIssueType.CIRCULAR_DEPENDENCY]: '循环依赖',
  [ExportIssueType.INCORRECT_EXPORT_TYPE]: '错误的导出类型',
  [ExportIssueType.EXPORT_LOCATION_ISSUE]: '导出位置不当',
  [ExportIssueType.IMPORT_EXPORT_MISMATCH]: '导入导出不匹配',
  [ExportIssueType.TYPE_EXPORT_ISSUE]: '类型导出问题',
  [ExportIssueType.DYNAMIC_IMPORT_ISSUE]: '动态导入问题',
  [ExportIssueType.REEXPORT_ISSUE]: '重新导出问题',
};

/**
 * 严重程度颜色映射
 */
export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  [IssueSeverity.ERROR]: '#ff4d4f',
  [IssueSeverity.WARNING]: '#fa8c16',
  [IssueSeverity.INFO]: '#1890ff',
  [IssueSeverity.HINT]: '#722ed1',
};

/**
 * 严重程度标签映射
 */
export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  [IssueSeverity.ERROR]: '错误',
  [IssueSeverity.WARNING]: '警告',
  [IssueSeverity.INFO]: '信息',
  [IssueSeverity.HINT]: '提示',
};

/**
 * 扫描进度接口
 */
export interface ScanProgress {
  /** 已处理文件数 */
  processedFiles: number;
  /** 总文件数 */
  totalFiles: number;
  /** 当前文件 */
  currentFile?: string;
  /** 发现的问题数 */
  issuesFound: number;
  /** 已用时间（毫秒） */
  elapsedTime: number;
}

/**
 * 修复类型枚举
 */
export type FixType = 'auto_fix' | 'manual_fix' | 'suggestion';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息 */
  errors?: string[];
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 缓存条目接口（修正）
 */
export interface CacheEntry {
  /** 文件路径 */
  filePath: string;
  /** 文件修改时间戳 */
  mtime: number;
  /** 导出信息列表 */
  exports: ExportInfo[];
  /** 缓存时间 */
  cachedAt: Date;
  /** 缓存版本 */
  version: string;
}

/**
 * 扫描选项接口（扩展）
 */
export interface ScanOptions {
  /** 根目录 */
  rootDir: string;
  /** 递归扫描 */
  recursive?: boolean;
  /** 包含隐藏文件 */
  includeHidden?: boolean;
  /** 包含node_modules */
  includeNodeModules?: boolean;
  /** 包含测试文件 */
  includeTests?: boolean;
  /** 并发数 */
  concurrency?: number;
  /** 进度回调 */
  onProgress?: (progress: ScanProgress) => void;
  /** 显示进度 */
  showProgress?: boolean;
}

/**
 * 诊断配置接口（扩展）
 */
export interface DiagnosticConfig {
  /** 文件模式 */
  filePatterns: string[];
  /** 忽略模式 */
  ignorePatterns: string[];
  /** 最大深度 */
  maxDepth: number;
  /** 包含类型 */
  includeTypes: boolean;
  /** 包含测试 */
  includeTests: boolean;
  /** 启用缓存 */
  enableCache: boolean;
  /** 缓存过期时间 */
  cacheExpiry: number;
  /** 严重程度阈值 */
  severityThreshold?: IssueSeverity;
  /** ESLint配置 */
  eslintConfig?: {
    enabled: boolean;
    configFile?: string;
  };
  /** TypeScript配置 */
  typescriptConfig?: {
    enabled: boolean;
    checkTypeExports?: boolean;
    configFile?: string;
  };
}

/**
 * 诊断报告接口（扩展）
 */
export interface DiagnosticReport {
  /** 报告ID */
  id: string;
  /** 时间戳 */
  timestamp: Date;
  /** 配置 */
  config: DiagnosticConfig;
  /** 统计信息 */
  statistics: DiagnosticStatistics;
  /** 问题列表 */
  issues: ExportIssue[];
  /** 建议列表 */
  suggestions: FixSuggestion[];
  /** 扫描文件数 */
  filesScanned: number;
  /** 总导出数 */
  totalExports: number;
  /** 已使用导出数 */
  usedExports: number;
  /** 未使用导出数 */
  unusedExports: number;
  /** 处理时间 */
  processingTime: number;
  /** 状态 */
  status: 'completed' | 'failed' | 'cancelled';
  /** 错误信息 */
  error?: string;
}

/**
 * 导出问题类型枚举（扩展）
 */
export const ExportIssueType = {
  UNUSED_EXPORT: 'unused_export',
  MISSING_EXPORT: 'missing_export',
  EXPORT_NAME_CONFLICT: 'export_name_conflict',
  CIRCULAR_DEPENDENCY: 'circular_dependency',
  INCORRECT_EXPORT_TYPE: 'incorrect_export_type',
  EXPORT_LOCATION_ISSUE: 'export_location_issue',
  IMPORT_EXPORT_MISMATCH: 'import_export_mismatch',
  TYPE_EXPORT_ISSUE: 'type_export_issue',
  DYNAMIC_IMPORT_ISSUE: 'dynamic_import_issue',
  REEXPORT_ISSUE: 'reexport_issue',
  EXPORT_INCONSISTENCY: 'export_inconsistency',
  DEFAULT_EXPORT_CONFLICT: 'default_export_conflict',
  RENAMED_EXPORT_ISSUE: 'renamed_export_issue',
} as const;

export type ExportIssueType =
  (typeof ExportIssueType)[keyof typeof ExportIssueType];

/**
 * 严重程度枚举（扩展）
 */
export const IssueSeverity = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  HINT: 'hint',
} as const;

export type IssueSeverity = (typeof IssueSeverity)[keyof typeof IssueSeverity];
