import type {
  ExportInfo,
  ConsistencyIssue,
  ConsistencyIssueType,
  IssueSeverity,
  ExportConfig,
  FileInfo,
  AnalysisSummary,
  ProjectAnalysisResult,
  // FileMetadata,
} from '../types/export';
import { ExportDetector } from './exportDetector';
// import { FileScanner } from './fileScanner'; // Removed - fileScanner deleted
import { ExportConfigManager } from './exportConfig';
// import * as path from 'path'; // Removed for browser compatibility

/**
 * 一致性分析器类 - 用于分析导出一致性并识别问题
 */
export class ConsistencyAnalyzer {
  private configManager: ExportConfigManager;
  // private fileScanner: FileScanner; // Removed - FileScanner deleted
  private exportDetector: ExportDetector;

  constructor(configManager: ExportConfigManager) {
    this.configManager = configManager;
    // this.fileScanner = new FileScanner(configManager.getConfig()); // Removed - FileScanner deleted
    this.exportDetector = new ExportDetector();
  }

  /**
   * 分析项目的导出一致性
   * @param projectPath - 项目根路径
   * @returns 项目分析结果
   */
  public async analyzeProject(
    projectPath: string
  ): Promise<ProjectAnalysisResult> {
    const config = this.configManager.getConfig();
    // const startTime = Date.now();

    try {
      // 扫描项目文件
      // const scanResult = await this.fileScanner.scanProject(projectPath);
      // const files = scanResult.filter(
      //   (file: FileMetadata) => file.fileInfo.isTypeScript
      // );

      // 初始化导出检测器
      // const filePaths = files.map((file: FileMetadata) => file.fileInfo.path);
      const filePaths: string[] = []; // 临时空数组
      this.exportDetector.initializeProgram(filePaths);

      // 分析每个文件
      const fileAnalysisResults: Map<string, ConsistencyIssue[]> = new Map();
      const allExports: Map<string, ExportInfo[]> = new Map();

      // for (const file of files) {
      //   const exports = this.exportDetector.analyzeFile(file.fileInfo.path);
      //   allExports.set(file.fileInfo.path, exports);

      //   const issues = await this.analyzeFileConsistency(
      //     file.fileInfo,
      //     exports,
      //     config
      // );
      // if (issues.length > 0) {
      //   fileAnalysisResults.set(file.fileInfo.path, issues);
      // }
      // }

      // 分析跨文件一致性
      const crossFileIssues = this.analyzeCrossFileConsistency(
        allExports,
        config
      );

      // 合并所有问题
      const allIssues: ConsistencyIssue[] = [];
      for (const issues of fileAnalysisResults.values()) {
        allIssues.push(...issues);
      }
      allIssues.push(...crossFileIssues);

      // 生成分析摘要
      const summary = this.generateAnalysisSummary(allIssues);

      // const endTime = Date.now();
      // const analysisTime = endTime - startTime;

      return {
        projectPath,
        scanTimestamp: new Date().toISOString(),
        totalFiles: 0, // files.length,
        analyzedFiles: 0, // files.length,
        issues: allIssues,
        fixedIssues: [],
        summary,
        config,
      };
    } finally {
      this.exportDetector.dispose();
    }
  }

  // /**
  //  * 分析单个文件的导出一致性
  //  * @param file - 文件信息
  //  * @param exports - 导出信息数组
  //  * @param config - 配置信息
  //  * @returns 一致性问题数组
  //  */
  // private async analyzeFileConsistency(
  //   file: FileInfo,
  //   exports: ExportInfo[],
  //   config: ExportConfig
  // ): Promise<ConsistencyIssue[]> {
  //   const issues: ConsistencyIssue[] = [];

  //   // 检查命名约定
  //   const namingIssues = this.checkNamingConventions(exports, config);
  //   issues.push(...namingIssues);

  //   // 检查导出模式
  //   const patternIssues = this.checkExportPatterns(exports, config);
  //   issues.push(...patternIssues);

  //   // 检查重复导出
  //   const duplicateIssues = this.checkDuplicateExports(exports, file.path);
  //   issues.push(...duplicateIssues);

  //   // 检查默认导出规则
  //   const defaultExportIssues = this.checkDefaultExportRules(
  //     file.path,
  //     exports,
  //     config
  //   );
  //   issues.push(...defaultExportIssues);

  //   return issues;
  // }

  /**
   * 检查命名约定
   * @param exports - 导出信息数组
   * @param config - 配置信息
   * @returns 命名问题数组
   */
  // private checkNamingConventions(
  //   exports: ExportInfo[],
  //   config: ExportConfig
  // ): ConsistencyIssue[] {
  //   const issues: ConsistencyIssue[] = [];
  //   const namingRules = config.rules.find(rule => rule.name === 'naming');

