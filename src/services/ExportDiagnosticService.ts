/**
 * Export Diagnostic Service
 * 导出诊断服务的具体实现
 */

import type {
  IDiagnosticService,
  ServiceStatus,
  DiagnosticServiceOptions,
  DiagnosticServiceEvents,
  DiagnosticFilter,
} from './IDiagnosticService';
import type {
  DiagnosticReport,
  ScanOptions,
  DiagnosticConfig,
  ExportIssue,
} from '@/types/exportDiagnostic';
import { ExportDiagnosticEngine } from '@/utils/diagnostic/ExportDiagnosticEngine';
import {
  getCurrentConfig,
  updateCurrentConfig,
} from '@/config/exportDiagnosticConfig';
import {
  DiagnosticServiceError,
  ScanTimeoutError,
  ScanCancelledError,
  InvalidConfigError,
} from './IDiagnosticService';

/**
 * 导出诊断服务实现类
 */
export class ExportDiagnosticService implements IDiagnosticService {
  private engine: ExportDiagnosticEngine;
  private config: DiagnosticConfig;
  private options: DiagnosticServiceOptions;
  private events: DiagnosticServiceEvents;

  // 服务状态
  private isRunning = false;
  private currentScanId: string | null = null;
  private abortController: AbortController | null = null;

  // 统计信息
  private stats = {
    totalScans: 0,
    totalFilesProcessed: 0,
    totalIssuesFound: 0,
    averageScanTime: 0,
    lastScanTime: undefined as Date | undefined,
  };

  // 历史记录
  private history: DiagnosticReport[] = [];

  constructor(
    config?: DiagnosticConfig,
    options: DiagnosticServiceOptions = {},
    events: DiagnosticServiceEvents = {}
  ) {
    this.config = config || getCurrentConfig();
    this.options = {
      concurrency: 5,
      timeout: 30000,
      enableProgress: true,
      progressInterval: 1000,
      enableCache: true,
      cacheExpiry: 5 * 60 * 1000,
      ...options,
    };
    this.events = events;
    this.engine = new ExportDiagnosticEngine(this.config);
  }

