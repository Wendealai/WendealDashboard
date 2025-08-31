// import * as fs from 'fs'; // Removed for browser compatibility
// import * as path from 'path'; // Removed for browser compatibility
import type {
  ConsistencyIssue,
  ExportInfo,
  ProjectAnalysisResult,
} from '../types/export';
import type { BatchFixResult } from './autoFixer';

/**
 * 报告格式类型
 */
export type ReportFormat = 'console' | 'json' | 'html' | 'markdown' | 'csv';

/**
 * 报告配置选项
 */
export interface ReportOptions {
  format: ReportFormat;
  outputPath?: string;
  includeDetails?: boolean;
  includeSuggestions?: boolean;
  includeStatistics?: boolean;
  groupBy?: 'file' | 'type' | 'severity';
  sortBy?: 'file' | 'type' | 'severity' | 'line';
  filterSeverity?: Array<'error' | 'warning' | 'info'>;
}

/**
 * 报告统计信息
 */
export interface ReportStatistics {
  totalFiles: number;
  totalExports: number;
  totalIssues: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  filesWithIssues: number;
  mostCommonIssues: Array<{ type: string; count: number }>;
}

/**
 * 生成的报告内容
 */
export interface GeneratedReport {
  format: ReportFormat;
  content: string;
  filePath?: string;
  statistics: ReportStatistics;
  timestamp: Date;
}

/**
 * 报告生成器类
 * 用于生成导出一致性分析的详细报告
 */
export class ReportGenerator {
  private analysisResult: ProjectAnalysisResult;
  private fixResult: BatchFixResult | undefined;

  /**
   * 构造函数
   * @param analysisResult 分析结果
   * @param fixResult 修复结果（可选）
   */
  constructor(
    analysisResult: ProjectAnalysisResult,
    fixResult?: BatchFixResult
  ) {
    this.analysisResult = analysisResult;
    this.fixResult = fixResult;
  }

  /**
   * 生成报告
   * @param options 报告选项
   * @returns 生成的报告
   */
  async generateReport(options: ReportOptions): Promise<GeneratedReport> {
    const statistics = this.calculateStatistics();
    const filteredIssues = this.filterIssues(options);
    const sortedIssues = this.sortIssues(filteredIssues, options);
    const groupedIssues = this.groupIssues(sortedIssues, options);

    let content: string;
    switch (options.format) {
      case 'console':
        content = this.generateConsoleReport(
          groupedIssues,
          statistics,
          options
        );
        break;
      case 'json':
        content = this.generateJsonReport(groupedIssues, statistics, options);
        break;
      case 'html':
        content = this.generateHtmlReport(groupedIssues, statistics, options);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(
          groupedIssues,
          statistics,
          options
        );
        break;
      case 'csv':
        content = this.generateCsvReport(sortedIssues, statistics, options);
        break;
      default:
        throw new Error(`不支持的报告格式: ${options.format}`);
    }

    const report: GeneratedReport = {
      format: options.format,
      content,
      statistics,
      timestamp: new Date(),
    };

    if (options.outputPath) {
      const filePath = await this.saveReport(content, options);
      report.filePath = filePath;
    }

    return report;
  }

  /**
   * 计算统计信息
   * @returns 报告统计信息
   */
  private calculateStatistics(): ReportStatistics {
    const issues = this.analysisResult.issues;
    const exports: ExportInfo[] = [];

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};
    const filesWithIssues = new Set<string>();

    for (const issue of issues) {
      // 按类型统计
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;

      // 按严重程度统计
      issuesBySeverity[issue.severity] =
        (issuesBySeverity[issue.severity] || 0) + 1;

      // 记录有问题的文件
      filesWithIssues.add(issue.filePath);
    }

