/**
 * 导出一致性系统的核心类型定义
 * 用于分析和修复TypeScript模块导出的一致性问题
 */

/**
 * 源代码位置信息
 */
export interface SourceLocation {
  /** 文件路径 */
  filePath: string;
  /** 起始行号 */
  startLine: number;
  /** 结束行号 */
  endLine: number;
  /** 起始列号 */
  startColumn: number;
  /** 结束列号 */
  endColumn: number;
}

/**
 * 导出信息
 */
export interface ExportInfo {
  /** 文件路径 */
  filePath: string;
  /** 导出类型 */
  exportType: 'named' | 'default' | 'namespace' | 'reexport';
  /** 导出名称 */
  exportName: string;
  /** 导出的类型 */
  exportedType:
    | 'interface'
    | 'type'
    | 'class'
    | 'function'
    | 'constant'
    | 'component';
  /** 是否仅类型导出 */
  isTypeOnly: boolean;
  /** 源代码位置 */
  sourceLocation: SourceLocation;
  /** 依赖项 */
  dependencies: string[];
  /** 文档注释 */
  documentation?: string;
}

/**
 * 一致性问题类型
 */
export type ConsistencyIssueType =
  | 'missing-export'
  | 'naming-inconsistency'
  | 'circular-dependency'
  | 'unused-export'
  | 'import-mismatch'
  | 'duplicate-export'
  | 'type-export-mismatch';

/**
 * 问题严重程度
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * 一致性问题
 */
export interface ConsistencyIssue {
  /** 问题唯一标识 */
  id: string;
  /** 问题类型 */
  type: ConsistencyIssueType;
  /** 严重程度 */
  severity: IssueSeverity;
  /** 文件路径 */
  filePath: string;
  /** 问题描述 */
  message: string;
  /** 修复建议 */
  suggestion?: string;
  /** 是否可自动修复 */
  autoFixable: boolean;
  /** 相关文件 */
  relatedFiles: string[];
  /** 源代码位置 */
  sourceLocation?: SourceLocation;
}

/**
 * 文件变更
 */
export interface FileChange {
  /** 文件路径 */
  filePath: string;
  /** 变更类型 */
  changeType: 'create' | 'modify' | 'delete';
  /** 原始内容 */
  originalContent?: string;
  /** 新内容 */
  newContent: string;
  /** 变更描述 */
  description: string;
}

/**
 * 修复建议
 */
export interface FixSuggestion {
  /** 关联的问题ID */
  issueId: string;
  /** 修复描述 */
  description: string;
  /** 文件变更列表 */
  changes: FileChange[];
  /** 修复置信度 (0-1) */
  confidence: number;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
  /** 预览差异 */
  previewDiff: string;
}

/**
 * 修复结果
 */
export interface FixResult {
  /** 是否成功 */
  success: boolean;
  /** 修复的问题ID */
  issueId: string;
  /** 应用的变更 */
  appliedChanges: FileChange[];
  /** 错误信息 */
  error?: string;
  /** 备份文件路径 */
  backupPaths?: string[];
}

/**
 * 项目分析结果摘要
 */
export interface AnalysisSummary {
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
  /** 已修复数量 */
  fixedCount: number;
  /** 成功率 */
  successRate: number;
  /** 总问题数 */
  totalIssues: number;
  /** 可自动修复的问题数 */
  autoFixableCount: number;
}

/**
 * 项目分析结果
 */
export interface ProjectAnalysisResult {
  /** 项目路径 */
  projectPath: string;
  /** 扫描时间戳 */
  scanTimestamp: string;
  /** 总文件数 */
  totalFiles: number;
  /** 已分析文件数 */
  analyzedFiles: number;
  /** 发现的问题 */
  issues: ConsistencyIssue[];
  /** 已修复的问题 */
  fixedIssues: ConsistencyIssue[];
  /** 结果摘要 */
  summary: AnalysisSummary;
  /** 扫描配置 */
  config?: ExportConfig;
}

/**
 * 导出扫描选项
 */
export interface ExportScanOptions {
  /** 包含的文件模式 */
  include: string[];
  /** 排除的文件模式 */
  exclude: string[];
  /** 是否递归扫描 */
  recursive: boolean;
  /** 最大扫描深度 */
  maxDepth?: number;
  /** 是否跟踪符号链接 */
  followSymlinks: boolean;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 文件扩展名 */
  extension: string;
  /** 文件大小 */
  size: number;
  /** 最后修改时间 */
  lastModified: Date;
  /** 是否为TypeScript文件 */
  isTypeScript: boolean;
}

