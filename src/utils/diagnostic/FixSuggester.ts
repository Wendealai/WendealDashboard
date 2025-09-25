/**
 * Fix Suggester Component
 * 修复建议生成器
 */

import {
  ExportIssueType,
  IssueSeverity,
  type ExportIssue,
  type FixSuggestion,
  type DiagnosticConfig,
  type FixType,
} from '@/types/exportDiagnostic';

/**
 * 修复建议器类
 */
export class FixSuggester {
  private config: DiagnosticConfig;

  constructor(config: DiagnosticConfig) {
    this.config = config;
  }

  /**
   * 为问题生成修复建议
   */
  async suggestFixes(issues: ExportIssue[]): Promise<FixSuggestion[]> {
    const suggestions: FixSuggestion[] = [];

    for (const issue of issues) {
      const issueSuggestions = this.generateSuggestionsForIssue(issue);
      suggestions.push(...issueSuggestions);
    }

    // 去重和排序
    return this.deduplicateAndSortSuggestions(suggestions);
  }

  /**
   * 为单个问题生成修复建议
   */
  private generateSuggestionsForIssue(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    switch (issue.type) {
      case ExportIssueType.UNUSED_EXPORT:
        suggestions.push(...this.suggestForUnusedExport(issue));
        break;

      case ExportIssueType.MISSING_EXPORT:
        suggestions.push(...this.suggestForMissingExport(issue));
        break;

      case ExportIssueType.EXPORT_INCONSISTENCY:
        suggestions.push(...this.suggestForExportInconsistency(issue));
        break;

      case ExportIssueType.CIRCULAR_DEPENDENCY:
        suggestions.push(...this.suggestForCircularDependency(issue));
        break;

      case ExportIssueType.TYPE_EXPORT_ISSUE:
        suggestions.push(...this.suggestForTypeExportIssue(issue));
        break;

      case ExportIssueType.DEFAULT_EXPORT_CONFLICT:
        suggestions.push(...this.suggestForDefaultExportConflict(issue));
        break;

      default:
        suggestions.push(this.createGenericSuggestion(issue));
    }

    return suggestions;
  }

  /**
   * 为未使用导出生成建议
   */
  private suggestForUnusedExport(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (issue.relatedExport) {
      // 移除未使用的导出
      suggestions.push({
        id: `remove-unused-export-${issue.relatedExport.name}`,
        title: '移除未使用的导出',
        description: `删除未使用的导出声明以减少代码体积`,
        fixType: 'manual_fix' as FixType,
        confidence: 0.9,
        codeSnippet: '',
        affectedFiles: [issue.location.filePath],
        relatedIssue: issue,
      });

      // 如果是命名导出，建议转换为默认导出（如果适用）
      if (issue.relatedExport.type === 'named') {
        suggestions.push({
          id: `convert-to-default-${issue.relatedExport.name}`,
          title: '转换为默认导出',
          description: `将命名导出转换为默认导出（如果这是文件的唯一导出）`,
          fixType: 'manual_fix' as FixType,
          confidence: 0.6,
          codeSnippet: `export default ${issue.relatedExport.name};`,
          affectedFiles: [issue.location.filePath],
          relatedIssue: issue,
        });
      }
    }

    return suggestions;
  }

  /**
   * 为缺失导出生成建议
   */
  private suggestForMissingExport(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // 建议添加导出声明
    suggestions.push({
      id: `add-missing-export-${issue.location.filePath}`,
      title: '添加缺失的导出',
      description: `在相应文件中添加缺失的导出声明`,
      fixType: 'manual_fix' as FixType,
      confidence: 0.8,
      codeSnippet: `export const ${issue.description.match(/'([^']+)'/)?.[1] || 'missingExport'} = /* implementation */;`,
      affectedFiles: [issue.location.filePath],
      relatedIssue: issue,
    });

    return suggestions;
  }

  /**
   * 为导出不一致生成建议
   */
  private suggestForExportInconsistency(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // 重命名建议
    if (issue.description.includes('命名约定')) {
      suggestions.push({
        id: `fix-naming-convention-${issue.location.filePath}`,
        title: '修复命名约定',
        description: `将导出名称改为符合项目命名约定的格式`,
        fixType: 'manual_fix' as FixType,
        confidence: 0.7,
        codeSnippet: `// 例如: camelCase 或 PascalCase`,
        affectedFiles: [issue.location.filePath],
        relatedIssue: issue,
      });
    }

    // 重复导出建议
    if (issue.description.includes('多个文件中定义')) {
      suggestions.push({
        id: `resolve-duplicate-exports-${issue.location.filePath}`,
        title: '解决重复导出',
        description: `重命名或合并重复的导出声明`,
        fixType: 'manual_fix' as FixType,
        confidence: 0.6,
        codeSnippet: `// 考虑使用 barrel exports 或重构模块结构`,
        affectedFiles: issue.relatedFiles || [issue.location.filePath],
        relatedIssue: issue,
      });
    }

    return suggestions;
  }