  //   if (!namingRules || !namingRules.enabled) {
  //     return issues;
  //   }

  //   for (const exportInfo of exports) {
  //     const { exportName, exportType, sourceLocation } = exportInfo;

  //     // 跳过特殊导出
  //     if (exportName === '*' || exportName === '=') {
  //       continue;
  //     }

  //     let expectedPattern: RegExp | undefined;
  //     // let ruleName: string; // 暂时注释掉未使用的变量

  //     // 根据导出类型选择命名规则
  //     if (exportType === 'default') {
  //       expectedPattern = new RegExp(
  //         namingRules.options?.defaultExport || '.*'
  //       );
  //     } else {
  //       expectedPattern = new RegExp(namingRules.options?.namedExport || '.*');
  //     }

  //     if (expectedPattern && !expectedPattern.test(exportName)) {
  //       issues.push({
  //         id: `naming-${exportInfo.filePath}-${exportName}-${Date.now()}`,
  //         type: 'naming-inconsistency',
  //         severity: namingRules.severity,
  //         filePath: exportInfo.filePath,
  //         message: `Export '${exportName}' does not follow naming convention '${expectedPattern.source}'`,
  //         autoFixable: false,
  //         relatedFiles: [],
  //         sourceLocation: sourceLocation,
  //       });
  //     }
  //   }

  //   return issues;
  // }

  // /**
  //  * 检查导出模式
  //  * @param exports - 导出信息数组
  //  * @param config - 配置信息
  //  * @returns 模式问题数组
  //  */
  // private checkExportPatterns(
  //   exports: ExportInfo[],
  //   config: ExportConfig
  // ): ConsistencyIssue[] {
  //   const issues: ConsistencyIssue[] = [];
  //   const patternRules = config.rules.find(
  //     rule => rule.name === 'exportPattern'
  //   );

  //   if (!patternRules || !patternRules.enabled) {
  //     return issues;
  //   }

  //   // 检查是否有禁止的导出模式
  //   for (const exportInfo of exports) {
  //     const { exportType, sourceLocation } = exportInfo;

  //     // 检查是否禁止默认导出
  //     if (exportType === 'default' && patternRules.options?.noDefaultExport) {
  //       issues.push({
  //         id: `pattern-default-${exportInfo.filePath}-${Date.now()}`,
  //         type: 'naming-inconsistency',
  //         severity: patternRules.severity,
  //         filePath: exportInfo.filePath,
  //         message: 'Default exports are not allowed',
  //         autoFixable: false,
  //         relatedFiles: [],
  //         sourceLocation: sourceLocation,
  //       });
  //     }

  //     // 检查是否禁止命名空间导出
  //     if (
  //       exportType === 'namespace' &&
  //       patternRules.options?.noNamespaceExport
  //     ) {
  //       issues.push({
  //         id: `pattern-namespace-${exportInfo.filePath}-${Date.now()}`,
  //         type: 'naming-inconsistency',
  //         severity: patternRules.severity,
  //         filePath: exportInfo.filePath,
  //         message: 'Namespace exports are not allowed',
  //         autoFixable: false,
  //         relatedFiles: [],
  //         sourceLocation: sourceLocation,
  //       });
  //     }

  //     // 检查是否禁止重新导出
  //     if (exportType === 'reexport' && patternRules.options?.noReexport) {
  //       issues.push({
  //         id: `pattern-reexport-${exportInfo.filePath}-${Date.now()}`,
  //         type: 'naming-inconsistency',
  //         severity: patternRules.severity,
  //         filePath: exportInfo.filePath,
  //         message: 'Re-exports are not allowed',
  //         autoFixable: false,
  //         relatedFiles: [],
  //         sourceLocation: sourceLocation,
  //       });
  //     }
  //   }

  //   return issues;
  // }

  // /**
  //  * 检查重复导出
  //  * @param exports - 导出信息数组
  //  * @param filePath - 文件路径
  //  * @returns 重复导出问题数组
  //  */
  // private checkDuplicateExports(
  //   exports: ExportInfo[],
  //   filePath: string
  // ): ConsistencyIssue[] {
  //   const issues: ConsistencyIssue[] = [];
  //   const exportNames = new Map<string, ExportInfo[]>();

  //   // 收集所有导出名称
  //   for (const exportInfo of exports) {
  //     const { exportName } = exportInfo;

  //     if (!exportNames.has(exportName)) {
  //       exportNames.set(exportName, []);
  //     }
  //     exportNames.get(exportName)!.push(exportInfo);
  //   }

