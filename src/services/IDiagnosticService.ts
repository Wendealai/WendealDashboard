/**
 * Diagnostic Service Interface
 * 诊断服务接口
 */

import type {
  DiagnosticConfig,
  DiagnosticReport,
  ScanOptions,
  ValidationResult,
} from '@/types/exportDiagnostic';

/**
 * 诊断服务接口
 * 定义诊断服务的契约和方法签名
 */
export interface IDiagnosticService {
  /**
   * 执行完整诊断流程
   * @param options 扫描选项
   * @returns 诊断报告
   */
  diagnose(options: ScanOptions): Promise<DiagnosticReport>;

  /**
   * 获取诊断历史记录
   * @returns 历史诊断报告列表
   */
  getHistory(): Promise<DiagnosticReport[]>;

  /**
   * 获取当前诊断配置
   * @returns 当前配置
   */
  getConfig(): Promise<DiagnosticConfig>;

  /**
   * 更新诊断配置
   * @param config 新的配置对象
   */
  updateConfig(config: Partial<DiagnosticConfig>): Promise<void>;

  /**
   * 清除诊断缓存
   */
  clearCache(): Promise<void>;

  /**
   * 验证修复建议
   * @param fixes 修复建议列表
   * @returns 验证结果列表
   */
  validateFixes?(fixes: any[]): Promise<ValidationResult[]>;

  /**
   * 获取服务状态
   * @returns 服务状态信息
   */
  getStatus?(): Promise<{
    isRunning: boolean;
    activeScans: number;
    cacheSize: number;
    lastScanTime?: Date;
  }>;

  /**
   * 停止正在进行的诊断
   */
  stop?(): Promise<void>;
}

/**
 * 诊断服务工厂接口
 */
export interface IDiagnosticServiceFactory {
  /**
   * 创建诊断服务实例
   * @param config 诊断配置
   * @returns 诊断服务实例
   */
  createService(config: DiagnosticConfig): IDiagnosticService;

  /**
   * 获取支持的服务类型
   * @returns 支持的服务类型列表
   */
  getSupportedTypes(): string[];

  /**
   * 验证配置兼容性
   * @param config 诊断配置
   * @returns 配置是否兼容
   */
  isConfigCompatible(config: DiagnosticConfig): boolean;
}

/**
 * 诊断服务事件接口
 */
export interface IDiagnosticServiceEvents {
  /**
   * 诊断开始事件
   */
  onScanStarted?: (options: ScanOptions) => void;

  /**
   * 诊断进度事件
   */
  onScanProgress?: (progress: {
    processedFiles: number;
    totalFiles: number;
    currentFile?: string;
    issuesFound: number;
    elapsedTime: number;
  }) => void;

  /**
   * 诊断完成事件
   */
  onScanCompleted?: (report: DiagnosticReport) => void;

  /**
   * 诊断错误事件
   */
  onScanError?: (error: Error, options: ScanOptions) => void;

  /**
   * 配置更新事件
   */
  onConfigUpdated?: (
    oldConfig: DiagnosticConfig,
    newConfig: DiagnosticConfig
  ) => void;

  /**
   * 缓存清除事件
   */
  onCacheCleared?: () => void;
}

/**
 * 诊断服务选项接口
 */
export interface DiagnosticServiceOptions {
  /** 启用事件监听 */
  enableEvents?: boolean;
  /** 事件处理器 */
  events?: IDiagnosticServiceEvents;
  /** 自定义超时时间 */
  timeout?: number;
  /** 重试次数 */
  retryAttempts?: number;
  /** 重试延迟 */
  retryDelay?: number;
}

/**
 * 诊断服务元数据接口
 */
export interface DiagnosticServiceMetadata {
  /** 服务名称 */
  name: string;
  /** 服务版本 */
  version: string;
  /** 服务描述 */
  description: string;
  /** 支持的功能 */
  capabilities: string[];
  /** 作者信息 */
  author: string;
  /** 许可证 */
  license: string;
  /** 仓库地址 */
  repository?: string;
  /** 问题报告地址 */
  issues?: string;
  /** 主页 */
  homepage?: string;
}

/**
 * 诊断服务健康检查接口
 */
export interface DiagnosticServiceHealth {
  /** 服务是否健康 */
  healthy: boolean;
  /** 健康检查时间 */
  checkedAt: Date;
  /** 响应时间 (毫秒) */
  responseTime: number;
  /** 错误信息 */
  error?: string;
  /** 详细信息 */
  details?: {
    memoryUsage?: number;
    activeConnections?: number;
    cacheHitRate?: number;
    averageScanTime?: number;
  };
}

/**
 * 诊断服务统计接口
 */
export interface DiagnosticServiceStats {
  /** 总扫描次数 */
  totalScans: number;
  /** 成功扫描次数 */
  successfulScans: number;
  /** 失败扫描次数 */
  failedScans: number;
  /** 总处理文件数 */
  totalFilesProcessed: number;
  /** 总发现问题数 */
  totalIssuesFound: number;
  /** 缓存命中次数 */
  cacheHits: number;
  /** 缓存未命中次数 */
  cacheMisses: number;
  /** 平均扫描时间 */
  averageScanTime: number;
  /** 最后扫描时间 */
  lastScanTime?: Date;
  /** 服务运行时间 */
  uptime: number;
}
