/**
 * Diagnostic Engine Component
 * 诊断引擎 - 协调整个诊断流程
 */

import { FileScanner } from './FileScanner';
import { ExportAnalyzer } from './ExportAnalyzer';
import { FixSuggester } from './FixSuggester';
import { CacheManager } from './CacheManager';
import { ESLintIntegration } from './ESLintIntegration';
import { TypeScriptIntegration } from './TypeScriptIntegration';
import type {
  DiagnosticConfig,
  ScanOptions,
  DiagnosticReport,
  ScanProgress,
  ExportInfo,
  ExportIssue,
  FixSuggestion,
} from '@/types/exportDiagnostic';

/**
 * 诊断引擎类
 */
export class DiagnosticEngine {
  private config: DiagnosticConfig;
  private fileScanner: FileScanner;
  private exportAnalyzer: ExportAnalyzer;
  private fixSuggester: FixSuggester;
  private cacheManager: CacheManager;
  private eslintIntegration: ESLintIntegration;
  private typescriptIntegration: TypeScriptIntegration;

  constructor(config: DiagnosticConfig) {
    this.validateConfig(config);
    this.config = config;

    this.fileScanner = new FileScanner(config);
    this.exportAnalyzer = new ExportAnalyzer(config);
    this.fixSuggester = new FixSuggester(config);
    this.cacheManager = new CacheManager(config);
    this.eslintIntegration = new ESLintIntegration(
      config.eslintConfig || { enabled: false }
    );
    this.typescriptIntegration = new TypeScriptIntegration(
      config.typescriptConfig || {
        strict: false,
        checkTypeExports: true,
        target: 'ES2020',
      }
    );
  }

  /**
   * 执行完整的诊断流程
   */
  async diagnose(options: ScanOptions): Promise<DiagnosticReport> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(options);