  /**
   * 执行完整诊断
   */
  async diagnose(options: ScanOptions): Promise<DiagnosticReport> {
    if (this.isRunning) {
      throw new DiagnosticServiceError(
        'Service is already running a scan',
        'SERVICE_BUSY'
      );
    }

    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentScanId = scanId;
    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      // 触发开始事件
      this.events.onScanStart?.(scanId, options);

      // 设置超时
      const timeoutPromise = this.createTimeoutPromise(scanId);

      // 执行诊断
      const diagnosePromise = this.performDiagnosis(scanId, options);

      // 等待诊断完成或超时
      const report = await Promise.race([diagnosePromise, timeoutPromise]);

      // 更新统计信息
      this.updateStats(report);

      // 保存到历史记录
      this.history.push(report);

      // 限制历史记录数量
      if (this.history.length > 100) {
        this.history = this.history.slice(-100);
      }

      // 触发完成事件
      this.events.onScanComplete?.(scanId, report);

      return report;
    } catch (error) {
      // 触发错误事件
      this.events.onScanError?.(scanId, error as Error);
      throw error;
    } finally {
      this.isRunning = false;
      this.currentScanId = null;
      this.abortController = null;

      // 触发状态变更事件
      this.events.onStatusChange?.(this.getStatusSync());
    }
  }

  /**
   * 执行诊断过程
   */
  private async performDiagnosis(
    scanId: string,
    options: ScanOptions
  ): Promise<DiagnosticReport> {
    const startTime = Date.now();

    // 合并选项
    const scanOptions: ScanOptions = {
      rootDir: options.rootDir,
      recursive: options.recursive ?? true,
      includeHidden: options.includeHidden ?? false,
      includeNodeModules: options.includeNodeModules ?? false,
      includeTests: options.includeTests ?? false,
      concurrency: options.concurrency ?? this.options.concurrency ?? 5,
    };

    // 添加进度回调
    if (this.options.enableProgress) {
      scanOptions.onProgress = progress => {
        this.events.onScanProgress?.(scanId, progress);

        // 检查是否被取消
        if (this.abortController?.signal.aborted) {
          throw new ScanCancelledError(scanId);
        }
      };
    }

    // 执行诊断
    const report = await this.engine.diagnose(scanOptions);

    // 检查是否被取消
    if (this.abortController?.signal.aborted) {
      throw new ScanCancelledError(scanId);
    }

    return report;
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise(scanId: string): Promise<never> {
    return new Promise((_, reject) => {
      const timeout = this.options.timeout || 30000;
      setTimeout(() => {
        reject(new ScanTimeoutError(scanId, timeout));
      }, timeout);
    });
  }

  /**
   * 更新统计信息
   */
  private updateStats(report: DiagnosticReport): void {
    this.stats.totalScans++;
    this.stats.totalFilesProcessed += report.filesScanned;
    this.stats.totalIssuesFound += report.issuesFound;
    this.stats.lastScanTime = new Date();

    // 计算平均扫描时间
    const totalTime =
      this.history.reduce((sum, r) => sum + r.duration, 0) + report.duration;
    this.stats.averageScanTime = totalTime / this.stats.totalScans;
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
  async updateConfig(config: Partial<DiagnosticConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    updateCurrentConfig(config);
    this.engine.updateConfig(config);
  }

  /**
   * 清除诊断缓存
   */
  async clearCache(): Promise<void> {
    this.engine.clearCache();
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(filePath: string): Promise<ExportIssue[]> {
    return await this.engine.analyzeFile(filePath);
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<ServiceStatus> {
    return this.getStatusSync();
  }

  /**
   * 同步获取服务状态
   */
  private getStatusSync(): ServiceStatus {
    return {
      isRunning: this.isRunning,
      currentScan: this.currentScanId
        ? {
            id: this.currentScanId,
            startTime: new Date(Date.now() - 1000), // 估算开始时间
            processedFiles: 0, // 需要从引擎获取实际进度
            totalFiles: 0,
            issuesFound: 0,
          }
        : undefined,
      stats: { ...this.stats },
      cache: {
        size: 0, // 需要实现缓存大小计算
        entries: 0,
      },
    };
  }

  /**
   * 停止正在进行的诊断
   */
  async stop(): Promise<void> {
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
    }
  }

  /**
   * 过滤诊断结果
   */
  filterResults(
    report: DiagnosticReport,
    filter: DiagnosticFilter
  ): DiagnosticReport {
    let filteredIssues = [...report.issues];

    // 按严重程度过滤
    if (filter.severity && filter.severity.length > 0) {
      filteredIssues = filteredIssues.filter(issue =>
        filter.severity!.includes(issue.severity as any)
      );
    }

    // 按问题类型过滤
    if (filter.types && filter.types.length > 0) {
      filteredIssues = filteredIssues.filter(issue =>
        filter.types!.includes(issue.type)
      );
    }

    // 按文件路径过滤
    if (filter.filePatterns && filter.filePatterns.length > 0) {
      filteredIssues = filteredIssues.filter(issue => {
        const filePath = issue.location.filePath;
        return filter.filePatterns!.some(pattern =>
          filePath.includes(pattern.replace('*', ''))
        );
      });
    }

    // 排除文件路径
    if (filter.excludePatterns && filter.excludePatterns.length > 0) {
      filteredIssues = filteredIssues.filter(issue => {
        const filePath = issue.location.filePath;
        return !filter.excludePatterns!.some(pattern =>
          filePath.includes(pattern.replace('*', ''))
        );
      });
    }

    // 限制问题数量
    if (filter.maxIssues && filteredIssues.length > filter.maxIssues) {
      filteredIssues = filteredIssues.slice(0, filter.maxIssues);
    }

    // 重新计算统计信息
    const issuesBySeverity = {
      error: 0,
      warning: 0,
      info: 0,
      hint: 0,
    };

    const issuesByType: Record<string, number> = {};

    filteredIssues.forEach(issue => {
      issuesBySeverity[issue.severity as keyof typeof issuesBySeverity]++;
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    return {
      ...report,
      issuesFound: filteredIssues.length,
      issuesBySeverity,
      issuesByType,
      issues: filteredIssues,
    };
  }

  /**
   * 导出诊断结果
   */
  exportResults(
    report: DiagnosticReport,
    format: 'json' | 'text' | 'html' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'text':
        return this.formatAsText(report);

      case 'html':
        return this.formatAsHtml(report);

      default:
        throw new DiagnosticServiceError(
          `Unsupported export format: ${format}`,
          'INVALID_FORMAT'
        );
    }
  }

  /**
   * 格式化为文本
   */
  private formatAsText(report: DiagnosticReport): string {
    let output = `Export Diagnostic Report\n`;
    output += `========================\n\n`;
    output += `Scan Time: ${report.scanTime.toISOString()}\n`;
    output += `Duration: ${report.duration}ms\n`;
    output += `Files Scanned: ${report.filesScanned}\n`;
    output += `Issues Found: ${report.issuesFound}\n\n`;

    output += `Issues by Severity:\n`;
    Object.entries(report.issuesBySeverity).forEach(([severity, count]) => {
      output += `  ${severity}: ${count}\n`;
    });

    output += `\nIssues by Type:\n`;
    Object.entries(report.issuesByType).forEach(([type, count]) => {
      output += `  ${type}: ${count}\n`;
    });

    output += `\nDetailed Issues:\n`;
    report.issues.forEach((issue, index) => {
      output += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}\n`;
      output += `   File: ${issue.location.filePath}:${issue.location.line}\n`;
      if (issue.suggestions && issue.suggestions.length > 0) {
        output += `   Suggestions: ${issue.suggestions.length}\n`;
      }
      output += `\n`;
    });

    return output;
  }

  /**
   * 格式化为HTML
   */
  private formatAsHtml(report: DiagnosticReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Export Diagnostic Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 10px; border-radius: 5px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e8f4fd; padding: 10px; border-radius: 5px; }
        .issues { margin-top: 20px; }
        .issue { border: 1px solid #ddd; margin: 10px 0; padding: 10px; border-radius: 5px; }
        .error { border-color: #ff6b6b; background: #ffeaea; }
        .warning { border-color: #ffd93d; background: #fff9e6; }
        .info { border-color: #4ecdc4; background: #e6f7f7; }
        .hint { border-color: #a8a8a8; background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Export Diagnostic Report</h1>
        <p>Generated on ${report.scanTime.toISOString()}</p>
    </div>

    <div class="stats">
        <div class="stat">
            <strong>Files Scanned:</strong> ${report.filesScanned}
        </div>
        <div class="stat">
            <strong>Issues Found:</strong> ${report.issuesFound}
        </div>
        <div class="stat">
            <strong>Duration:</strong> ${report.duration}ms
        </div>
    </div>

    <div class="issues">
        <h2>Issues (${report.issuesFound})</h2>
        ${report.issues
          .map(
            issue => `
            <div class="issue ${issue.severity}">
                <h3>[${issue.severity.toUpperCase()}] ${issue.description}</h3>
                <p><strong>File:</strong> ${issue.location.filePath}:${issue.location.line}</p>
                ${
                  issue.suggestions && issue.suggestions.length > 0
                    ? `<p><strong>Suggestions:</strong> ${issue.suggestions.length} available</p>`
                    : ''
                }
            </div>
        `
          )
          .join('')}
    </div>
</body>
</html>`;
  }
}

/**
 * 默认诊断服务实例
 */
export const exportDiagnosticService = new ExportDiagnosticService();
