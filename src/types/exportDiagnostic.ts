/**
 * Export Error Diagnosis System Types
 * 定义导出诊断系统的类型和接口
 */

/**
 * 导出信息接口
 */
export interface ExportInfo {
  /** 导出名称 */
  name: string;
  /** 导出类型 */
  type: 'named' | 'default' | 'namespace';
  /** 导出位置 */
  location: FileLocation;
  /** 导出值类型 */
  valueType?: string;
  /** 是否已使用 */
  isUsed: boolean;
  /** 引用计数 */
  referenceCount: number;
  /** 最后修改时间 */
  lastModified: Date;
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
 */
export interface ExportIssue {
  /** 问题ID */
  id: string;
  /** 问题类型 */
  type: ExportIssueType;
  /** 问题严重程度 */
  severity: IssueSeverity;
  /** 问题描述 */
  description: string;
  /** 问题位置 */
  location: FileLocation;
  /** 相关导出信息 */
  relatedExport?: ExportInfo;
  /** 修复建议 */
  suggestions: FixSuggestion[];
  /** 问题上下文 */
  context?: {
    /** 导入语句 */
    imports?: string[];
    /** 导出语句 */
    exports?: string[];
    /** 相关文件 */
    relatedFiles?: string[];
  };
  /** 检测时间 */
  detectedAt: Date;
}

/**
 * 导出问题类型枚举
 */
export const ExportIssueType = {
  /** 未使用的导出 */
  UNUSED_EXPORT: 'unused_export',
  /** 缺失的导出 */
  MISSING_EXPORT: 'missing_export',
  /** 导出不一致 */
  EXPORT_INCONSISTENCY: 'export_inconsistency',
  /** 循环依赖 */
  CIRCULAR_DEPENDENCY: 'circular_dependency',
  /** 类型导出问题 */
  TYPE_EXPORT_ISSUE: 'type_export_issue',
  /** 重命名导出问题 */
  RENAMED_EXPORT_ISSUE: 'renamed_export_issue',
  /** 默认导出冲突 */
  DEFAULT_EXPORT_CONFLICT: 'default_export_conflict',
  /** 命名空间导出问题 */
  NAMESPACE_EXPORT_ISSUE: 'namespace_export_issue',
} as const;

export type ExportIssueType =
  (typeof ExportIssueType)[keyof typeof ExportIssueType];

/**
 * 问题严重程度枚举
 */
export const IssueSeverity = {
  /** 错误 - 必须修复 */
  ERROR: 'error',
  /** 警告 - 建议修复 */
  WARNING: 'warning',
  /** 信息 - 可选修复 */
  INFO: 'info',
  /** 提示 - 最佳实践 */
  HINT: 'hint',
} as const;

export type IssueSeverity = (typeof IssueSeverity)[keyof typeof IssueSeverity];

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
  /** 修复类型 */
  fixType: FixType;
  /** 置信度 (0-1) */
  confidence: number;
  /** 修复代码片段 */
  codeSnippet?: string;
  /** 影响的文件 */
  affectedFiles: string[];
  /** 潜在风险 */
  risks?: string[];
  /** 修复步骤 */
  steps?: FixStep[];
}

/**
 * 修复类型枚举
 */
export const FixType = {
  /** 自动修复 */
  AUTO_FIX: 'auto_fix',
  /** 手动修复 */
  MANUAL_FIX: 'manual_fix',
  /** 重构建议 */
  REFACTOR: 'refactor',
  /** 配置更改 */
  CONFIG_CHANGE: 'config_change',
  /** 文档更新 */
  DOCUMENTATION: 'documentation',
} as const;

export type FixType = (typeof FixType)[keyof typeof FixType];

/**
 * 修复步骤接口
 */
export interface FixStep {
  /** 步骤序号 */
  order: number;
  /** 步骤描述 */
  description: string;
  /** 步骤类型 */
  type: 'file_edit' | 'file_create' | 'file_delete' | 'config_update';
  /** 目标文件 */
  targetFile?: string;
  /** 代码变更 */
  codeChange?: {
    /** 起始位置 */
    start: FileLocation;
    /** 结束位置 */
    end: FileLocation;
    /** 新代码 */
    newCode: string;
    /** 旧代码 */
    oldCode?: string;
  };
}

/**
 * 诊断报告接口
 */
