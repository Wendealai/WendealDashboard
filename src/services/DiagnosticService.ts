/**
 * Diagnostic Service Implementation
 * 诊断服务实现
 */

import type {
  IDiagnosticService,
  IDiagnosticServiceEvents,
  DiagnosticServiceOptions,
  DiagnosticServiceMetadata,
  DiagnosticServiceHealth,
  DiagnosticServiceStats,
} from './IDiagnosticService';
import type {
  DiagnosticConfig,
  DiagnosticReport,
  ScanOptions,
  ValidationResult,
} from '@/types/exportDiagnostic';
import { DiagnosticEngine } from '@/utils/diagnostic/DiagnosticEngine';
import {
  getConfigForEnvironment,
  validateConfig,
} from '@/config/exportDiagnosticConfig';

/**
 * 诊断服务实现类
 */
export class DiagnosticService implements IDiagnosticService {
  private config: DiagnosticConfig;
  private engine: DiagnosticEngine;
  private options: DiagnosticServiceOptions;
  private events: IDiagnosticServiceEvents;
  private history: DiagnosticReport[] = [];
  private isScanning = false;
  private startTime: Date;
  private stats: DiagnosticServiceStats;

  constructor(
    config: DiagnosticConfig,
    options: DiagnosticServiceOptions = {}
  ) {
    // 验证配置
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    this.config = config;
    this.options = options;
    this.events = options.events || {};
    this.startTime = new Date();

    // 初始化引擎
    this.engine = new DiagnosticEngine(config);

    // 初始化统计信息
    this.stats = {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      totalFilesProcessed: 0,
      totalIssuesFound: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageScanTime: 0,
      uptime: 0,
    };
  }

  /**
   * 执行完整诊断流程
   */
  async diagnose(options: ScanOptions): Promise<DiagnosticReport> {
    if (this.isScanning) {
      throw new Error('诊断正在进行中，请等待完成后再开始新的诊断');
    }

    const scanStartTime = Date.now();
    this.isScanning = true;

    try {
      // 触发开始事件
      this.events.onScanStarted?.(options);

      // 执行诊断
      const report = await this.engine.diagnose({
        ...options,
        onProgress: progress => {
          this.events.onScanProgress?.(progress);
        },
      });

      // 更新统计信息
      this.stats.totalScans++;
      this.stats.successfulScans++;
      this.stats.totalFilesProcessed += report.filesScanned;
      this.stats.totalIssuesFound += report.issues.length;

      const scanTime = Date.now() - scanStartTime;
      this.stats.averageScanTime =
        (this.stats.averageScanTime * (this.stats.totalScans - 1) + scanTime) /
        this.stats.totalScans;

      // 添加到历史记录
      this.history.push(report);
      // 限制历史记录数量
      if (this.history.length > 100) {
        this.history = this.history.slice(-100);
      }

      // 触发完成事件
      this.events.onScanCompleted?.(report);

      return report;
    } catch (error) {
      // 更新失败统计
      this.stats.totalScans++;
      this.stats.failedScans++;

      // 触发错误事件
      this.events.onScanError?.(error as Error, options);

      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * 获取诊断历史记录
   */
  async getHistory(): Promise<DiagnosticReport[]> {
    return [...this.history];
  }

  /**
   * 获取当前诊断配置
   */
  async getConfig(): Promise<DiagnosticConfig> {
    return { ...this.config };
  }

  /**
   * 更新诊断配置
   */
  async updateConfig(updates: Partial<DiagnosticConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    const newConfig = { ...this.config, ...updates };

    // 验证新配置
    const validation = validateConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`配置更新失败: ${validation.errors.join(', ')}`);
    }

    // 更新配置
    this.config = newConfig;

    // 重新初始化引擎
    this.engine = new DiagnosticEngine(newConfig);

    // 触发配置更新事件
    this.events.onConfigUpdated?.(oldConfig, newConfig);
  }

  /**
   * 清除诊断缓存
   */
  async clearCache(): Promise<void> {
    await this.engine.clearCache();
    this.events.onCacheCleared?.();
  }

