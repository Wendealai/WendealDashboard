/**
 * Export Diagnostic Engine
 * 导出诊断流程协调和结果整合
 */

import {
  IssueSeverity,
  type ExportInfo,
  type ExportIssue,
  type DiagnosticReport,
  type ScanOptions,
  type ScanProgress,
  type DiagnosticConfig,
} from '@/types/exportDiagnostic';
import { FileScanner } from './FileScanner';
import { ExportAnalyzer } from './ExportAnalyzer';
import { DependencyResolver } from './DependencyResolver';
import { FixSuggester } from './FixSuggester';

/**
 * 诊断引擎类
 */
export class ExportDiagnosticEngine {
  private config: DiagnosticConfig;
  private fileScanner: FileScanner;
  private exportAnalyzer: ExportAnalyzer;
  private dependencyResolver: DependencyResolver;
  private fixSuggester: FixSuggester;

  constructor(config: DiagnosticConfig) {
    this.config = config;
    this.fileScanner = new FileScanner(config);
    this.exportAnalyzer = new ExportAnalyzer(config);
    this.dependencyResolver = new DependencyResolver(config);
    this.fixSuggester = new FixSuggester(config);
  }

  /**
   * 执行完整的诊断流程
   */
  async diagnose(options: ScanOptions): Promise<DiagnosticReport> {
    const startTime = Date.now();
    const progressCallback = options.onProgress;

    try {
      // 阶段1: 文件扫描
      progressCallback?.({
        processedFiles: 0,
        totalFiles: 0,
        issuesFound: 0,
        elapsedTime: 0,
      });

      const scanResult = await this.performFileScan(options, progressCallback);

      // 阶段2: 依赖分析
      progressCallback?.({
        processedFiles: scanResult.files.length,
        totalFiles: scanResult.files.length,
        issuesFound: 0,
        elapsedTime: Date.now() - startTime,
      });

      const dependencyGraph =
        await this.dependencyResolver.buildDependencyGraph(
          scanResult.files,
          scanResult.exports
        );

      // 阶段3: 导出分析
      const exportIssues = this.exportAnalyzer.analyzeExports(
        scanResult.exports
      );

      // 阶段4: 依赖问题分析
      const dependencyIssues =
        this.dependencyResolver.analyzeDependencyIssues();

      // 阶段5: 合并和排序问题
      const allIssues = this.mergeAndSortIssues([
        ...exportIssues,
        ...dependencyIssues,
      ]);

      // 阶段6: 生成修复建议
      const fixSuggestions = this.fixSuggester.suggestFixes(allIssues);

      // 阶段7: 生成报告
      const report = this.generateReport(
        scanResult.files.length,
        scanResult.exports.length,
        allIssues,
        fixSuggestions,
        startTime
      );

      return report;
    } catch (error) {
      throw new Error(`Diagnostic failed: ${error}`);
    }
  }

  /**
   * 执行文件扫描
   */
  private async performFileScan(
    options: ScanOptions,
    progressCallback?: (progress: ScanProgress) => void
  ): Promise<{ files: string[]; exports: ExportInfo[] }> {
    // 获取所有匹配的文件
    const allFiles = await this.getAllMatchingFiles(options);

    // 扫描导出
    const scanOptions: ScanOptions = {
      ...options,
      ...(progressCallback && { onProgress: progressCallback }),
    };
    const allExports = await this.fileScanner.scanDirectory(
      options.rootDir,
      scanOptions,
      progressCallback
    );

    return {
      files: allFiles,
      exports: allExports,
    };
  }