    try {
      // 检查缓存
      if (this.config.enableCache) {
        const cached = await this.cacheManager.get<DiagnosticReport>(cacheKey);
        if (cached && this.isCacheValid(cached, options)) {
          return cached;
        }
      }

      // 执行诊断流程
      const result = await this.executeDiagnosticWorkflow(options, startTime);

      // 缓存结果
      if (this.config.enableCache) {
        await this.cacheManager.set(cacheKey, result, this.config.cacheExpiry);
      }

      return result;
    } catch (error) {
      throw new Error(`诊断失败: ${error}`);
    }
  }

  /**
   * 执行诊断工作流
   */
  private async executeDiagnosticWorkflow(
    options: ScanOptions,
    startTime: number
  ): Promise<DiagnosticReport> {
    const progressCallback = options.onProgress;
    let scanTime = 0;
    let analysisTime = 0;

    // 阶段1: 文件扫描
    const scanStartTime = Date.now();
    const exports = await this.fileScanner.scanDirectory(
      options.rootDir,
      options,
      (progress: ScanProgress) => {
        progressCallback?.({
          ...progress,
          stage: 'scanning',
        });
      }
    );
    scanTime = Date.now() - scanStartTime;

    // 阶段2: 导出分析
    const analysisStartTime = Date.now();
    const issues = this.exportAnalyzer.analyzeExports(exports);

    // 集成ESLint分析
    if (this.config.eslintConfig?.enabled) {
      const eslintIssues = await this.integrateESLintAnalysis(exports);
      issues.push(...eslintIssues);
    }

    // 集成TypeScript分析
    if (this.config.typescriptConfig) {
      const tsIssues = await this.integrateTypeScriptAnalysis(exports);
      issues.push(...tsIssues);
    }

    analysisTime = Date.now() - analysisStartTime;

    // 阶段3: 修复建议生成
    const suggestionsStartTime = Date.now();
    const suggestions = await this.fixSuggester.suggestFixes(issues);
    const suggestionsTime = Date.now() - suggestionsStartTime;

    // 阶段4: 生成报告
    const totalTime = Date.now() - startTime;
    const report = this.generateReport(exports, issues, suggestions, {
      scanTime,
      analysisTime,
      suggestionsTime,
      totalTime,
    });

    progressCallback?.({
      processedFiles: exports.length,
      totalFiles: exports.length,
      issuesFound: issues.length,
      elapsedTime: totalTime,
      stage: 'completed',
    });

    return report;
  }

  /**
   * 集成ESLint分析
   */
  private async integrateESLintAnalysis(
    exports: ExportInfo[]
  ): Promise<ExportIssue[]> {
    const eslintIssues: ExportIssue[] = [];

    try {
      // 获取唯一文件路径
      const filePaths = [...new Set(exports.map(exp => exp.location.filePath))];

      // 并行分析文件
      const eslintResults = await Promise.all(
        filePaths.map(filePath => this.eslintIntegration.analyzeFile(filePath))
      );

      // 转换ESLint结果为导出问题
      for (const result of eslintResults) {
        if (result) {
          const issues = this.eslintIntegration.convertToExportIssues([result]);
          eslintIssues.push(...issues);
        }
      }
    } catch (error) {
      console.warn('ESLint分析失败:', error);
    }

    return eslintIssues;
  }

  /**
   * 集成TypeScript分析
   */
  private async integrateTypeScriptAnalysis(
    exports: ExportInfo[]
  ): Promise<ExportIssue[]> {
    const tsIssues: ExportIssue[] = [];

    try {
      // 获取唯一文件路径
      const filePaths = [...new Set(exports.map(exp => exp.location.filePath))];

      // 并行分析文件
      const tsResults = await Promise.all(
        filePaths.map(filePath =>
          this.typescriptIntegration.analyzeFile(filePath)
        )
      );

      // 提取问题
      for (const result of tsResults) {
        if (result) {
          tsIssues.push(...result.issues);
        }
      }
    } catch (error) {
      console.warn('TypeScript分析失败:', error);
    }

    return tsIssues;
  }

  /**
   * 生成诊断报告
   */
  private generateReport(
    exports: ExportInfo[],
    issues: ExportIssue[],
    suggestions: FixSuggestion[],
    performance: {
      scanTime: number;
      analysisTime: number;
      suggestionsTime: number;
      totalTime: number;
    }
  ): DiagnosticReport {
    // 计算汇总统计
    const usedExports = exports.filter(exp => exp.isUsed).length;
    const totalReferenceCount = exports.reduce(
      (sum, exp) => sum + exp.referenceCount,
      0
    );
    const averageReferences =
      exports.length > 0 ? totalReferenceCount / exports.length : 0;

    // 按类型分组问题
    const issuesByType = issues.reduce(
      (acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // 按严重程度分组问题
    const issuesBySeverity = issues.reduce(
      (acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      summary: {
        totalFiles: [...new Set(exports.map(exp => exp.location.filePath))]
          .length,
        scannedFiles: [...new Set(exports.map(exp => exp.location.filePath))]
          .length,
        totalExports: exports.length,
        usedExports,
        unusedExports: exports.length - usedExports,
        exportUsageRate: exports.length > 0 ? usedExports / exports.length : 0,
        averageReferences,
        totalIssues: issues.length,
        autoFixableIssues: suggestions.filter(s => s.fixType === 'AUTO_FIX')
          .length,
        issuesByType,
        issuesBySeverity,
      },
      exports,
      issues,
      suggestions,
      performance,
      generatedAt: new Date(),
      config: this.config,
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(options: ScanOptions): string {
    const keyData = {
      rootDir: options.rootDir,
      recursive: options.recursive,
      includeHidden: options.includeHidden,
      includeNodeModules: options.includeNodeModules,
      includeTests: options.includeTests,
      filePatterns: this.config.filePatterns,
      ignorePatterns: this.config.ignorePatterns,
    };

    return `diagnostic-${JSON.stringify(keyData)}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(
    cached: DiagnosticReport,
    options: ScanOptions
  ): boolean {
    // 检查配置是否相同
    if (JSON.stringify(cached.config) !== JSON.stringify(this.config)) {
      return false;
    }

    // 检查是否过期
    const cacheAge = Date.now() - cached.generatedAt.getTime();
    if (cacheAge > this.config.cacheExpiry) {
      return false;
    }

    return true;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: DiagnosticConfig): void {
    if (config.maxDepth < 1) {
      throw new Error('maxDepth 必须大于0');
    }

    if (config.timeout < 1000) {
      throw new Error('timeout 必须至少1000ms');
    }

    if (config.cacheExpiry < 0) {
      throw new Error('cacheExpiry 不能为负数');
    }

    if (!config.filePatterns || config.filePatterns.length === 0) {
      throw new Error('必须指定至少一个文件模式');
    }
  }

  /**
   * 获取引擎统计信息
   */
  getStats(): {
    cacheHits: number;
    cacheMisses: number;
    totalScans: number;
    averageScanTime: number;
  } {
    return {
      cacheHits: 0, // TODO: 实现缓存统计
      cacheMisses: 0,
      totalScans: 0,
      averageScanTime: 0,
    };
  }

  /**
   * 清理缓存
   */
  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }
}

/**
 * 默认诊断引擎实例
 */
export const diagnosticEngine = new DiagnosticEngine({
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
  typescriptConfig: {
    strict: false,
    checkTypeExports: true,
    target: 'ES2020',
  },
  eslintConfig: {
    enabled: true,
  },
});