  /**
   * 验证修复建议
   */
  async validateFixes(fixes: any[]): Promise<ValidationResult[]> {
    // 这里可以实现修复建议验证逻辑
    // 目前返回空数组，表示所有修复都有效
    return fixes.map(fix => ({
      fixId: fix.id,
      isValid: true,
      message: '修复建议有效',
    }));
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    activeScans: number;
    cacheSize: number;
    lastScanTime?: Date;
  }> {
    const engineStats = this.engine.getStats();

    const result: {
      isRunning: boolean;
      activeScans: number;
      cacheSize: number;
      lastScanTime?: Date;
    } = {
      isRunning: this.isScanning,
      activeScans: this.isScanning ? 1 : 0,
      cacheSize: engineStats.cacheHits + engineStats.cacheMisses,
    };

    if (this.history.length > 0) {
      result.lastScanTime = this.history[this.history.length - 1]!.scanTime;
    }

    return result;
  }

  /**
   * 停止正在进行的诊断
   */
  async stop(): Promise<void> {
    // 这里可以实现停止逻辑
    // 目前只是设置标志
    this.isScanning = false;
  }

  /**
   * 获取服务元数据
   */
  getMetadata(): DiagnosticServiceMetadata {
    return {
      name: 'Export Diagnostic Service',
      version: '1.0.0',
      description: 'TypeScript/JavaScript导出诊断服务',
      capabilities: [
        'export-analysis',
        'dependency-analysis',
        'typescript-integration',
        'eslint-integration',
        'caching',
        'fix-suggestions',
      ],
      author: 'AI Assistant',
      license: 'MIT',
      repository: 'https://github.com/example/export-diagnostic',
    };
  }

  /**
   * 执行健康检查
   */
  async healthCheck(): Promise<DiagnosticServiceHealth> {
    const checkStart = Date.now();

    try {
      // 简单的健康检查：验证配置有效性
      const configValid = validateConfig(this.config).valid;
      if (!configValid) {
        throw new Error('配置无效');
      }

      // 检查引擎状态
      const status = await this.getStatus();

      const responseTime = Date.now() - checkStart;

      return {
        healthy: true,
        checkedAt: new Date(),
        responseTime,
        details: {
          memoryUsage: 0, // TODO: 实现内存使用统计
          activeConnections: status.activeScans,
          cacheHitRate:
            this.stats.totalScans > 0
              ? this.stats.cacheHits /
                (this.stats.cacheHits + this.stats.cacheMisses)
              : 0,
          averageScanTime: this.stats.averageScanTime,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        checkedAt: new Date(),
        responseTime: Date.now() - checkStart,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 获取服务统计信息
   */
  getStats(): DiagnosticServiceStats {
    const baseStats = {
      ...this.stats,
      uptime: Date.now() - this.startTime.getTime(),
    };

    if (this.history.length > 0) {
      return {
        ...baseStats,
        lastScanTime: this.history[this.history.length - 1]!.scanTime,
      };
    }

    return baseStats;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      totalFilesProcessed: 0,
      totalIssuesFound: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageScanTime: 0,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * 导出服务状态
   */
  exportState(): {
    config: DiagnosticConfig;
    stats: DiagnosticServiceStats;
    history: DiagnosticReport[];
    metadata: DiagnosticServiceMetadata;
  } {
    return {
      config: this.config,
      stats: this.getStats(),
      history: this.history,
      metadata: this.getMetadata(),
    };
  }

  /**
   * 导入服务状态
   */
  importState(state: {
    config?: DiagnosticConfig;
    stats?: Partial<DiagnosticServiceStats>;
    history?: DiagnosticReport[];
  }): void {
    if (state.config) {
      this.config = state.config;
      this.engine = new DiagnosticEngine(state.config);
    }

    if (state.stats) {
      this.stats = { ...this.stats, ...state.stats };
    }

    if (state.history) {
      this.history = state.history;
    }
  }
}

/**
 * 创建诊断服务实例的工厂函数
 */
export function createDiagnosticService(
  config?: Partial<DiagnosticConfig>,
  options?: DiagnosticServiceOptions
): DiagnosticService {
  const defaultConfig = getConfigForEnvironment();
  const finalConfig = config ? { ...defaultConfig, ...config } : defaultConfig;

  return new DiagnosticService(finalConfig, options);
}

/**
 * 默认诊断服务实例
 */
export const diagnosticService = createDiagnosticService();
