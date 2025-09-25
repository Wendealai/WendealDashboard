/**
 * Export Diagnostic Utilities
 * 导出诊断系统的基础工具函数
 */

import path from 'path';
import fs from 'fs';
import {
  IssueSeverity,
  ExportIssueType,
  type ExportInfo,
  type FileLocation,
  type ExportIssue,
  type FixSuggestion,
  type DiagnosticConfig,
} from '@/types/exportDiagnostic';

/**
 * 默认诊断配置
 */
export const DEFAULT_DIAGNOSTIC_CONFIG: DiagnosticConfig = {
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
  timeout: 30000, // 30秒
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000, // 5分钟
  severityThreshold: IssueSeverity.INFO,
  typescriptConfig: {
    strict: false,
    checkTypeExports: true,
    target: 'ES2020',
  },
};

/**
 * 文件路径解析工具
 */
export class PathResolver {
  /**
   * 解析相对路径为绝对路径
   */
  static resolveAbsolutePath(basePath: string, relativePath: string): string {
    return path.resolve(basePath, relativePath);
  }

  /**
   * 获取相对路径
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * 检查文件是否匹配模式
   */
  static matchesPattern(filePath: string, patterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return patterns.some(pattern => {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\//g, '\\/')
      );
      return regex.test(normalizedPath);
    });
  }

  /**
   * 检查文件是否应该被忽略
   */
  static shouldIgnore(filePath: string, ignorePatterns: string[]): boolean {
    return ignorePatterns.some(pattern =>
      this.matchesPattern(filePath, [pattern])
    );
  }

  /**
   * 获取文件扩展名
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * 检查是否为TypeScript文件
   */
  static isTypeScriptFile(filePath: string): boolean {
    const ext = this.getExtension(filePath);
    return ['.ts', '.tsx'].includes(ext);
  }

  /**
   * 检查是否为JavaScript文件
   */
  static isJavaScriptFile(filePath: string): boolean {
    const ext = this.getExtension(filePath);
    return ['.js', '.jsx'].includes(ext);
  }

  /**
   * 检查是否为源代码文件
   */
  static isSourceFile(filePath: string): boolean {
    return this.isTypeScriptFile(filePath) || this.isJavaScriptFile(filePath);
  }
}

/**
 * 导出声明解析工具
 */
export class ExportParser {
  /**
   * 解析导出声明
   */
  static parseExportStatement(code: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 跳过注释和空行
      if (
        !trimmedLine ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*')
      ) {
        return;
      }

      // 解析命名导出: export const/let/var/function/class/interface/type
      const namedExportMatch = trimmedLine.match(
        /^export\s+(const|let|var|function|class|interface|type)\s+(\w+)/
      );
      if (namedExportMatch) {
        const [, type, name] = namedExportMatch;
        if (name) {
          exports.push({
            name,
            type: 'named',
            location: {
              filePath,
              line: index + 1,
              column: line.indexOf('export'),
              codeSnippet: trimmedLine,
            },
            isUsed: false,
            referenceCount: 0,
            lastModified: new Date(),
          });
        }
        return;
      }

      // 解析默认导出: export default
      if (trimmedLine.startsWith('export default')) {
        // 尝试提取名称
        const defaultNameMatch = trimmedLine.match(
          /export default (?:class|function)?\s*(\w+)/
        );
        const name =
          defaultNameMatch && defaultNameMatch[1]
            ? defaultNameMatch[1]
            : 'default';
        exports.push({
          name,
          type: 'default',
          location: {
            filePath,
            line: index + 1,
            column: line.indexOf('export'),
            codeSnippet: trimmedLine,
          },
          isUsed: false,
          referenceCount: 0,
          lastModified: new Date(),
        });
        return;
      }

      // 解析导出列表: export { name1, name2 }
      const exportListMatch = trimmedLine.match(/^export\s*{\s*([^}]+)\s*}/);
      if (exportListMatch && exportListMatch[1]) {
        const exportList = exportListMatch[1];
        const exportNames = exportList
          .split(',')
          .map(name => name.trim().split(' as ')[0]);

        exportNames.forEach(name => {
          if (name && name.trim()) {
            exports.push({
              name: name.trim(),
              type: 'named',
              location: {
                filePath,
                line: index + 1,
                column: line.indexOf('export'),
                codeSnippet: trimmedLine,
              },
              isUsed: false,
              referenceCount: 0,
              lastModified: new Date(),
            });
          }
        });
        return;
      }

      // 解析命名空间导出: export * as name from 'module'
      const namespaceExportMatch = trimmedLine.match(
        /export\s+\*\s+as\s+(\w+)/
      );
      if (namespaceExportMatch && namespaceExportMatch[1]) {
        const name = namespaceExportMatch[1];
        exports.push({
          name,
          type: 'namespace',
          location: {
            filePath,
            line: index + 1,
            column: line.indexOf('export'),
            codeSnippet: trimmedLine,
          },
          isUsed: false,
          referenceCount: 0,
          lastModified: new Date(),
        });
      }
    });

    return exports;
  }

  /**
   * 解析导入声明
   */
  static parseImportStatement(code: string): string[] {
    const imports: string[] = [];
    const lines = code.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();

      // 跳过注释和空行
      if (
        !trimmedLine ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*')
      ) {
        return;
      }

      // 解析import语句
      if (trimmedLine.startsWith('import')) {
        // 提取导入的名称
        const importMatch = trimmedLine.match(/import\s+{([^}]+)}/);
        if (importMatch && importMatch[1]) {
          const importList = importMatch[1];
          const importNames = importList
            .split(',')
            .map(name => name.trim().split(' as ')[0]?.trim() || '');
          imports.push(...importNames.filter(name => name && name.trim()));
        }

        // 处理默认导入
        const defaultImportMatch = trimmedLine.match(/import\s+(\w+)/);
        if (
          defaultImportMatch &&
          defaultImportMatch[1] &&
          !trimmedLine.includes('{')
        ) {
          imports.push(defaultImportMatch[1]);
        }
      }
    });

    return imports;
  }
}

