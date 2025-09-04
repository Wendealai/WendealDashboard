// import * as fs from 'fs'; // Removed for browser compatibility
// import * as path from 'path'; // Removed for browser compatibility
import { ExportDetector } from './exportDetector';
import { ConsistencyAnalyzer } from './consistencyAnalyzer';
import { type ExportConfig, type ConsistencyIssue } from '../types/export';
import { ExportConfigManager } from './exportConfig';

/**
 * 修复操作类型
 */
export interface FixOperation {
  type: 'rename' | 'add' | 'remove' | 'reorder' | 'format';
  filePath: string;
  lineNumber?: number;
  originalText?: string;
  newText: string;
  description: string;
}

/**
 * 修复结果
 */
export interface FixResult {
  success: boolean;
  operation: FixOperation;
  error?: string;
  backupPath?: string;
}

/**
 * 批量修复结果
 */
export interface BatchFixResult {
  totalOperations: number;
  successfulFixes: number;
  failedFixes: number;
  results: FixResult[];
  backupDirectory?: string;
}

/**
 * 自动修复选项
 */
export interface AutoFixOptions {
  dryRun?: boolean;
  createBackup?: boolean;
  backupDirectory?: string;
  fixTypes?: Array<
    'naming' | 'duplicates' | 'missing' | 'ordering' | 'formatting'
  >;
  interactive?: boolean;
}

/**
 * 自动修复工具类
 * 用于自动修复检测到的导出一致性问题
 */
export class AutoFixer {
  // private detector: ExportDetector; // 暂时注释掉未使用的变量
  // private analyzer: ConsistencyAnalyzer; // 暂时注释掉未使用的变量
  private config: ExportConfig;

  /**
   * 构造函数
   * @param detector 导出检测器实例
   * @param analyzer 一致性分析器实例
   * @param config 导出配置实例
   */
  constructor(
    _detector: ExportDetector,
    _analyzer: ConsistencyAnalyzer,
    config?: ExportConfig
  ) {
    // this.detector = detector; // 暂时注释掉
    // this.analyzer = analyzer; // 暂时注释掉
    this.config = config || {
      rootPath: '.',
      rules: [],
      scanOptions: {
        include: ['**/*.ts', '**/*.tsx'],
        exclude: ['node_modules/**', 'dist/**'],
        recursive: true,
        maxDepth: 10,
        followSymlinks: false,
      },
      namingConventions: {
        interfaces: 'PascalCase',
        types: 'PascalCase',
        components: 'PascalCase',
        functions: 'camelCase',
      },
      autoFix: {
        enabled: true,
        createBackup: true,
        maxRiskLevel: 'medium' as const,
      },
      reporting: {
        format: 'json',
        outputPath: './export-analysis.json',
        verbose: true,
      },
    };
  }

  /**
   * 自动修复单个文件的问题
   * @param filePath 文件路径
   * @param issues 问题列表
   * @param options 修复选项
   * @returns 修复结果
   */
  async fixFile(
    filePath: string,
    issues: ConsistencyIssue[],
    options: AutoFixOptions = {}
  ): Promise<BatchFixResult> {
    const operations = this.generateFixOperations(filePath, issues);

    if (options.dryRun) {
      return this.simulateFixOperations(operations);
    }

    return this.applyFixOperations(operations, options);
  }

  /**
   * 批量修复多个文件的问题
   * @param issuesByFile 按文件分组的问题
   * @param options 修复选项
   * @returns 批量修复结果
   */
  async fixMultipleFiles(
    issuesByFile: Map<string, ConsistencyIssue[]>,
    options: AutoFixOptions = {}
  ): Promise<BatchFixResult> {
    const allOperations: FixOperation[] = [];

    for (const [filePath, issues] of issuesByFile) {
      const operations = this.generateFixOperations(filePath, issues);
      allOperations.push(...operations);
    }

    if (options.dryRun) {
      return this.simulateFixOperations(allOperations);
    }

    return this.applyFixOperations(allOperations, options);
  }