  //   // 检查重复
  //   for (const [, duplicates] of exportNames) {
  //     if (duplicates.length > 1) {
  //       for (const duplicate of duplicates) {
  //         issues.push({
  //           id: `duplicate-${filePath}-${duplicate.exportName}-${Date.now()}`,
  //           type: 'duplicate-export',
  //           severity: 'error',
  //           filePath: filePath,
  //           message: `Duplicate export '${duplicate.exportName}' found`,
  //           autoFixable: false,
  //           relatedFiles: [],
  //           sourceLocation: duplicate.sourceLocation,
  //         });
  //       }
  //     }
  //   }

  //   return issues;
  // }

  // /**
  //  * 检查默认导出规则
  //  * @param exports - 导出信息数组
  //  * @param filePath - 文件路径
  //  * @param config - 配置信息
  //  * @returns 默认导出问题数组
  //  */
  // private checkDefaultExportRules(
  //   filePath: string,
  //   exports: ExportInfo[],
  //   _config: ExportConfig
  // ): ConsistencyIssue[] {
  //   const issues: ConsistencyIssue[] = [];
  //   const defaultExports = exports.filter(exp => exp.exportType === 'default');
  //   const fileName =
  //     filePath.split('/').pop()?.split('\\').pop()?.split('.')[0] || '';

  //   // 检查是否有多个默认导出
  //   if (defaultExports.length > 1) {
  //     for (const defaultExport of defaultExports) {
  //       issues.push({
  //         id: `multiple-default-${filePath}-${Date.now()}`,
  //         type: 'duplicate-export',
  //         severity: 'error',
  //         filePath: filePath,
  //         message: 'Multiple default exports found',
  //         autoFixable: false,
  //         relatedFiles: [],
  //         sourceLocation: defaultExport.sourceLocation,
  //       });
  //     }
  //   }

  //   // 检查默认导出命名是否与文件名匹配
  //   // 检查默认导出命名是否与文件名匹配
  //   if (defaultExports.length === 1) {
  //     const defaultExport = defaultExports[0];
  //     if (defaultExport) {
  //       const exportName = defaultExport.exportName;

  //       if (exportName !== 'default' && exportName !== fileName) {
  //         issues.push({
  //           id: `name-mismatch-${filePath}-${exportName}-${Date.now()}`,
  //           type: 'naming-inconsistency',
  //           severity: 'warning',
  //           filePath: filePath,
  //           message: `Default export name '${exportName}' does not match file name '${fileName}'`,
  //           autoFixable: false,
  //           relatedFiles: [],
  //           sourceLocation: defaultExport.sourceLocation,
  //         });
  //       }
  //     }
  //   }

  //   return issues;
  // }

