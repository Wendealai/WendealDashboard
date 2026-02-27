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
    const generatedAt = new Date().toLocaleString();
    const issueGroups = Array.from(groupedIssues.entries());
    const severityStats = this.getSeverityStatistics(groupedIssues);
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导出一致性分析报告</title>
    <style>
        :root {
          --report-bg: #f3f7fc;
          --report-surface: #ffffff;
          --report-border: #d9e3ef;
          --report-text: #17212f;
          --report-muted: #5d6b7c;
          --report-primary: #0f5bdb;
          --report-primary-soft: #edf4ff;
          --report-warning: #8d5a00;
          --report-danger: #9b2226;
          --report-radius: 12px;
        }
        * { box-sizing: border-box; }
        body {
          font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
          margin: 0;
          padding: 18px;
          background: var(--report-bg);
          color: var(--report-text);
        }
        .container {
          max-width: 1120px;
          margin: 0 auto;
          background: var(--report-surface);
          border: 1px solid var(--report-border);
          border-radius: var(--report-radius);
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(8, 27, 51, 0.08);
        }
        .header {
          background: linear-gradient(120deg, #0f5bdb 0%, #1f4aa8 50%, #0f5bdb 100%);
          color: white;
          padding: 22px 26px 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: 0.2px;
        }
        .header-meta { margin-top: 8px; opacity: 0.92; font-size: 13px; }
        .summary-strip { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .summary-chip {
          border: 1px solid rgba(255,255,255,0.38);
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          background: rgba(255,255,255,0.14);
        }
        .content { padding: 22px 24px 26px; }
        .toolbar {
          border: 1px solid var(--report-border);
          border-radius: 10px;
          padding: 10px;
          margin-bottom: 14px;
          background: #f9fbff;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: space-between;
          align-items: center;
        }
        .toolbar-left,
        .toolbar-right {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .filter-button {
          border: 1px solid #bcd1ef;
          background: #fff;
          color: #29456f;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .filter-button.active {
          border-color: #1f4aa8;
          background: #1f4aa8;
          color: #fff;
        }
        .toolbar-action {
          border: 1px solid #b8c9e2;
          background: #fff;
          color: #304767;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .toolbar-action:hover {
          border-color: #8eb4ec;
          background: #eef5ff;
        }
        .search-input {
          border: 1px solid #bfd4ef;
          border-radius: 999px;
          padding: 5px 12px;
          min-width: 220px;
          font-size: 12px;
          color: #213147;
          outline: none;
        }
        .search-input:focus {
          border-color: #5f98eb;
          box-shadow: 0 0 0 3px rgba(15, 91, 219, 0.12);
        }
        .visible-count {
          font-size: 12px;
          border: 1px solid #cadefa;
          border-radius: 999px;
          padding: 3px 8px;
          color: #365276;
          background: #f1f7ff;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .issues-layout {
          display: grid;
          grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }
        .issues-nav {
          border: 1px solid var(--report-border);
          border-radius: 10px;
          background: #fff;
          position: sticky;
          top: 10px;
          padding: 10px;
        }
        .issues-nav h3 {
          margin: 0 0 8px;
          font-size: 13px;
          color: #253852;
        }
        .issues-nav a {
          display: block;
          text-decoration: none;
          color: #314866;
          font-size: 12px;
          border: 1px solid #dce7f5;
          border-radius: 8px;
          padding: 6px 8px;
          margin-bottom: 6px;
          background: #f9fbff;
        }
        .issues-nav a:hover {
          border-color: #9ec1ef;
          background: #edf4ff;
        }
        .stat-card {
          background: var(--report-primary-soft);
          border: 1px solid #cfe0ff;
          padding: 14px 14px 12px;
          border-radius: 10px;
        }
        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: var(--report-primary);
          line-height: 1;
        }
        .stat-label {
          color: var(--report-muted);
          margin-top: 6px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .issue-group { margin-bottom: 20px; }
        .issue-group h3 {
          color: #223248;
          border-bottom: 1px solid var(--report-border);
          margin: 0 0 10px;
          padding-bottom: 7px;
          font-size: 16px;
        }
        .group-collapsed-hint {
          display: none;
          border: 1px dashed #bfd4ef;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 10px;
          color: #33537b;
          background: #f4f9ff;
          font-size: 12px;
        }
        .issue-item {
          background: #fff;
          border: 1px solid var(--report-border);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
        }
        .issue-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .issue-message { margin: 0; color: #213147; line-height: 1.5; }
        .issue-severity {
          display: inline-block;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .severity-error { background: #fde8ea; color: var(--report-danger); border: 1px solid #f4b7bc; }
        .severity-warning { background: #fff4da; color: var(--report-warning); border: 1px solid #f1d08c; }
        .severity-info { background: #e4f1ff; color: #1f4d8f; border: 1px solid #b8d5ff; }
        .issue-location { color: var(--report-muted); font-size: 12px; }
        .suggestion {
          margin-top: 8px;
          background: #f4f8ff;
          border: 1px solid #d5e4ff;
          border-left: 3px solid var(--report-primary);
          border-radius: 6px;
          padding: 8px 10px;
          color: #29456f;
          font-size: 13px;
          line-height: 1.5;
        }
        .report-footer {
          border-top: 1px solid var(--report-border);
          margin-top: 8px;
          padding-top: 10px;
          font-size: 12px;
          color: var(--report-muted);
          text-align: right;
        }
        @media print {
          body { background: #fff; padding: 0; }
          .container {
            border: none;
            box-shadow: none;
            max-width: none;
            border-radius: 0;
          }
          .toolbar,
          .issues-nav {
            display: none;
          }
          .issues-layout {
            display: block;
          }
          .header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media (max-width: 768px) {
          body { padding: 8px; }
          .content { padding: 14px; }
          .header { padding: 16px 14px; }
          .header h1 { font-size: 22px; }
          .issues-layout {
            grid-template-columns: 1fr;
          }
          .issues-nav {
            position: static;
          }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 导出一致性分析报告</h1>
            <div class="header-meta">生成时间: ${generatedAt}</div>
            <div class="summary-strip">
              <span class="summary-chip">总问题: ${statistics.totalIssues}</span>
              <span class="summary-chip">错误: ${statistics.issuesBySeverity.error || 0}</span>
              <span class="summary-chip">警告: ${statistics.issuesBySeverity.warning || 0}</span>
              <span class="summary-chip">信息: ${statistics.issuesBySeverity.info || 0}</span>
            </div>
        </div>
        <div class="content">
            ${this.generateHtmlStatistics(statistics)}
            ${this.fixResult ? this.generateHtmlFixResult(this.fixResult) : ''}
            <section class="toolbar">
              <div class="toolbar-left" role="tablist" aria-label="严重级筛选">
                <button class="filter-button active" data-severity-filter="all" aria-pressed="true">全部 ${statistics.totalIssues}</button>
                <button class="filter-button" data-severity-filter="error" aria-pressed="false">错误 ${severityStats.error}</button>
                <button class="filter-button" data-severity-filter="warning" aria-pressed="false">警告 ${severityStats.warning}</button>
                <button class="filter-button" data-severity-filter="info" aria-pressed="false">信息 ${severityStats.info}</button>
              </div>
              <div class="toolbar-right">
                <input id="issueSearchInput" class="search-input" type="search" placeholder="按问题/文件/建议搜索..." />
                <button id="collapseAllGroupsBtn" class="toolbar-action" type="button">折叠分组</button>
                <button id="expandAllGroupsBtn" class="toolbar-action" type="button">展开分组</button>
                <button id="exportVisibleIssuesBtn" class="toolbar-action" type="button">导出可见问题</button>
                <span class="visible-count" id="visibleIssueCount">显示 ${statistics.totalIssues} / ${statistics.totalIssues}</span>
              </div>
            </section>
            <div class="issues-layout">
              <aside class="issues-nav">
                <h3>问题分组导航</h3>
                ${this.generateHtmlGroupNavigation(issueGroups)}
              </aside>
              <div class="issues-main">
                ${this.generateHtmlIssues(groupedIssues, _options)}
              </div>
            </div>
            <div class="report-footer">Export Consistency Report</div>
        </div>
    </div>
    <script>
      (function () {
        var groupNodes = Array.prototype.slice.call(document.querySelectorAll('.issue-group'));
        var issueNodes = Array.prototype.slice.call(document.querySelectorAll('.issue-item'));
        var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.filter-button'));
        var searchInput = document.getElementById('issueSearchInput');
        var visibleCountNode = document.getElementById('visibleIssueCount');
        var collapseAllGroupsButton = document.getElementById('collapseAllGroupsBtn');
        var expandAllGroupsButton = document.getElementById('expandAllGroupsBtn');
        var exportVisibleIssuesButton = document.getElementById('exportVisibleIssuesBtn');
        var activeSeverity = 'all';
        var collapsedAllGroups = false;
        var collapsedStateBeforePrint = null;

        function updateVisibleCount(visible) {
          if (visibleCountNode) {
            visibleCountNode.textContent = '显示 ' + visible + ' / ' + issueNodes.length;
          }
        }

        function applyFilters() {
          var query = '';
          if (searchInput && typeof searchInput.value === 'string') {
            query = searchInput.value.trim().toLowerCase();
          }
          var visibleIssues = 0;

          issueNodes.forEach(function (issueNode) {
            var severity = String(issueNode.getAttribute('data-severity') || '').toLowerCase();
            var searchable = String(issueNode.getAttribute('data-search') || '').toLowerCase();
            var severityMatch = activeSeverity === 'all' || severity === activeSeverity;
            var queryMatch = !query || searchable.indexOf(query) !== -1;
            var pass = severityMatch && queryMatch;
            issueNode.setAttribute('data-pass-filter', pass ? '1' : '0');
            var show = pass && !collapsedAllGroups;
            issueNode.style.display = show ? '' : 'none';
            if (pass) visibleIssues += 1;
          });

          groupNodes.forEach(function (groupNode) {
            var visibleChildren = groupNode.querySelectorAll('.issue-item[data-pass-filter="1"]').length;
            var collapsedHint = groupNode.querySelector('.group-collapsed-hint');
            groupNode.style.display = visibleChildren > 0 ? '' : 'none';
            if (collapsedHint) {
              collapsedHint.style.display = visibleChildren > 0 && collapsedAllGroups ? '' : 'none';
            }
          });

          updateVisibleCount(visibleIssues);
        }

        filterButtons.forEach(function (button) {
          button.addEventListener('click', function () {
            activeSeverity = String(button.getAttribute('data-severity-filter') || 'all');
            filterButtons.forEach(function (btn) {
              var active = btn === button;
              btn.classList.toggle('active', active);
              btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            applyFilters();
          });
        });

        if (searchInput) {
          searchInput.addEventListener('input', applyFilters);
        }

        if (collapseAllGroupsButton) {
          collapseAllGroupsButton.addEventListener('click', function () {
            collapsedAllGroups = true;
            applyFilters();
          });
        }

        if (expandAllGroupsButton) {
          expandAllGroupsButton.addEventListener('click', function () {
            collapsedAllGroups = false;
            applyFilters();
          });
        }

        if (exportVisibleIssuesButton) {
          exportVisibleIssuesButton.addEventListener('click', function () {
            var visibleIssues = issueNodes
              .filter(function (issueNode) {
                return issueNode.getAttribute('data-pass-filter') === '1';
              })
              .map(function (issueNode, index) {
                var severity = String(issueNode.getAttribute('data-severity') || 'info').toUpperCase();
                var issueType = issueNode.getAttribute('data-issue-type') || '';
                var message = issueNode.getAttribute('data-issue-message') || '';
                var file = issueNode.getAttribute('data-file-path') || '';
                var line = issueNode.getAttribute('data-line') || '';
                var location = file ? file + (line ? ':' + line : '') : 'N/A';
                return (
                  (index + 1) +
                  '. [' +
                  severity +
                  '] ' +
                  issueType +
                  ' - ' +
                  message +
                  ' @ ' +
                  location
                );
              });

            var exportText =
              visibleIssues.length > 0
                ? visibleIssues.join('\n')
                : '当前筛选条件下没有可导出的可见问题。';
            var blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            var href = URL.createObjectURL(blob);
            var anchor = document.createElement('a');
            anchor.href = href;
            anchor.download = 'export-consistency-visible-issues.txt';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(href);
          });
        }

        window.addEventListener('beforeprint', function () {
          collapsedStateBeforePrint = collapsedAllGroups;
          collapsedAllGroups = false;
          issueNodes.forEach(function (issueNode) {
            issueNode.style.display = '';
          });
          groupNodes.forEach(function (groupNode) {
            groupNode.style.display = '';
            var collapsedHint = groupNode.querySelector('.group-collapsed-hint');
            if (collapsedHint) {
              collapsedHint.style.display = 'none';
            }
          });
          updateVisibleCount(issueNodes.length);
        });

        window.addEventListener('afterprint', function () {
          if (collapsedStateBeforePrint !== null) {
            collapsedAllGroups = collapsedStateBeforePrint;
            collapsedStateBeforePrint = null;
          }
          applyFilters();
        });
        applyFilters();
      })();
    </script>
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
    let groupIndex = 0;
    for (const [group, issues] of groupedIssues) {
      const groupId = this.toGroupAnchorId(group, groupIndex);
      html += `<div class="issue-group" id="${groupId}" data-group="${this.escapeHtml(group)}"><h3>📁 ${this.escapeHtml(group)}</h3><div class="group-collapsed-hint">该分组已折叠，点击“展开分组”恢复查看。</div>`;
      groupIndex += 1;

      for (const issue of issues) {
        const normalizedSeverity = this.normalizeIssueSeverity(issue.severity);
        const severityClass = `severity-${normalizedSeverity}`;
        const location = issue.sourceLocation?.startLine
          ? `:${issue.sourceLocation.startLine}`
          : '';
        const issueLine = this.escapeHtml(
          issue.sourceLocation?.startLine?.toString() || ''
        );
        const issueSeverity = this.escapeHtml(issue.severity || '');
        const issueType = this.escapeHtml(issue.type || '');
        const issueMessage = this.escapeHtml(issue.message || '');
        const issueFilePath = this.escapeHtml(issue.filePath || '');
        const issueSuggestion = this.escapeHtml(issue.suggestion || '');
        const searchableText = this.escapeHtml(
          [
            issue.severity,
            issue.type,
            issue.message,
            issue.filePath,
            issue.suggestion,
          ]
            .filter(Boolean)
            .join(' ')
        );

        html += `
          <div
            class="issue-item"
            data-severity="${normalizedSeverity}"
            data-search="${searchableText}"
            data-issue-type="${issueType}"
            data-issue-message="${issueMessage}"
            data-file-path="${issueFilePath}"
            data-line="${issueLine}"
          >
            <div class="issue-title">
              <span class="issue-severity ${severityClass}">${issueSeverity}</span>
              <strong>${issueType}</strong>
              <span class="issue-location">${issueFilePath}${location}</span>
            </div>
            <p class="issue-message">${issueMessage}</p>
        `;

        if (_options.includeSuggestions !== false && issue.suggestion) {
          html += `<div class="suggestion">💡 建议: ${issueSuggestion}</div>`;
        }

        html += '</div>';
      }

      html += '</div>';
    }

    return html;
  }

  private normalizeIssueSeverity(
    severity: string | undefined
  ): 'error' | 'warning' | 'info' {
    const normalized = (severity || 'info').toLowerCase();
    if (normalized === 'error') return 'error';
    if (normalized === 'warning') return 'warning';
    return 'info';
  }

  private getSeverityStatistics(
    groupedIssues: Map<string, ConsistencyIssue[]>
  ): {
    error: number;
    warning: number;
    info: number;
  } {
    const result = { error: 0, warning: 0, info: 0 };
    groupedIssues.forEach(issues => {
      issues.forEach(issue => {
        const severity = this.normalizeIssueSeverity(issue.severity);
        result[severity] += 1;
      });
    });
    return result;
  }

  private toGroupAnchorId(group: string, index: number): string {
    const normalized = group
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `issue-group-${normalized || 'group'}-${index + 1}`;
  }

  private generateHtmlGroupNavigation(
    issueGroups: Array<[string, ConsistencyIssue[]]>
  ): string {
    if (issueGroups.length === 0) {
      return '<span>暂无分组</span>';
    }

    return issueGroups
      .map(([group, issues], index) => {
        const groupId = this.toGroupAnchorId(group, index);
        return `<a href="#${groupId}">${this.escapeHtml(group)} (${issues.length})</a>`;
      })
      .join('');
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