    // 最常见的问题类型
    const mostCommonIssues = Object.entries(issuesByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalFiles: new Set(exports.map((e: ExportInfo) => e.filePath)).size,
      totalExports: exports.length,
      totalIssues: issues.length,
      issuesByType,
      issuesBySeverity,
      filesWithIssues: filesWithIssues.size,
      mostCommonIssues,
    };
  }

  /**
   * 过滤问题
   * @param options 报告选项
   * @returns 过滤后的问题列表
   */
  private filterIssues(options: ReportOptions): ConsistencyIssue[] {
    let issues = [...this.analysisResult.issues];

    if (options.filterSeverity && options.filterSeverity.length > 0) {
      issues = issues.filter(issue =>
        options.filterSeverity!.includes(issue.severity as any)
      );
    }

    return issues;
  }

  /**
   * 排序问题
   * @param issues 问题列表
   * @param options 报告选项
   * @returns 排序后的问题列表
   */
  private sortIssues(
    issues: ConsistencyIssue[],
    options: ReportOptions
  ): ConsistencyIssue[] {
    const sortBy = options.sortBy || 'file';

    return issues.sort((a, b) => {
      switch (sortBy) {
        case 'file':
          return a.filePath.localeCompare(b.filePath);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'severity':
          const severityOrder = { error: 3, warning: 2, info: 1 };
          return (
            (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
            (severityOrder[a.severity as keyof typeof severityOrder] || 0)
          );
        case 'line':
          return (
            (a.sourceLocation?.startLine || 0) -
            (b.sourceLocation?.startLine || 0)
          );
        default:
          return 0;
      }
    });
  }

  /**
   * 分组问题
   * @param issues 问题列表
   * @param options 报告选项
   * @returns 分组后的问题
   */
  private groupIssues(
    issues: ConsistencyIssue[],
    options: ReportOptions
  ): Map<string, ConsistencyIssue[]> {
    const groupBy = options.groupBy || 'file';
    const groups = new Map<string, ConsistencyIssue[]>();

    for (const issue of issues) {
      let key: string;
      switch (groupBy) {
        case 'file':
          key = issue.filePath;
          break;
        case 'type':
          key = issue.type;
          break;
        case 'severity':
          key = issue.severity;
          break;
        default:
          key = 'all';
      }

      const existing = groups.get(key) || [];
      existing.push(issue);
      groups.set(key, existing);
    }

    return groups;
  }

  /**
   * 生成控制台格式报告
   * @param groupedIssues 分组的问题
   * @param statistics 统计信息
   * @param options 报告选项
   * @returns 控制台格式内容
   */
  private generateConsoleReport(
    groupedIssues: Map<string, ConsistencyIssue[]>,
    statistics: ReportStatistics,
    _options: ReportOptions
  ): string {
    const lines: string[] = [];

    // 标题
    lines.push('\n='.repeat(60));
    lines.push('导出一致性分析报告');
    lines.push('='.repeat(60));
    lines.push(`生成时间: ${new Date().toLocaleString()}`);
    lines.push('');

    // 统计信息
    if (_options.includeStatistics !== false) {
      lines.push('📊 统计概览:');
      lines.push(`   总文件数: ${statistics.totalFiles}`);
      lines.push(`   总导出数: ${statistics.totalExports}`);
      lines.push(`   总问题数: ${statistics.totalIssues}`);
      lines.push(`   有问题的文件: ${statistics.filesWithIssues}`);
      lines.push('');

      if (statistics.totalIssues > 0) {
        lines.push('🔍 问题分布:');
        for (const [type, count] of Object.entries(statistics.issuesByType)) {
          lines.push(`   ${type}: ${count}`);
        }
        lines.push('');
      }
    }

    // 修复结果
    if (this.fixResult) {
      lines.push('🔧 修复结果:');
      lines.push(`   总操作数: ${this.fixResult.totalOperations}`);
      lines.push(`   成功修复: ${this.fixResult.successfulFixes}`);
      lines.push(`   修复失败: ${this.fixResult.failedFixes}`);
      if (this.fixResult.backupDirectory) {
        lines.push(`   备份目录: ${this.fixResult.backupDirectory}`);
      }
      lines.push('');
    }

    // 详细问题
    if (_options.includeDetails !== false && statistics.totalIssues > 0) {
      lines.push('📋 详细问题:');
      lines.push('');

      for (const [group, issues] of groupedIssues) {
        lines.push(`📁 ${group}:`);
        for (const issue of issues) {
          const severity = this.getSeverityIcon(issue.severity);
          const location = issue.sourceLocation?.startLine
            ? `:${issue.sourceLocation.startLine}`
            : '';
          lines.push(
            `   ${severity} ${issue.type}${location} - ${issue.message}`
          );

          if (_options.includeSuggestions !== false && issue.suggestion) {
            lines.push(`      💡 建议: ${issue.suggestion}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 生成JSON格式报告
   * @param groupedIssues 分组的问题
   * @param statistics 统计信息
   * @param options 报告选项
   * @returns JSON格式内容
   */
  private generateJsonReport(
    groupedIssues: Map<string, ConsistencyIssue[]>,
    statistics: ReportStatistics,
    _options: ReportOptions
  ): string {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        format: 'json',
        version: '1.0.0',
      },
      statistics,
      fixResult: this.fixResult,
      issues: Array.from(groupedIssues.entries()).map(([group, issues]) => ({
        group,
        count: issues.length,
        items: issues,
      })),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 生成HTML格式报告
   * @param groupedIssues 分组的问题
   * @param statistics 统计信息
   * @param options 报告选项
   * @returns HTML格式内容
   */
  private generateHtmlReport(
    groupedIssues: Map<string, ConsistencyIssue[]>,
    statistics: ReportStatistics,
    _options: ReportOptions
  ): string {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导出一致性分析报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .issue-group { margin-bottom: 30px; }
        .issue-group h3 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .issue-item { background: #fff; border: 1px solid #e9ecef; border-radius: 4px; padding: 15px; margin-bottom: 10px; }
        .issue-severity { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .severity-error { background: #f8d7da; color: #721c24; }
        .severity-warning { background: #fff3cd; color: #856404; }
        .severity-info { background: #d1ecf1; color: #0c5460; }
        .suggestion { background: #e7f3ff; border-left: 3px solid #0066cc; padding: 10px; margin-top: 10px; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 导出一致性分析报告</h1>
            <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
            ${this.generateHtmlStatistics(statistics)}
            ${this.fixResult ? this.generateHtmlFixResult(this.fixResult) : ''}
            ${this.generateHtmlIssues(groupedIssues, _options)}
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * 生成Markdown格式报告
   * @param groupedIssues 分组的问题
   * @param statistics 统计信息
   * @param options 报告选项
   * @returns Markdown格式内容
   */
  private generateMarkdownReport(
    groupedIssues: Map<string, ConsistencyIssue[]>,
    statistics: ReportStatistics,
    _options: ReportOptions
  ): string {
    const lines: string[] = [];

    // 标题
    lines.push('# 📊 导出一致性分析报告');
    lines.push('');
    lines.push(`**生成时间:** ${new Date().toLocaleString()}`);
    lines.push('');

    // 统计信息
    lines.push('## 📈 统计概览');
    lines.push('');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 总文件数 | ${statistics.totalFiles} |`);
    lines.push(`| 总导出数 | ${statistics.totalExports} |`);
    lines.push(`| 总问题数 | ${statistics.totalIssues} |`);
    lines.push(`| 有问题的文件 | ${statistics.filesWithIssues} |`);
    lines.push('');

    // 问题分布
    if (statistics.totalIssues > 0) {
      lines.push('## 🔍 问题分布');
      lines.push('');
      lines.push('| 问题类型 | 数量 |');
      lines.push('|----------|------|');
      for (const [type, count] of Object.entries(statistics.issuesByType)) {
        lines.push(`| ${type} | ${count} |`);
      }
      lines.push('');
    }

    // 修复结果
    if (this.fixResult) {
      lines.push('## 🔧 修复结果');
      lines.push('');
      lines.push('| 指标 | 数值 |');
      lines.push('|------|------|');
      lines.push(`| 总操作数 | ${this.fixResult.totalOperations} |`);
      lines.push(`| 成功修复 | ${this.fixResult.successfulFixes} |`);
      lines.push(`| 修复失败 | ${this.fixResult.failedFixes} |`);
      if (this.fixResult.backupDirectory) {
        lines.push(`| 备份目录 | ${this.fixResult.backupDirectory} |`);
      }
      lines.push('');
    }

    // 详细问题
    if (_options.includeDetails !== false && statistics.totalIssues > 0) {
      lines.push('## 📋 详细问题');
      lines.push('');

      for (const [group, issues] of groupedIssues) {
        lines.push(`### 📁 ${group}`);
        lines.push('');

        for (const issue of issues) {
          const severity = this.getSeverityIcon(issue.severity);
          const location = issue.sourceLocation?.startLine
            ? `:${issue.sourceLocation.startLine}`
            : '';
          lines.push(
            `- ${severity} **${issue.type}**${location}: ${issue.message}`
          );

          if (_options.includeSuggestions !== false && issue.suggestion) {
            lines.push(`  > 💡 **建议:** ${issue.suggestion}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * 生成CSV格式报告
   * @param issues 问题列表
   * @param statistics 统计信息
   * @param options 报告选项
   * @returns CSV格式内容
   */
  private generateCsvReport(
    issues: ConsistencyIssue[],
    _statistics: ReportStatistics,
    _options: ReportOptions
  ): string {
    const lines: string[] = [];

    // CSV头部
    lines.push('文件路径,行号,问题类型,严重程度,消息,建议');

    // 数据行
    for (const issue of issues) {
      const row = [
        this.escapeCsvField(issue.filePath),
        issue.sourceLocation?.startLine?.toString() || '',
        this.escapeCsvField(issue.type),
        this.escapeCsvField(issue.severity),
        this.escapeCsvField(issue.message),
        this.escapeCsvField(issue.suggestion || ''),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * 保存报告到文件
   * @param content 报告内容
   * @param options 报告选项
   * @returns 保存的文件路径
   */
  private async saveReport(
    content: string,
    options: ReportOptions
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = this.getFileExtension(options.format);
    const fileName = `export-consistency-report-${timestamp}.${extension}`;
    const filePath = options.outputPath || fileName;

    // 确保目录存在
    // Browser environment doesn't support file system operations
    console.warn('File system operations not supported in browser environment');
    console.log('Report content:', content);
    return filePath;
  }

  // 辅助方法
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  }

  private getFileExtension(format: ReportFormat): string {
    switch (format) {
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'markdown':
        return 'md';
      case 'csv':
        return 'csv';
      default:
        return 'txt';
    }
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  private generateHtmlStatistics(statistics: ReportStatistics): string {
    return `
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number">${statistics.totalFiles}</div>
          <div class="stat-label">总文件数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${statistics.totalExports}</div>
          <div class="stat-label">总导出数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${statistics.totalIssues}</div>
          <div class="stat-label">总问题数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${statistics.filesWithIssues}</div>
          <div class="stat-label">有问题的文件</div>
        </div>
      </div>
    `;
  }

  private generateHtmlFixResult(fixResult: BatchFixResult): string {
    return `
      <div class="issue-group">
        <h3>🔧 修复结果</h3>
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${fixResult.totalOperations}</div>
            <div class="stat-label">总操作数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${fixResult.successfulFixes}</div>
            <div class="stat-label">成功修复</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${fixResult.failedFixes}</div>
            <div class="stat-label">修复失败</div>
          </div>
        </div>
      </div>
    `;
  }

  private generateHtmlIssues(
    groupedIssues: Map<string, ConsistencyIssue[]>,
    _options: ReportOptions
  ): string {
    if (groupedIssues.size === 0) {
      return '<div class="issue-group"><h3>🎉 没有发现问题</h3></div>';
    }

    let html = '';
    for (const [group, issues] of groupedIssues) {
      html += `<div class="issue-group"><h3>📁 ${group}</h3>`;

      for (const issue of issues) {
        const severityClass = `severity-${issue.severity}`;
        const location = issue.sourceLocation?.startLine
          ? `:${issue.sourceLocation.startLine}`
          : '';

        html += `
          <div class="issue-item">
            <span class="issue-severity ${severityClass}">${issue.severity}</span>
            <strong>${issue.type}</strong>${location}
            <p>${issue.message}</p>
        `;

        if (_options.includeSuggestions !== false && issue.suggestion) {
          html += `<div class="suggestion">💡 建议: ${issue.suggestion}</div>`;
        }

        html += '</div>';
      }

      html += '</div>';
    }

    return html;
  }
}

/**
 * 创建报告生成器实例
 * @param analysisResult 分析结果
 * @param fixResult 修复结果（可选）
 * @returns 报告生成器实例
 */
export function createReportGenerator(
  analysisResult: ProjectAnalysisResult,
  fixResult?: BatchFixResult
): ReportGenerator {
  return new ReportGenerator(analysisResult, fixResult);
}

/**
 * 快速生成控制台报告
 * @param analysisResult 分析结果
 * @param fixResult 修复结果（可选）
 * @returns 控制台格式报告内容
 */
export async function generateConsoleReport(
  analysisResult: ProjectAnalysisResult,
  fixResult?: BatchFixResult
): Promise<string> {
  const generator = new ReportGenerator(analysisResult, fixResult);
  const report = await generator.generateReport({ format: 'console' });
  return report.content;
}

/**
 * 快速生成并保存报告
 * @param analysisResult 分析结果
 * @param options 报告选项
 * @param fixResult 修复结果（可选）
 * @returns 生成的报告
 */
export async function generateAndSaveReport(
  analysisResult: ProjectAnalysisResult,
  options: ReportOptions,
  fixResult?: BatchFixResult
): Promise<GeneratedReport> {
  const generator = new ReportGenerator(analysisResult, fixResult);
  return generator.generateReport(options);
}

/**
 * 生成多格式报告
 * @param analysisResult 分析结果
 * @param formats 要生成的格式列表
 * @param outputDir 输出目录
 * @param fixResult 修复结果（可选）
 * @returns 生成的报告列表
 */
export async function generateMultiFormatReports(
  analysisResult: ProjectAnalysisResult,
  formats: ReportFormat[],
  outputDir: string,
  fixResult?: BatchFixResult
): Promise<GeneratedReport[]> {
  const generator = new ReportGenerator(analysisResult, fixResult);
  const reports: GeneratedReport[] = [];

  for (const format of formats) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = generator['getFileExtension'](format);
    const outputPath = `${outputDir}/export-consistency-report-${timestamp}.${extension}`;

    const report = await generator.generateReport({
      format,
      outputPath,
      includeDetails: true,
      includeSuggestions: true,
      includeStatistics: true,
    });

    reports.push(report);
  }

  return reports;
}