  /**
   * 为循环依赖生成建议
   */
  private suggestForCircularDependency(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: `resolve-circular-dependency-${issue.location.filePath}`,
      title: '解决循环依赖',
      description: `重构代码以消除模块间的循环引用`,
      fixType: 'manual_fix' as FixType,
      confidence: 0.5,
      codeSnippet: `// 建议方案:
// 1. 提取共同依赖到单独模块
// 2. 使用依赖注入模式
// 3. 重构模块职责`,
      affectedFiles: issue.relatedFiles || [issue.location.filePath],
      relatedIssue: issue,
    });

    return suggestions;
  }

  /**
   * 为类型导出问题生成建议
   */
  private suggestForTypeExportIssue(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: `fix-type-export-${issue.location.filePath}`,
      title: '修复类型导出',
      description: `将类型导出改为命名导出以提高类型安全性`,
      fixType: 'manual_fix' as FixType,
      confidence: 0.8,
      codeSnippet: `export type { ${issue.description.match(/'([^']+)'/)?.[1] || 'TypeName'} };`,
      affectedFiles: [issue.location.filePath],
      relatedIssue: issue,
    });

    return suggestions;
  }

  /**
   * 为默认导出冲突生成建议
   */
  private suggestForDefaultExportConflict(issue: ExportIssue): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    suggestions.push({
      id: `resolve-default-export-conflict-${issue.location.filePath}`,
      title: '解决默认导出冲突',
      description: `每个文件只能有一个默认导出，请选择保留一个或转换为命名导出`,
      fixType: 'manual_fix' as FixType,
      confidence: 0.9,
      codeSnippet: `// 保留一个默认导出，其余改为命名导出:
// export { otherExport1, otherExport2 };`,
      affectedFiles: [issue.location.filePath],
      relatedIssue: issue,
    });

    return suggestions;
  }

  /**
   * 创建通用建议
   */
  private createGenericSuggestion(issue: ExportIssue): FixSuggestion {
    return {
      id: `generic-fix-${issue.id}`,
      title: '查看问题详情',
      description: `请手动检查并修复此导出问题`,
      fixType: 'manual_fix' as FixType,
      confidence: 0.3,
      codeSnippet: `// ${issue.description}`,
      affectedFiles: [issue.location.filePath],
      relatedIssue: issue,
    };
  }

  /**
   * 去重和排序建议
   */
  private deduplicateAndSortSuggestions(
    suggestions: FixSuggestion[]
  ): FixSuggestion[] {
    // 去重
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, self) =>
        index === self.findIndex(s => s.id === suggestion.id)
    );

    // 按置信度排序（高到低）
    return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 验证修复建议
   */
  async validateFixes(fixes: FixSuggestion[]): Promise<{
    valid: FixSuggestion[];
    invalid: FixSuggestion[];
    warnings: string[];
  }> {
    const valid: FixSuggestion[] = [];
    const invalid: FixSuggestion[] = [];
    const warnings: string[] = [];

    for (const fix of fixes) {
      try {
        const isValid = await this.validateFix(fix);
        if (isValid) {
          valid.push(fix);
        } else {
          invalid.push(fix);
          warnings.push(`修复建议 "${fix.title}" 可能无效`);
        }
      } catch (error) {
        invalid.push(fix);
        warnings.push(`验证修复建议失败: ${error}`);
      }
    }

    return { valid, invalid, warnings };
  }

  /**
   * 验证单个修复建议
   */
  private async validateFix(fix: FixSuggestion): Promise<boolean> {
    // 基本验证：检查必要字段
    if (!fix.id || !fix.title || !fix.affectedFiles.length) {
      return false;
    }

    // 检查置信度范围
    if (fix.confidence < 0 || fix.confidence > 1) {
      return false;
    }

    // 检查受影响文件是否存在
    // 这里可以添加更复杂的验证逻辑

    return true;
  }

  /**
   * 获取建议统计
   */
  getSuggestionStats(): {
    totalSuggestions: number;
    autoFixable: number;
    manualFixable: number;
    averageConfidence: number;
  } {
    // 这里可以实现统计收集
    return {
      totalSuggestions: 0,
      autoFixable: 0,
      manualFixable: 0,
      averageConfidence: 0,
    };
  }
}

/**
 * 默认修复建议器实例
 */
export const fixSuggester = new FixSuggester({
  filePatterns: ['**/*.{ts,tsx,js,jsx}'],
  ignorePatterns: ['**/node_modules/**'],
  maxDepth: 10,
  timeout: 30000,
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000,
  severityThreshold: 'info' as any,
});