/**
 * 错误分类和优先级判断工具
 */
export class IssueClassifier {
  /**
   * 根据导出信息判断问题严重程度
   */
  static classifySeverity(issue: ExportIssue): IssueSeverity {
    switch (issue.type) {
      case ExportIssueType.MISSING_EXPORT:
      case ExportIssueType.CIRCULAR_DEPENDENCY:
        return IssueSeverity.ERROR;

      case ExportIssueType.UNUSED_EXPORT:
        return IssueSeverity.WARNING;

      case ExportIssueType.EXPORT_INCONSISTENCY:
      case ExportIssueType.TYPE_EXPORT_ISSUE:
        return IssueSeverity.WARNING;

      case ExportIssueType.RENAMED_EXPORT_ISSUE:
      case ExportIssueType.DEFAULT_EXPORT_CONFLICT:
      case ExportIssueType.NAMESPACE_EXPORT_ISSUE:
        return IssueSeverity.INFO;

      default:
        return IssueSeverity.HINT;
    }
  }

  /**
   * 计算问题优先级分数 (0-100)
   */
  static calculatePriorityScore(issue: ExportIssue): number {
    let score = 0;

    // 严重程度权重
    switch (issue.severity) {
      case IssueSeverity.ERROR:
        score += 100;
        break;
      case IssueSeverity.WARNING:
        score += 50;
        break;
      case IssueSeverity.INFO:
        score += 25;
        break;
      case IssueSeverity.HINT:
        score += 10;
        break;
    }

    // 问题类型权重
    switch (issue.type) {
      case ExportIssueType.CIRCULAR_DEPENDENCY:
        score += 30;
        break;
      case ExportIssueType.MISSING_EXPORT:
        score += 20;
        break;
      case ExportIssueType.EXPORT_INCONSISTENCY:
        score += 15;
        break;
    }

    // 引用计数影响
    if (issue.relatedExport) {
      const refCount = issue.relatedExport.referenceCount;
      if (refCount === 0) {
        score += 20; // 未使用的导出
      } else if (refCount > 10) {
        score += 10; // 频繁使用的导出问题更重要
      }
    }

    return Math.min(score, 100);
  }

  /**
   * 判断问题是否应该被报告
   */
  static shouldReportIssue(
    issue: ExportIssue,
    config: DiagnosticConfig
  ): boolean {
    // 检查严重程度阈值
    const severityLevels = {
      [IssueSeverity.ERROR]: 4,
      [IssueSeverity.WARNING]: 3,
      [IssueSeverity.INFO]: 2,
      [IssueSeverity.HINT]: 1,
    };

    const issueLevel = severityLevels[issue.severity];
    const thresholdLevel = severityLevels[config.severityThreshold];

    return issueLevel >= thresholdLevel;
  }
}

/**
 * 代码片段生成工具
 */
export class CodeSnippetGenerator {
  /**
   * 生成移除未使用导出的代码
   */
  static generateRemoveExportSnippet(exportInfo: ExportInfo): string {
    // 这是一个简化的实现，实际实现需要更复杂的AST操作
    return `// Remove unused export: ${exportInfo.name}`;
  }

  /**
   * 生成添加缺失导出的代码
   */
  static generateAddExportSnippet(
    name: string,
    type: string = 'const'
  ): string {
    return `export ${type} ${name} = /* TODO: implement */;`;
  }

  /**
   * 生成修复循环依赖的建议
   */
  static generateCircularDependencyFix(dependencyChain: string[]): string {
    return `// Circular dependency detected: ${dependencyChain.join(' -> ')}\n// Consider using dependency injection or restructuring modules`;
  }
}

/**
 * 文件系统工具
 */
export class FileSystemUtils {
  /**
   * 递归获取目录中的所有文件
   */
  static async getAllFiles(
    dirPath: string,
    maxDepth: number = 10
  ): Promise<string[]> {
    const files: string[] = [];

    async function scanDir(currentPath: string, currentDepth: number) {
      if (currentDepth > maxDepth) {
        return;
      }

      try {
        const entries = await fs.promises.readdir(currentPath, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await scanDir(fullPath, currentDepth + 1);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${currentPath}:`, error);
      }
    }

    await scanDir(dirPath, 0);
    return files;
  }

  /**
   * 读取文件内容
   */
  static async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * 获取文件修改时间
   */
  static async getFileModifiedTime(filePath: string): Promise<Date> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.mtime;
    } catch (error) {
      throw new Error(`Failed to get file stats ${filePath}: ${error}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 缓存工具
 */
export class CacheUtils {
  private static cache = new Map<string, any>();

  /**
   * 获取缓存项
   */
  static get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  /**
   * 设置缓存项
   */
  static set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 删除缓存项
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除过期缓存
   */
  static clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.ttl && now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 生成文件缓存键
   */
  static generateFileCacheKey(filePath: string, mtime: number): string {
    return `${filePath}:${mtime}`;
  }
}