  /**
   * 获取所有匹配的文件
   */
  private async getAllMatchingFiles(options: ScanOptions): Promise<string[]> {
    const { FileSystemUtils, PathResolver } = await import(
      '@/utils/exportDiagnosticUtils'
    );

    const allFiles = await FileSystemUtils.getAllFiles(
      options.rootDir,
      this.config.maxDepth
    );

    return allFiles.filter(filePath => {
      // 检查文件类型
      if (!PathResolver.isSourceFile(filePath)) {
        return false;
      }

      // 检查文件模式匹配
      const relativePath = PathResolver.getRelativePath(
        options.rootDir,
        filePath
      );
      const matchesPattern = this.config.filePatterns.some(pattern =>
        PathResolver.matchesPattern(relativePath, [pattern])
      );

      if (!matchesPattern) {
        return false;
      }

      // 检查是否应该忽略
      const shouldIgnore = PathResolver.shouldIgnore(
        relativePath,
        this.config.ignorePatterns
      );
      if (shouldIgnore) {
        return false;
      }

      // 检查递归选项
      if (
        !options.recursive &&
        PathResolver.getRelativePath(options.rootDir, filePath).includes('/')
      ) {
        return false;
      }

      // 检查隐藏文件选项
      if (
        !options.includeHidden &&
        PathResolver.getExtension(filePath).startsWith('.')
      ) {
        return false;
      }

      // 检查node_modules
      if (
        !options.includeNodeModules &&
        relativePath.includes('node_modules')
      ) {
        return false;
      }

      // 检查测试文件
      if (
        !options.includeTests &&
        (relativePath.includes('.test.') ||
          relativePath.includes('.spec.') ||
          relativePath.includes('/__tests__/') ||
          relativePath.includes('/tests/'))
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * 合并和排序问题
   */
  private mergeAndSortIssues(issues: ExportIssue[]): ExportIssue[] {
    // 去重
    const uniqueIssues = this.deduplicateIssues(issues);

    // 按优先级排序
    return uniqueIssues.sort((a, b) => {
      // 首先按严重程度排序
      const severityOrder = {
        [IssueSeverity.ERROR]: 4,
        [IssueSeverity.WARNING]: 3,
        [IssueSeverity.INFO]: 2,
        [IssueSeverity.HINT]: 1,
      };

      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity; // 错误优先
      }

      // 然后按位置排序（文件路径和行号）
      const aPath = a.location.filePath;
      const bPath = b.location.filePath;

      if (aPath !== bPath) {
        return aPath.localeCompare(bPath);
      }

      return a.location.line - b.location.line;
    });
  }

  /**
   * 去重问题
   */
  private deduplicateIssues(issues: ExportIssue[]): ExportIssue[] {
    const seen = new Set<string>();
    const unique: ExportIssue[] = [];

    for (const issue of issues) {
      const key = `${issue.type}-${issue.location.filePath}-${issue.location.line}-${issue.description}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    return unique;
  }

  /**
   * 生成诊断报告
   */
  private generateReport(
    filesScanned: number,
    exportsFound: number,
    issues: ExportIssue[],
    suggestions: any[],
    startTime: number
  ): DiagnosticReport {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 统计问题按严重程度
    const issuesBySeverity = {
      [IssueSeverity.ERROR]: 0,
      [IssueSeverity.WARNING]: 0,
      [IssueSeverity.INFO]: 0,
      [IssueSeverity.HINT]: 0,
    };

    // 统计问题按类型
    const issuesByType: Record<string, number> = {};

    issues.forEach(issue => {
      issuesBySeverity[issue.severity]++;
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    // 计算导出使用率
    const usedExports =
      exportsFound - issues.filter(i => i.type === 'unused_export').length;
    const exportUsageRate = exportsFound > 0 ? usedExports / exportsFound : 0;

    return {
      id: `diagnostic-${Date.now()}`,
      scanTime: new Date(startTime),
      duration,
      filesScanned,
      issuesFound: issues.length,
      issuesBySeverity,
      issuesByType,
      issues,
      config: this.config,
      performance: {
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: 0, // 暂时不支持CPU使用率统计
        filesPerSecond: filesScanned / (duration / 1000),
      },
      summary: {
        totalExports: exportsFound,
        usedExports,
        unusedExports: exportsFound - usedExports,
        exportUsageRate,
      },
    };
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    }
    return 0;
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(filePath: string): Promise<ExportIssue[]> {
    try {
      const exports = await this.fileScanner.scanFile(filePath);
      const issues = this.exportAnalyzer.analyzeExports(exports);

      // 为单个文件生成修复建议
      const suggestions = this.fixSuggester.suggestFixes(issues);

      return issues;
    } catch (error) {
      console.warn(`Failed to analyze file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 生成修复建议
   */
  suggestFixes(issues: ExportIssue[]): any[] {
    return this.fixSuggester.suggestFixes(issues);
  }

  /**
   * 验证修复建议
   */
  validateFixes(fixes: any[]): any[] {
    return fixes.map(fix => this.fixSuggester.validateSuggestion(fix));
  }

  /**
   * 获取引擎统计信息
   */
  getEngineStats(): {
    filesScanned: number;
    exportsFound: number;
    issuesDetected: number;
    suggestionsGenerated: number;
  } {
    return {
      filesScanned: 0,
      exportsFound: 0,
      issuesDetected: 0,
      suggestionsGenerated: 0,
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.fileScanner.clearCache();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DiagnosticConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.fileScanner = new FileScanner(this.config);
    this.exportAnalyzer = new ExportAnalyzer(this.config);
    this.dependencyResolver = new DependencyResolver(this.config);
    this.fixSuggester = new FixSuggester(this.config);
  }
}

/**
 * 默认诊断引擎实例
 */
export const exportDiagnosticEngine = new ExportDiagnosticEngine({
  filePatterns: ['**/*.{ts,tsx,js,jsx}'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/*.d.ts',
    '**/coverage/**',
  ],
  maxDepth: 10,
  timeout: 30000,
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000,
  severityThreshold: 'info' as any,
});