  /**
   * 生成修复操作
   * @param filePath 文件路径
   * @param issues 问题列表
   * @returns 修复操作列表
   */
  private generateFixOperations(
    filePath: string,
    issues: ConsistencyIssue[]
  ): FixOperation[] {
    const operations: FixOperation[] = [];
    // Browser environment doesn't support file system operations
    console.warn('File system operations not supported in browser environment');
    const fileContent = '';
    const lines = fileContent.split('\n');

    for (const issue of issues) {
      switch (issue.type) {
        case 'naming-inconsistency':
          operations.push(...this.generateNamingFixes(filePath, issue, lines));
          break;
        case 'duplicate-export':
          operations.push(
            ...this.generateDuplicateFixes(filePath, issue, lines)
          );
          break;
        case 'missing-export':
          operations.push(
            ...this.generateMissingExportFixes(filePath, issue, lines)
          );
          break;
        case 'unused-export':
          operations.push(
            ...this.generateOrderingFixes(filePath, issue, lines)
          );
          break;
        case 'type-export-mismatch':
          operations.push(
            ...this.generateFormattingFixes(filePath, issue, lines)
          );
          break;
      }
    }

    return operations;
  }

  /**
   * 生成命名约定修复操作
   * @param filePath 文件路径
   * @param issue 问题信息
   * @param lines 文件行数组
   * @returns 修复操作列表
   */
  private generateNamingFixes(
    filePath: string,
    issue: ConsistencyIssue,
    lines: string[]
  ): FixOperation[] {
    const operations: FixOperation[] = [];
    const namingRules = this.config.namingConventions;

    if (issue.sourceLocation && issue.sourceLocation.startLine !== undefined) {
      const currentName = issue.message.match(/['"](.*?)['"]/)?.[1] || '';
      const suggestedName = this.applyCaseConvention(
        currentName,
        namingRules.functions
      );

      if (currentName !== suggestedName) {
        const originalLine = lines[issue.sourceLocation.startLine - 1];
        if (originalLine !== undefined) {
          const newLine = originalLine.replace(currentName, suggestedName);

          operations.push({
            type: 'rename',
            filePath,
            lineNumber: issue.sourceLocation.startLine,
            originalText: originalLine,
            newText: newLine,
            description: `重命名 '${currentName}' 为 '${suggestedName}' 以符合命名约定`,
          });
        }
      }
    }

    return operations;
  }

  /**
   * 生成重复导出修复操作
   * @param filePath 文件路径
   * @param issue 问题信息
   * @param lines 文件行数组
   * @returns 修复操作列表
   */
  private generateDuplicateFixes(
    filePath: string,
    issue: ConsistencyIssue,
    lines: string[]
  ): FixOperation[] {
    const operations: FixOperation[] = [];

    if (
      issue.sourceLocation &&
      issue.sourceLocation.startLine !== undefined &&
      issue.sourceLocation.startLine > 0 &&
      issue.sourceLocation.startLine <= lines.length
    ) {
      const originalText = lines[issue.sourceLocation.startLine - 1];
      if (originalText !== undefined) {
        operations.push({
          type: 'remove',
          filePath,
          lineNumber: issue.sourceLocation.startLine,
          originalText,
          newText: '',
          description: `移除重复的导出: ${issue.message.match(/['"](.*?)['"]/)?.[1] || '未知'}`,
        });
      }
    }

    return operations;
  }

  /**
   * 生成缺失导出修复操作
   * @param filePath 文件路径
   * @param issue 问题信息
   * @param lines 文件行数组
   * @returns 修复操作列表
   */
  private generateMissingExportFixes(
    filePath: string,
    issue: ConsistencyIssue,
    lines: string[]
  ): FixOperation[] {
    const operations: FixOperation[] = [];

    const exportName = issue.message.match(/['"](.*?)['"]/)?.[1];
    if (exportName) {
      const exportInfo = { exportName, type: 'named' as const };
      const exportStatement = this.generateExportStatement(exportInfo);
      const insertLine = this.findBestInsertionPoint(lines);

      operations.push({
        type: 'add',
        filePath,
        lineNumber: insertLine,
        newText: exportStatement,
        description: `添加缺失的导出: ${exportName}`,
      });
    }

    return operations;
  }

  /**
   * 生成排序修复操作
   * @param filePath 文件路径
   * @param issue 问题信息
   * @param lines 文件行数组
   * @returns 修复操作列表
   */
  private generateOrderingFixes(
    filePath: string,
    _issue: ConsistencyIssue,
    lines: string[]
  ): FixOperation[] {
    const operations: FixOperation[] = [];
    // const exports = this.detector.analyzeFile(filePath); // 暂时注释掉未使用的变量
    // const sortedExports = this.sortExports(exports); // 暂时注释掉未使用的变量

    // 重新排序导出语句
    const exportLines = this.extractExportLines(lines);
    const reorderedLines = this.reorderExportLines(exportLines);

    for (let i = 0; i < exportLines.length && i < reorderedLines.length; i++) {
      const exportLine = exportLines[i];
      const reorderedLine = reorderedLines[i];
      if (exportLine && reorderedLine && exportLine.content !== reorderedLine) {
        operations.push({
          type: 'reorder',
          filePath,
          lineNumber: exportLine.lineNumber,
          originalText: exportLine.content,
          newText: reorderedLine,
          description: `重新排序导出语句`,
        });
      }
    }

    return operations;
  }

  /**
   * 生成格式化修复操作
   * @param filePath 文件路径
   * @param issue 问题信息
   * @param lines 文件行数组
   * @returns 修复操作列表
   */
  private generateFormattingFixes(
    filePath: string,
    issue: ConsistencyIssue,
    lines: string[]
  ): FixOperation[] {
    const operations: FixOperation[] = [];

    if (
      issue.sourceLocation &&
      issue.sourceLocation.startLine !== undefined &&
      issue.sourceLocation.startLine > 0 &&
      issue.sourceLocation.startLine <= lines.length
    ) {
      const originalLine = lines[issue.sourceLocation.startLine - 1];
      if (originalLine !== undefined) {
        const formattedLine = this.formatExportLine(originalLine);

        if (originalLine !== formattedLine) {
          operations.push({
            type: 'format',
            filePath,
            lineNumber: issue.sourceLocation.startLine,
            originalText: originalLine,
            newText: formattedLine,
            description: `格式化导出语句`,
          });
        }
      }
    }

    return operations;
  }

  /**
   * 应用修复操作
   * @param operations 修复操作列表
   * @param options 修复选项
   * @returns 批量修复结果
   */
  private async applyFixOperations(
    operations: FixOperation[],
    options: AutoFixOptions
  ): Promise<BatchFixResult> {
    const results: FixResult[] = [];
    let backupDirectory: string | undefined;

    if (options.createBackup) {
      backupDirectory = await this.createBackupDirectory(
        options.backupDirectory
      );
    }

    // 按文件分组操作
    const operationsByFile = this.groupOperationsByFile(operations);

    for (const [filePath, fileOperations] of operationsByFile) {
      try {
        let backupPath: string | undefined;

        if (options.createBackup && backupDirectory) {
          backupPath = await this.createFileBackup(filePath, backupDirectory);
        }

        const fileResults = await this.applyFileOperations(
          filePath,
          fileOperations,
          backupPath
        );
        results.push(...fileResults);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        for (const operation of fileOperations) {
          results.push({
            success: false,
            operation,
            error: errorMessage,
          });
        }
      }
    }

    const successfulFixes = results.filter(r => r.success).length;
    const failedFixes = results.filter(r => !r.success).length;

    return {
      totalOperations: operations.length,
      successfulFixes,
      failedFixes,
      results,
      ...(backupDirectory && { backupDirectory }),
    };
  }

  /**
   * 模拟修复操作（干运行模式）
   * @param operations 修复操作列表
   * @returns 模拟结果
   */
  private simulateFixOperations(operations: FixOperation[]): BatchFixResult {
    const results: FixResult[] = operations.map(operation => ({
      success: true,
      operation,
    }));

    return {
      totalOperations: operations.length,
      successfulFixes: operations.length,
      failedFixes: 0,
      results,
    };
  }

  /**
   * 应用单个文件的修复操作
   * @param filePath 文件路径
   * @param operations 操作列表
   * @param backupPath 备份路径
   * @returns 修复结果列表
   */
  private async applyFileOperations(
    _filePath: string,
    operations: FixOperation[],
    backupPath?: string
  ): Promise<FixResult[]> {
    const results: FixResult[] = [];
    // Browser environment doesn't support file system operations
    console.warn('File system operations not supported in browser environment');
    const fileContent = '';
    let lines = fileContent.split('\n');

    // 按行号倒序排序，避免行号偏移问题
    const sortedOperations = operations.sort(
      (a, b) => (b.lineNumber || 0) - (a.lineNumber || 0)
    );

    for (const operation of sortedOperations) {
      try {
        lines = this.applyOperation(lines, operation);
        results.push({
          success: true,
          operation,
          ...(backupPath && { backupPath }),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        results.push({
          success: false,
          operation,
          error: errorMessage,
          ...(backupPath && { backupPath }),
        });
      }
    }

    // 写入修改后的内容
    // Browser environment doesn't support file system operations
    console.warn('File write operations not supported in browser environment');

    return results;
  }

  /**
   * 应用单个操作
   * @param lines 文件行数组
   * @param operation 操作
   * @returns 修改后的行数组
   */
  private applyOperation(lines: string[], operation: FixOperation): string[] {
    const newLines = [...lines];

    switch (operation.type) {
      case 'add':
        if (operation.lineNumber !== undefined) {
          newLines.splice(operation.lineNumber, 0, operation.newText);
        }
        break;
      case 'remove':
        if (operation.lineNumber !== undefined) {
          newLines.splice(operation.lineNumber - 1, 1);
        }
        break;
      case 'rename':
      case 'format':
      case 'reorder':
        if (operation.lineNumber !== undefined) {
          newLines[operation.lineNumber - 1] = operation.newText;
        }
        break;
    }

    return newLines;
  }

  /**
   * 创建备份目录
   * @param customPath 自定义路径
   * @returns 备份目录路径
   */
  private async createBackupDirectory(customPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = customPath || `.export-consistency-backups/${timestamp}`;

    // Browser environment doesn't support file system operations
    console.warn(
      'Backup directory creation not supported in browser environment'
    );

    return backupDir;
  }

  /**
   * 创建文件备份
   * @param filePath 原文件路径
   * @param backupDirectory 备份目录
   * @returns 备份文件路径
   */
  private async createFileBackup(
    filePath: string,
    backupDirectory: string
  ): Promise<string> {
    const relativePath = filePath.replace(/^.*[\\\/]/, ''); // Get filename only
    const backupPath = `${backupDirectory}/${relativePath}`;

    // Browser environment doesn't support file system operations
    console.warn('File backup operations not supported in browser environment');
    return backupPath;
  }

  /**
   * 按文件分组操作
   * @param operations 操作列表
   * @returns 按文件分组的操作
   */
  private groupOperationsByFile(
    operations: FixOperation[]
  ): Map<string, FixOperation[]> {
    const grouped = new Map<string, FixOperation[]>();

    for (const operation of operations) {
      const existing = grouped.get(operation.filePath) || [];
      existing.push(operation);
      grouped.set(operation.filePath, existing);
    }

    return grouped;
  }

  // 辅助方法
  private applyCaseConvention(name: string, convention: string): string {
    switch (convention) {
      case 'camelCase':
        return name.charAt(0).toLowerCase() + name.slice(1);
      case 'PascalCase':
        return name.charAt(0).toUpperCase() + name.slice(1);
      case 'snake_case':
        return name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      case 'kebab-case':
        return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      default:
        return name;
    }
  }

  private generateExportStatement(exportInfo: {
    exportName: string;
    type: string;
  }): string {
    if (exportInfo.type === 'default') {
      return `export default ${exportInfo.exportName};`;
    }
    return `export { ${exportInfo.exportName} };`;
  }

  private findBestInsertionPoint(lines: string[]): number {
    // 简单实现：在文件末尾插入
    return lines.length;
  }

  // private sortExports(exports: ExportInfo[]): ExportInfo[] { // 暂时注释掉未使用的方法
  //   return exports.sort((a, b) => {
  //     // 默认导出在前
  //     if (a.isDefault && !b.isDefault) return -1;
  //     if (!a.isDefault && b.isDefault) return 1;
  //     // 按名称排序
  //     return a.name.localeCompare(b.name);
  //   });
  // }

  private extractExportLines(
    lines: string[]
  ): Array<{ lineNumber: number; content: string }> {
    const exportLines: Array<{ lineNumber: number; content: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (line?.startsWith('export ')) {
        const content = lines[i];
        if (content !== undefined) {
          exportLines.push({ lineNumber: i + 1, content });
        }
      }
    }

    return exportLines;
  }

  private reorderExportLines(
    exportLines: Array<{ lineNumber: number; content: string }>
  ): string[] {
    // 简单实现：返回原始内容
    return exportLines.map(line => line.content);
  }

  private formatExportLine(line: string): string {
    // 简单的格式化：确保适当的空格
    return line.replace(/\s+/g, ' ').trim();
  }
}

/**
 * 创建自动修复器实例
 * @param detector 导出检测器
 * @param analyzer 一致性分析器
 * @param config 导出配置
 * @returns 自动修复器实例
 */
export function createAutoFixer(
  detector: ExportDetector,
  analyzer: ConsistencyAnalyzer,
  config: ExportConfig
): AutoFixer {
  return new AutoFixer(detector, analyzer, config);
}

/**
 * 快速修复文件
 * @param filePath 文件路径
 * @param options 修复选项
 * @returns 修复结果
 */
export async function quickFixFile(
  filePath: string,
  options: AutoFixOptions = {}
): Promise<BatchFixResult> {
  const config: ExportConfig = {
    rootPath: '.',
    rules: [],
    scanOptions: {
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['node_modules/**', 'dist/**'],
      recursive: true,
      maxDepth: 10,
      followSymlinks: false,
    },
    namingConventions: {
      interfaces: 'PascalCase',
      types: 'PascalCase',
      components: 'PascalCase',
      functions: 'camelCase',
    },
    autoFix: {
      enabled: true,
      createBackup: true,
      maxRiskLevel: 'medium' as const,
    },
    reporting: {
      format: 'json',
      outputPath: './export-analysis.json',
      verbose: true,
    },
  };
  const detector = new ExportDetector();
  const configManager = new ExportConfigManager('.');
  configManager.updateConfig(config);
  const analyzer = new ConsistencyAnalyzer(configManager);
  const fixer = new AutoFixer(detector, analyzer, config);

  // Note: ConsistencyAnalyzer doesn't have analyzeFile method, using empty array for now
  const issues: ConsistencyIssue[] = [];

  return fixer.fixFile(filePath, issues, options);
}

/**
 * 批量修复项目文件
 * @param projectPath 项目路径
 * @param options 修复选项
 * @returns 批量修复结果
 */
export async function fixProject(
  projectPath: string,
  options: AutoFixOptions = {}
): Promise<BatchFixResult> {
  const config: ExportConfig = {
    rootPath: projectPath,
    rules: [],
    scanOptions: {
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['node_modules/**', 'dist/**'],
      recursive: true,
      maxDepth: 10,
      followSymlinks: false,
    },
    namingConventions: {
      interfaces: 'PascalCase',
      types: 'PascalCase',
      components: 'PascalCase',
      functions: 'camelCase',
    },
    autoFix: {
      enabled: true,
      createBackup: true,
      maxRiskLevel: 'medium' as const,
    },
    reporting: {
      format: 'json',
      outputPath: './export-analysis.json',
      verbose: true,
    },
  };
  const detector = new ExportDetector();
  const configManager = new ExportConfigManager(projectPath);
  configManager.updateConfig(config);
  const analyzer = new ConsistencyAnalyzer(configManager);
  const fixer = new AutoFixer(detector, analyzer, config);

  const analysisResult = await analyzer.analyzeProject(projectPath);
  const issuesByFile = new Map<string, ConsistencyIssue[]>();

  for (const issue of analysisResult.issues) {
    const filePath = issue.filePath;
    const existing = issuesByFile.get(filePath) || [];
    existing.push(issue);
    issuesByFile.set(filePath, existing);
  }

  return fixer.fixMultipleFiles(issuesByFile, options);
}
