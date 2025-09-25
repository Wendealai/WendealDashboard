/**
 * File Scanner Component
 * 文件扫描和导出声明收集功能
 */

import path from 'path';
import fs from 'fs';
import type {
  ExportInfo,
  ScanOptions,
  ScanProgress,
  CacheEntry,
  DiagnosticConfig,
} from '@/types/exportDiagnostic';
import {
  PathResolver,
  FileSystemUtils,
  CacheUtils,
} from '@/utils/exportDiagnosticUtils';

/**
 * 文件扫描器类
 */
export class FileScanner {
  private config: DiagnosticConfig;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: DiagnosticConfig) {
    this.config = config;
  }

  /**
   * 扫描目录中的文件
   */
  async scanDirectory(
    dirPath: string,
    options: ScanOptions,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<ExportInfo[]> {
    const allExports: ExportInfo[] = [];
    const startTime = Date.now();

    try {
      // 获取所有匹配的文件
      const files = await this.getMatchingFiles(dirPath, options);
      let processedFiles = 0;

      onProgress?.({
        processedFiles: 0,
        totalFiles: files.length,
        issuesFound: 0,
        elapsedTime: 0,
      });

      // 并行处理文件，但限制并发数量
      const concurrency = options.concurrency || 5;
      const chunks = this.chunkArray(files, concurrency);

      for (const chunk of chunks) {
        const promises = chunk.map(async filePath => {
          try {
            const exports = await this.scanFile(filePath);
            allExports.push(...exports);
            processedFiles++;

            onProgress?.({
              processedFiles,
              totalFiles: files.length,
              currentFile: filePath,
              issuesFound: 0, // 这个会在后续分析中计算
              elapsedTime: Date.now() - startTime,
            });

            return exports;
          } catch (error) {
            console.warn(`Failed to scan file ${filePath}:`, error);
            processedFiles++;
            return [];
          }
        });

        await Promise.all(promises);
      }

      return allExports;
    } catch (error) {
      throw new Error(`Directory scan failed: ${error}`);
    }
  }

  /**
   * 扫描单个文件
   */
  async scanFile(filePath: string): Promise<ExportInfo[]> {
    try {
      // 检查缓存
      if (this.config.enableCache) {
        const cached = this.getCachedResult(filePath);
        if (cached) {
          return cached.exports;
        }
      }

      // 读取文件内容
      const content = await FileSystemUtils.readFileContent(filePath);
      const mtime = await FileSystemUtils.getFileModifiedTime(filePath);

      // 解析导出声明
      const exports = this.parseExports(content, filePath);

      // 缓存结果
      if (this.config.enableCache) {
        this.cacheResult(filePath, exports, mtime);
      }

      return exports;
    } catch (error) {
      throw new Error(`File scan failed for ${filePath}: ${error}`);
    }
  }

  /**
   * 获取匹配的文件列表
   */
  private async getMatchingFiles(
    dirPath: string,
    options: ScanOptions
  ): Promise<string[]> {
    const allFiles = await FileSystemUtils.getAllFiles(
      dirPath,
      this.config.maxDepth
    );

    return allFiles.filter(filePath => {
      // 检查文件类型
      if (!PathResolver.isSourceFile(filePath)) {
        return false;
      }

      // 检查文件模式匹配
      const relativePath = PathResolver.getRelativePath(dirPath, filePath);
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
      if (!options.recursive && path.dirname(relativePath) !== '.') {
        return false;
      }

      // 检查隐藏文件选项
      if (!options.includeHidden && path.basename(filePath).startsWith('.')) {
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
   * 解析文件中的导出声明
   */
  private parseExports(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 跳过注释和空行
      if (
        !trimmedLine ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.startsWith('*')
      ) {
        return;
      }

      // 解析各种导出类型
      const exportInfo = this.parseExportLine(
        trimmedLine,
        filePath,
        index + 1,
        line
      );
      if (exportInfo) {
        exports.push(exportInfo);
      }
    });

    return exports;
  }

  /**
   * 解析单行导出声明
   */
  private parseExportLine(
    line: string,
    filePath: string,
    lineNumber: number,
    originalLine: string
  ): ExportInfo | null {
    // 命名导出: export const/let/var/function/class/interface/type
    const namedExportMatch = line.match(
      /^export\s+(const|let|var|function|class|interface|type)\s+(\w+)/
    );
    if (namedExportMatch) {
      const [, type, name] = namedExportMatch;
      if (name && type) {
        return {
          name,
          type: 'named',
          location: {
            filePath,
            line: lineNumber,
            column: originalLine.indexOf('export'),
            codeSnippet: originalLine.trim(),
          },
          isUsed: false,
          referenceCount: 0,
          lastModified: new Date(),
          valueType: type,
        };
      }
    }

    // 默认导出: export default
    if (line.startsWith('export default')) {
      const defaultNameMatch = line.match(
        /export default (?:class|function)?\s*(\w+)/
      );
      const name =
        defaultNameMatch && defaultNameMatch[1]
          ? defaultNameMatch[1]
          : 'default';
      return {
        name,
        type: 'default',
        location: {
          filePath,
          line: lineNumber,
          column: originalLine.indexOf('export'),
          codeSnippet: originalLine.trim(),
        },
        isUsed: false,
        referenceCount: 0,
        lastModified: new Date(),
      };
    }

    // 导出列表: export { name1, name2 }
    const exportListMatch = line.match(/^export\s*{\s*([^}]+)\s*}/);
    if (exportListMatch && exportListMatch[1]) {
      const exportList = exportListMatch[1];
      const exportNames = exportList
        .split(',')
        .map(name => name.trim().split(' as ')[0]?.trim())
        .filter(name => name && name !== 'as');

      const validNames = exportNames.filter(name => name);
      if (validNames.length > 0 && validNames[0]) {
        // 为简化处理，返回第一个导出名作为代表
        // 实际实现中可能需要为每个导出创建单独的ExportInfo
        return {
          name: validNames[0],
          type: 'named',
          location: {
            filePath,
            line: lineNumber,
            column: originalLine.indexOf('export'),
            codeSnippet: originalLine.trim(),
          },
          isUsed: false,
          referenceCount: 0,
          lastModified: new Date(),
        };
      }
    }

    // 命名空间导出: export * as name from 'module'
    const namespaceExportMatch = line.match(/export\s+\*\s+as\s+(\w+)/);
    if (namespaceExportMatch && namespaceExportMatch[1]) {
      const name = namespaceExportMatch[1];
      return {
        name,
        type: 'namespace',
        location: {
          filePath,
          line: lineNumber,
          column: originalLine.indexOf('export'),
          codeSnippet: originalLine.trim(),
        },
        isUsed: false,
        referenceCount: 0,
        lastModified: new Date(),
      };
    }

    return null;
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(filePath: string): CacheEntry | null {
    const cacheKey = CacheUtils.generateFileCacheKey(filePath, 0);
    const cached = CacheUtils.get<CacheEntry>(cacheKey);

    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - cached.cachedAt.getTime() > this.config.cacheExpiry) {
      CacheUtils.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * 缓存结果
   */
  private cacheResult(
    filePath: string,
    exports: ExportInfo[],
    mtime: Date
  ): void {
    const cacheEntry: CacheEntry = {
      filePath,
      mtime: mtime.getTime(),
      exports,
      cachedAt: new Date(),
      version: '1.0',
    };

    const cacheKey = CacheUtils.generateFileCacheKey(filePath, mtime.getTime());
    CacheUtils.set(cacheKey, cacheEntry, this.config.cacheExpiry);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    // 清除所有以文件路径开头的缓存
    const keysToDelete: string[] = [];
    // 注意：这里需要访问CacheUtils的私有缓存，实际实现中可能需要修改CacheUtils
    CacheUtils.clearExpired();
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 获取扫描统计信息
   */
  getScanStats(): {
    cachedFiles: number;
    scannedFiles: number;
    totalExports: number;
  } {
    // 这里可以实现更详细的统计
    return {
      cachedFiles: 0,
      scannedFiles: 0,
      totalExports: 0,
    };
  }
}

/**
 * 默认文件扫描器实例
 */
export const fileScanner = new FileScanner({
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
});