/**
 * 文件元数据
 */
export interface FileMetadata {
  /** 基本文件信息 */
  fileInfo: FileInfo;
  /** 导出信息 */
  exports: ExportInfo[];
  /** 导入信息 */
  imports: string[];
  /** 依赖关系 */
  dependencies: string[];
  /** 是否有语法错误 */
  hasSyntaxErrors: boolean;
  /** 语法错误信息 */
  syntaxErrors?: string[];
}

/**
 * 导出规则配置
 */
export interface ExportRule {
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 严重程度 */
  severity: IssueSeverity;
  /** 规则选项 */
  options?: Record<string, any>;
}

/**
 * 导出一致性配置
 */
export interface ExportConfig {
  /** 项目根路径 */
  rootPath: string;
  /** 扫描选项 */
  scanOptions: ScanOptions;
  /** 导出规则 */
  rules: ExportRule[];
  /** 命名约定 */
  namingConventions: {
    /** 接口命名模式 */
    interfaces: string;
    /** 类型命名模式 */
    types: string;
    /** 组件命名模式 */
    components: string;
    /** 函数命名模式 */
    functions: string;
  };
  /** 自动修复选项 */
  autoFix: {
    /** 是否启用自动修复 */
    enabled: boolean;
    /** 是否创建备份 */
    createBackup: boolean;
    /** 最大风险等级 */
    maxRiskLevel: 'low' | 'medium' | 'high';
  };
  /** 报告选项 */
  reporting: {
    /** 输出格式 */
    format: 'console' | 'json' | 'html' | 'markdown';
    /** 输出路径 */
    outputPath?: string;
    /** 是否包含详细信息 */
    verbose: boolean;
  };
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 解析的导出语句
 */
export interface ParsedExport {
  /** 原始语句 */
  statement: string;
  /** 导出类型 */
  type: ExportInfo['exportType'];
  /** 导出名称 */
  name: string;
  /** 是否为类型导出 */
  isTypeOnly: boolean;
  /** 源模块路径 */
  from?: string;
  /** 源代码位置 */
  location: SourceLocation;
}

/**
 * 命名问题
 */
export interface NamingIssue {
  /** 文件路径 */
  filePath: string;
  /** 导出名称 */
  exportName: string;
  /** 期望的命名模式 */
  expectedPattern: string;
  /** 建议的名称 */
  suggestedName: string;
  /** 问题描述 */
  description: string;
}

/**
 * 导入导出匹配问题
 */
export interface MatchingIssue {
  /** 导入文件路径 */
  importerPath: string;
  /** 导出文件路径 */
  exporterPath: string;
  /** 导入名称 */
  importName: string;
  /** 问题类型 */
  issueType: 'not-found' | 'type-mismatch' | 'circular';
  /** 问题描述 */
  description: string;
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  /** 项目路径 */
  path: string;
  /** 项目名称 */
  name: string;
  /** 文件列表 */
  files: FileMetadata[];
  /** 配置信息 */
  config: ExportConfig;
}

/**
 * 一致性报告
 */
export interface ConsistencyReport {
  /** 项目信息 */
  project: ProjectInfo;
  /** 发现的问题 */
  issues: ConsistencyIssue[];
  /** 命名问题 */
  namingIssues: NamingIssue[];
  /** 匹配问题 */
  matchingIssues: MatchingIssue[];
  /** 分析摘要 */
  summary: AnalysisSummary;
  /** 生成时间 */
  generatedAt: string;
}

/**
 * 修复选项
 */
export interface FixOptions {
  /** 是否为试运行 */
  dryRun: boolean;
  /** 是否创建备份 */
  createBackup: boolean;
  /** 最大风险等级 */
  maxRiskLevel: 'low' | 'medium' | 'high';
  /** 要修复的问题类型 */
  issueTypes?: ConsistencyIssueType[];
  /** 要修复的文件 */
  targetFiles?: string[];
}

/**
 * 报告格式
 */
export type ReportFormat = 'console' | 'json' | 'html' | 'markdown';

/**
 * 报告摘要
 */
export interface ReportSummary {
  /** 总问题数 */
  totalIssues: number;
  /** 按严重程度分组的问题数 */
  issuesBySeverity: Record<IssueSeverity, number>;
  /** 按类型分组的问题数 */
  issuesByType: Record<ConsistencyIssueType, number>;
  /** 可自动修复的问题数 */
  autoFixableIssues: number;
  /** 分析的文件数 */
  analyzedFiles: number;
  /** 有问题的文件数 */
  filesWithIssues: number;
}