export interface DiagnosticReport {
  /** 报告ID */
  id: string;
  /** 扫描时间 */
  scanTime: Date;
  /** 扫描持续时间 */
  duration: number;
  /** 扫描的文件数量 */
  filesScanned: number;
  /** 发现的问题数量 */
  issuesFound: number;
  /** 按严重程度分组的问题统计 */
  issuesBySeverity: Record<IssueSeverity, number>;
  /** 按类型分组的问题统计 */
  issuesByType: Record<ExportIssueType, number>;
  /** 问题列表 */
  issues: ExportIssue[];
  /** 扫描配置 */
  config: DiagnosticConfig;
  /** 性能指标 */
  performance: {
    /** 内存使用 */
    memoryUsage: number;
    /** CPU使用率 */
    cpuUsage: number;
    /** 文件处理速度 (文件/秒) */
    filesPerSecond: number;
  };
  /** 摘要信息 */
  summary: {
    /** 总导出数 */
    totalExports: number;
    /** 已使用导出数 */
    usedExports: number;
    /** 未使用导出数 */
    unusedExports: number;
    /** 导出使用率 */
    exportUsageRate: number;
  };
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
  maxDepth?: number;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 并发扫描数量 */
  concurrency?: number;
  /** 是否启用缓存 */
  enableCache: boolean;
  /** 缓存过期时间 (毫秒) */
  cacheExpiry: number;
  /** 问题严重程度阈值 */
  severityThreshold: IssueSeverity;
  /** 自定义规则 */
  customRules?: DiagnosticRule[];
  /** TypeScript配置 */
  typescriptConfig?: {
    /** 是否启用严格模式 */
    strict: boolean;
    /** 是否检查类型导出 */
    checkTypeExports: boolean;
    /** 目标ES版本 */
    target: string;
    /** 模块解析策略 */
    moduleResolution?: 'node' | 'classic';
    /** JSX模式 */
    jsx?: 'react' | 'preserve' | 'react-native';
  };
  /** ESLint配置 */
  eslintConfig?: {
    /** 是否启用 */
    enabled: boolean;
    /** 配置文件路径 */
    configFile?: string;
    /** 支持的文件扩展名 */
    extensions?: string[];
  };
  /** 输出配置 */
  output?: {
    /** 输出格式 */
    format: 'json' | 'text' | 'html' | 'console' | 'junit';
    /** 输出文件路径 */
    file?: string;
    /** 是否显示详细信息 */
    verbose?: boolean;
    /** 是否包含修复建议 */
    includeSuggestions?: boolean;
    /** 是否包含代码片段 */
    includeCodeSnippets?: boolean;
  };
  /** 性能配置 */
  performance?: {
    /** 是否启用性能分析 */
    enableProfiling?: boolean;
    /** 最大内存使用量 */
    maxMemoryUsage?: number;
    /** 单个文件超时时间 */
    timeoutPerFile?: number;
  };
}

/**
 * 诊断规则接口
 */
export interface DiagnosticRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 规则类型 */
  type: ExportIssueType;
  /** 规则严重程度 */
  severity: IssueSeverity;
  /** 规则条件 */
  condition: (exportInfo: ExportInfo, context: any) => boolean;
  /** 规则消息 */
  message: string;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 扫描选项接口
 */
export interface ScanOptions {
  /** 扫描根目录 */
  rootDir: string;
  /** 是否递归扫描 */
  recursive: boolean;
  /** 是否包含隐藏文件 */
  includeHidden: boolean;
  /** 是否包含node_modules */
  includeNodeModules: boolean;
  /** 是否包含测试文件 */
  includeTests: boolean;
  /** 并发扫描数量 */
  concurrency: number;
  /** 进度回调 */
  onProgress?: (progress: ScanProgress) => void;
}

/**
 * 扫描进度接口
 */
export interface ScanProgress {
  /** 已处理文件数 */
  processedFiles: number;
  /** 总文件数 */
  totalFiles: number;
  /** 当前处理文件 */
  currentFile?: string;
  /** 已发现问题数 */
  issuesFound: number;
  /** 耗时 (毫秒) */
  elapsedTime: number;
  /** 预计剩余时间 (毫秒) */
  estimatedTimeRemaining?: number;
}

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  /** 文件路径 */
  filePath: string;
  /** 文件修改时间 */
  mtime: number;
  /** 导出信息 */
  exports: ExportInfo[];
  /** 缓存时间 */
  cachedAt: Date;
  /** 缓存版本 */
  version: string;
}

/**
 * 诊断引擎接口
 */
export interface IDiagnosticEngine {
  /** 扫描项目 */
  scan(options: ScanOptions): Promise<DiagnosticReport>;
  /** 分析单个文件 */
  analyzeFile(filePath: string): Promise<ExportIssue[]>;
  /** 生成修复建议 */
  suggestFixes(issues: ExportIssue[]): Promise<FixSuggestion[]>;
  /** 验证修复 */
  validateFixes(fixes: FixSuggestion[]): Promise<ValidationResult[]>;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 修复建议ID */
  fixId: string;
  /** 是否有效 */
  isValid: boolean;
  /** 验证消息 */
  message: string;
  /** 验证详情 */
  details?: any;
}

/**
 * 诊断服务接口
 */
export interface IDiagnosticService {
  /** 执行完整诊断 */
  diagnose(options: ScanOptions): Promise<DiagnosticReport>;
  /** 获取诊断历史 */
  getHistory(): Promise<DiagnosticReport[]>;
  /** 获取诊断配置 */
  getConfig(): Promise<DiagnosticConfig>;
  /** 更新诊断配置 */
  updateConfig(config: Partial<DiagnosticConfig>): Promise<void>;
  /** 清除缓存 */
  clearCache(): Promise<void>;
}

/**
 * 命令行选项接口
 */
export interface CLIOptions {
  /** 扫描目录 */
  dir?: string;
  /** 配置文件路径 */
  config?: string;
  /** 输出格式 */
  format?: 'json' | 'text' | 'html';
  /** 输出文件 */
  output?: string;
  /** 是否显示详细信息 */
  verbose?: boolean;
  /** 是否修复问题 */
  fix?: boolean;
  /** 是否仅检查 */
  dryRun?: boolean;
  /** 帮助信息 */
  help?: boolean;
  /** 版本信息 */
  version?: boolean;
}