  /**
   * 分析跨文件一致性
   * @param allExports - 所有文件的导出信息
   * @param config - 配置信息
   * @returns 跨文件一致性问题数组
   */
  private analyzeCrossFileConsistency(
    allExports: Map<string, ExportInfo[]>,
    config: ExportConfig
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const globalExports = new Map<
      string,
      { filePath: string; exportInfo: ExportInfo }[]
    >();

    // 收集所有导出
    for (const [filePath, exports] of allExports) {
      for (const exportInfo of exports) {
        const { exportName } = exportInfo;

        if (!globalExports.has(exportName)) {
          globalExports.set(exportName, []);
        }
        globalExports.get(exportName)!.push({ filePath, exportInfo });
      }
    }

    // 检查全局重复导出
    const conflictRules = config.rules.find(rule => rule.name === 'conflicts');
    if (conflictRules && conflictRules.enabled) {
      for (const [name, occurrences] of globalExports) {
        if (occurrences.length > 1 && name !== 'default') {
          for (const { filePath, exportInfo } of occurrences) {
            issues.push({
              id: `global-conflict-${filePath}-${name}-${Date.now()}`,
              type: 'duplicate-export',
              severity: conflictRules.severity,
              filePath: filePath,
              message: `Export '${name}' conflicts with exports in other files`,
              autoFixable: false,
              relatedFiles: occurrences.map(occ => occ.filePath),
              sourceLocation: exportInfo.sourceLocation,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * 生成分析摘要
   * @param issues - 所有问题
   * @param totalFiles - 总文件数
   * @returns 分析摘要
   */
  private generateAnalysisSummary(issues: ConsistencyIssue[]): AnalysisSummary {
    const issuesByType = new Map<ConsistencyIssueType, number>();
    const issuesBySeverity = new Map<IssueSeverity, number>();
    const affectedFiles = new Set<string>();

    for (const issue of issues) {
      // 按类型统计
      const typeCount = issuesByType.get(issue.type) || 0;
      issuesByType.set(issue.type, typeCount + 1);

      // 按严重程度统计
      const severityCount = issuesBySeverity.get(issue.severity) || 0;
      issuesBySeverity.set(issue.severity, severityCount + 1);

      // 收集受影响的文件
      if (issue.sourceLocation) {
        affectedFiles.add(issue.sourceLocation.filePath);
      }
    }

    return {
      errorCount: issuesBySeverity.get('error') || 0,
      warningCount: issuesBySeverity.get('warning') || 0,
      fixedCount: 0,
      successRate: issues.length === 0 ? 1 : 0,
      totalIssues: issues.length,
      autoFixableCount: 0,
    };
  }

  /**
   * 过滤问题
   * @param issues - 问题数组
   * @param filters - 过滤条件
   * @returns 过滤后的问题数组
   */
  public filterIssues(
    issues: ConsistencyIssue[],
    filters: {
      types?: ConsistencyIssueType[];
      severities?: IssueSeverity[];
      files?: string[];
    }
  ): ConsistencyIssue[] {
    return issues.filter(issue => {
      if (filters.types && !filters.types.includes(issue.type)) {
        return false;
      }
      if (filters.severities && !filters.severities.includes(issue.severity)) {
        return false;
      }
      if (
        filters.files &&
        issue.sourceLocation &&
        !filters.files.includes(issue.sourceLocation.filePath)
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * 按文件分组问题
   * @param issues - 问题数组
   * @returns 按文件分组的问题
   */
  public groupIssuesByFile(
    issues: ConsistencyIssue[]
  ): Map<string, ConsistencyIssue[]> {
    const grouped = new Map<string, ConsistencyIssue[]>();

    for (const issue of issues) {
      const filePath = issue.sourceLocation?.filePath || issue.filePath;
      if (!grouped.has(filePath)) {
        grouped.set(filePath, []);
      }
      grouped.get(filePath)!.push(issue);
    }

    return grouped;
  }

  /**
   * 按类型分组问题
   * @param issues - 问题数组
   * @returns 按类型分组的问题
   */
  public groupIssuesByType(
    issues: ConsistencyIssue[]
  ): Map<ConsistencyIssueType, ConsistencyIssue[]> {
    const grouped = new Map<ConsistencyIssueType, ConsistencyIssue[]>();

    for (const issue of issues) {
      if (!grouped.has(issue.type)) {
        grouped.set(issue.type, []);
      }
      grouped.get(issue.type)!.push(issue);
    }

    return grouped;
  }

  /**
   * 获取问题统计信息
   * @param issues - 问题数组
   * @returns 统计信息
   */
  public getIssueStatistics(issues: ConsistencyIssue[]): {
    total: number;
    byType: Record<ConsistencyIssueType, number>;
    bySeverity: Record<IssueSeverity, number>;
    byFile: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byFile: Record<string, number> = {};

    for (const issue of issues) {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      const filePath = issue.sourceLocation?.filePath || issue.filePath;
      byFile[filePath] = (byFile[filePath] || 0) + 1;
    }

    return {
      total: issues.length,
      byType: byType as Record<ConsistencyIssueType, number>,
      bySeverity: bySeverity as Record<IssueSeverity, number>,
      byFile,
    };
  }
}

/**
 * 创建一致性分析器实例
 * @param configManager - 配置管理器
 * @returns 一致性分析器实例
 */
export function createConsistencyAnalyzer(
  configManager: ExportConfigManager
): ConsistencyAnalyzer {
  return new ConsistencyAnalyzer(configManager);
}

/**
 * 快速分析项目导出一致性
 * @param projectPath - 项目路径
 * @param config - 可选的配置
 * @returns 分析结果
 */
export async function analyzeProjectConsistency(
  projectPath: string,
  config?: Partial<ExportConfig>
): Promise<ProjectAnalysisResult> {
  const configManager = new ExportConfigManager(projectPath || '.');

  if (config) {
    configManager.updateConfig(config);
  }

  const analyzer = createConsistencyAnalyzer(configManager);
  return analyzer.analyzeProject(projectPath);
}

/**
 * 验证导出一致性规则
 * @param exports - 导出信息数组
 * @param rules - 验证规则
 * @returns 验证结果
 */
export function validateExportConsistency(
  exports: ExportInfo[],
  rules: ExportConfig['rules'],
  projectPath?: string
): ConsistencyIssue[] {
  const configManager = new ExportConfigManager(projectPath || '.');
  configManager.updateConfig({ rules });

  const analyzer = createConsistencyAnalyzer(configManager);

  // 模拟文件信息
  const mockFile: FileInfo = {
    path: 'mock.ts',
    name: 'mock.ts',
    extension: '.ts',
    size: 0,
    isTypeScript: true,
    lastModified: new Date(),
  };

  // 使用私有方法进行验证（这里需要类型断言）
  const privateAnalyzer = analyzer as any;
  return privateAnalyzer.analyzeFileConsistency(
    mockFile,
    exports,
    configManager.getConfig()
  );
}
