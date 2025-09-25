/**
 * Export Analyzer Component
 * 导出声明一致性和完整性分析
 */

import type {
  ExportInfo,
  ExportIssue,
  FileLocation,
  DiagnosticConfig,
} from '@/types/exportDiagnostic';
import { ExportIssueType, IssueSeverity } from '@/types/exportDiagnostic';
import { IssueClassifier } from '@/utils/exportDiagnosticUtils';

/**
 * 导出分析器类
 */
export class ExportAnalyzer {
  private config: DiagnosticConfig;

  constructor(config: DiagnosticConfig) {
    this.config = config;
  }

  /**
   * 分析导出声明的一致性和完整性
   */
  analyzeExports(allExports: ExportInfo[]): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 按文件分组导出
    const exportsByFile = this.groupExportsByFile(allExports);

    // 分析每个文件的导出
    for (const [filePath, fileExports] of exportsByFile.entries()) {
      const fileIssues = this.analyzeFileExports(
        filePath,
        fileExports,
        allExports
      );
      issues.push(...fileIssues);
    }

    // 全局分析
    const globalIssues = this.analyzeGlobalExports(allExports);
    issues.push(...globalIssues);

    return issues;
  }

  /**
   * 按文件分组导出
   */
  private groupExportsByFile(exports: ExportInfo[]): Map<string, ExportInfo[]> {
    const grouped = new Map<string, ExportInfo[]>();

    exports.forEach(exportInfo => {
      const filePath = exportInfo.location.filePath;
      if (!grouped.has(filePath)) {
        grouped.set(filePath, []);
      }
      grouped.get(filePath)!.push(exportInfo);
    });

    return grouped;
  }

  /**
   * 分析单个文件的导出
   */
  private analyzeFileExports(
    filePath: string,
    fileExports: ExportInfo[],
    allExports: ExportInfo[]
  ): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 检查未使用的导出
    const unusedExports = this.findUnusedExports(fileExports, allExports);
    unusedExports.forEach(exportInfo => {
      issues.push(this.createUnusedExportIssue(exportInfo));
    });

    // 检查默认导出冲突
    const defaultExportConflict = this.checkDefaultExportConflict(fileExports);
    if (defaultExportConflict) {
      issues.push(defaultExportConflict);
    }

    // 检查命名导出一致性
    const namingIssues = this.checkNamingConsistency(fileExports);
    issues.push(...namingIssues);

    // 检查类型导出问题
    if (this.config.typescriptConfig?.checkTypeExports) {
      const typeIssues = this.checkTypeExportIssues(fileExports);
      issues.push(...typeIssues);
    }

    return issues;
  }

  /**
   * 查找未使用的导出
   */
  private findUnusedExports(
    fileExports: ExportInfo[],
    allExports: ExportInfo[]
  ): ExportInfo[] {
    // 简化的实现：检查引用计数为0的导出
    // 实际实现需要更复杂的导入分析
    return fileExports.filter(exportInfo => exportInfo.referenceCount === 0);
  }

  /**
   * 创建未使用导出的问题
   */
  private createUnusedExportIssue(exportInfo: ExportInfo): ExportIssue {
    return {
      id: `unused-export-${exportInfo.location.filePath}-${exportInfo.name}`,
      type: ExportIssueType.UNUSED_EXPORT,
      severity: IssueSeverity.WARNING,
      title: `未使用的导出: ${exportInfo.name}`,
      description: `导出 '${exportInfo.name}' 未被使用`,
      location: exportInfo.location,
      relatedExport: exportInfo,
      suggestions: [
        {
          id: `remove-unused-export-${exportInfo.name}`,
          title: '移除未使用的导出',
          description: `删除未使用的导出声明以减少代码体积`,
          type: 'remove',
          fixType: 'manual_fix' as any,
          confidence: 0.9,
          impact: 'file',
          isSafe: true,
          affectedFiles: [exportInfo.location.filePath],
        },
      ],
      detectedAt: new Date(),
    };
  }

  /**
   * 检查默认导出冲突
   */
  private checkDefaultExportConflict(
    fileExports: ExportInfo[]
  ): ExportIssue | null {
    const defaultExports = fileExports.filter(exp => exp.type === 'default');

    if (
      defaultExports.length > 1 &&
      fileExports.length > 0 &&
      fileExports[0] &&
      defaultExports[0]
    ) {
      return {
        id: `default-export-conflict-${fileExports[0].location.filePath}`,
        type: ExportIssueType.DEFAULT_EXPORT_CONFLICT,
        severity: IssueSeverity.ERROR,
        title: `默认导出冲突`,
        description: `文件包含多个默认导出 (${defaultExports.length}个)`,
        location: defaultExports[0].location,
        suggestions: [
          {
            id: 'resolve-default-export-conflict',
            title: '解决默认导出冲突',
            description:
              '每个文件只能有一个默认导出，请选择保留一个或转换为命名导出',
            type: 'modify',
            fixType: 'manual_fix' as any,
            confidence: 0.95,
            impact: 'file',
            isSafe: false,
            affectedFiles: [fileExports[0].location.filePath],
          },
        ],
        detectedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * 检查命名一致性
   */
  private checkNamingConsistency(fileExports: ExportInfo[]): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 检查命名约定
    fileExports.forEach(exportInfo => {
      // 检查驼峰命名
      if (!this.isCamelCase(exportInfo.name) && exportInfo.type === 'named') {
        issues.push({
          id: `naming-convention-${exportInfo.location.filePath}-${exportInfo.name}`,
          type: ExportIssueType.EXPORT_INCONSISTENCY,
          severity: IssueSeverity.INFO,
          title: `命名约定问题: ${exportInfo.name}`,
          description: `导出名称 '${exportInfo.name}' 不符合驼峰命名约定`,
          location: exportInfo.location,
          relatedExport: exportInfo,
          suggestions: [
            {
              id: `fix-naming-${exportInfo.name}`,
              title: '修复命名约定',
              description: `将 '${exportInfo.name}' 改为驼峰命名`,
              type: 'modify',
              fixType: 'manual_fix' as any,
              confidence: 0.7,
              impact: 'file',
              isSafe: true,
              affectedFiles: [exportInfo.location.filePath],
            },
          ],
          detectedAt: new Date(),
        });
      }
    });

    return issues;
  }

  /**
   * 检查类型导出问题
   */
  private checkTypeExportIssues(fileExports: ExportInfo[]): ExportIssue[] {
    const issues: ExportIssue[] = [];

    fileExports.forEach(exportInfo => {
      // 检查类型导出的一致性
      if (exportInfo.valueType === 'type' && exportInfo.type !== 'named') {
        issues.push({
          id: `type-export-issue-${exportInfo.location.filePath}-${exportInfo.name}`,
          type: ExportIssueType.TYPE_EXPORT_ISSUE,
          severity: IssueSeverity.WARNING,
          title: `类型导出问题: ${exportInfo.name}`,
          description: `类型导出 '${exportInfo.name}' 应该使用命名导出`,
          location: exportInfo.location,
          relatedExport: exportInfo,
          suggestions: [
            {
              id: `fix-type-export-${exportInfo.name}`,
              title: '修复类型导出',
              description: '将类型导出改为命名导出以提高类型安全性',
              type: 'modify',
              fixType: 'manual_fix' as any,
              confidence: 0.8,
              impact: 'file',
              isSafe: true,
              affectedFiles: [exportInfo.location.filePath],
            },
          ],
          detectedAt: new Date(),
        });
      }
    });

    return issues;
  }

  /**
   * 全局导出分析
   */
  private analyzeGlobalExports(allExports: ExportInfo[]): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 检查重复的导出名称
    const duplicateIssues = this.checkDuplicateExports(allExports);
    issues.push(...duplicateIssues);

    // 检查循环依赖（简化的实现）
    const circularIssues = this.checkCircularDependencies(allExports);
    issues.push(...circularIssues);

    return issues;
  }

  /**
   * 检查重复的导出
   */
  private checkDuplicateExports(allExports: ExportInfo[]): ExportIssue[] {
    const issues: ExportIssue[] = [];
    const exportMap = new Map<string, ExportInfo[]>();

    // 按名称分组
    allExports.forEach(exportInfo => {
      if (!exportMap.has(exportInfo.name)) {
        exportMap.set(exportInfo.name, []);
      }
      exportMap.get(exportInfo.name)!.push(exportInfo);
    });

    // 查找重复的导出
    exportMap.forEach((exports, name) => {
      if (exports.length > 1) {
        // 只报告命名导出和默认导出的重复
        const namedExports = exports.filter(exp => exp.type === 'named');
        const defaultExports = exports.filter(exp => exp.type === 'default');

        if (namedExports.length > 1 && namedExports[0]) {
          issues.push({
            id: `duplicate-named-export-${name}`,
            type: ExportIssueType.EXPORT_INCONSISTENCY,
            severity: IssueSeverity.WARNING,
            title: `重复的命名导出: ${name}`,
            description: `命名导出 '${name}' 在多个文件中定义`,
            location: namedExports[0].location,
            suggestions: [
              {
                id: `resolve-duplicate-export-${name}`,
                title: '解决重复导出',
                description: `重命名或合并重复的导出 '${name}'`,
                type: 'modify',
                fixType: 'manual_fix' as any,
                confidence: 0.6,
                impact: 'project',
                isSafe: false,
                affectedFiles: namedExports.map(exp => exp.location.filePath),
              },
            ],
            detectedAt: new Date(),
          });
        }

        if (defaultExports.length > 1 && defaultExports[0]) {
          issues.push({
            id: `duplicate-default-export-${name}`,
            type: ExportIssueType.DEFAULT_EXPORT_CONFLICT,
            severity: IssueSeverity.ERROR,
            title: `重复的默认导出: ${name}`,
            description: `默认导出 '${name}' 在多个文件中定义`,
            location: defaultExports[0].location,
            suggestions: [
              {
                id: `resolve-duplicate-default-${name}`,
                title: '解决默认导出冲突',
                description: `重命名或合并重复的默认导出`,
                type: 'modify',
                fixType: 'manual_fix' as any,
                confidence: 0.8,
                impact: 'project',
                isSafe: false,
                affectedFiles: defaultExports.map(exp => exp.location.filePath),
              },
            ],
            detectedAt: new Date(),
          });
        }
      }
    });

    return issues;
  }

  /**
   * 检查循环依赖（简化的实现）
   */
  private checkCircularDependencies(allExports: ExportInfo[]): ExportIssue[] {
    // 这里需要更复杂的依赖图分析
    // 暂时返回空数组作为占位符
    return [];
  }

  /**
   * 检查是否为驼峰命名
   */
  private isCamelCase(str: string): boolean {
    // 简化的驼峰命名检查
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * 获取分析统计
   */
  getAnalysisStats(): {
    totalExports: number;
    issuesFound: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
  } {
    // 这里可以实现统计收集
    return {
      totalExports: 0,
      issuesFound: 0,
      issuesByType: {},
      issuesBySeverity: {},
    };
  }
}

/**
 * 默认导出分析器实例
 */
export const exportAnalyzer = new ExportAnalyzer({
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
  includeTypes: true,
  includeTests: false,
  concurrency: 5,
  typescriptConfig: {
    strict: false,
    checkTypeExports: true,
    target: 'ES2020',
  },
});
