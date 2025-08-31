/**
 * 文件扫描器工具
 * 提供项目文件扫描、glob模式支持和文件过滤功能
 */

// import { readFileSync, statSync, readdirSync, existsSync } from 'fs'; // Removed for browser compatibility
// import { join, resolve, relative, extname, basename } from 'path'; // Removed for browser compatibility
import { minimatch } from 'minimatch';
import type {
  ScanOptions,
  FileInfo,
  FileMetadata,
  ExportConfig,
} from '../types/export';

/**
 * 文件扫描器类
 */
export class FileScanner {
  private config: ExportConfig;
  private scannedFiles: Map<string, FileMetadata> = new Map();
  private scanStats = {
    totalFiles: 0,
    scannedFiles: 0,
    skippedFiles: 0,
    errorFiles: 0,
  };

  constructor(config: ExportConfig) {
    this.config = config;
  }

  /**
   * 扫描项目文件
   * @param targetPath 目标路径，默认使用配置中的根路径
   * @returns 文件元数据数组
   */
  async scanProject(targetPath?: string): Promise<FileMetadata[]> {
    const scanPath = targetPath || this.config.rootPath;
    this.resetScanStats();
    this.scannedFiles.clear();

    console.log(`开始扫描项目: ${scanPath}`);

    try {
      await this.scanDirectory(scanPath, 0);
      console.log(
        `扫描完成: 总计 ${this.scanStats.totalFiles} 个文件，已扫描 ${this.scanStats.scannedFiles} 个`
      );

      return Array.from(this.scannedFiles.values());
    } catch (error) {
      console.error('扫描项目时发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描指定目录
   * @param dirPath 目录路径
   * @param depth 当前深度
   */
  private async scanDirectory(dirPath: string, depth: number): Promise<void> {
    const { scanOptions } = this.config;

    // 检查深度限制
    if (scanOptions.maxDepth && depth >= scanOptions.maxDepth) {
      return;
    }

    // File system operations are not supported in browser environment
    console.warn('Directory scanning is not supported in browser environment');
    return;

    /*
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relativePath = relative(this.config.rootPath, fullPath);
        
        // 检查是否应该排除
        if (this.shouldExclude(relativePath)) {
          this.scanStats.skippedFiles++;
          continue;
        }

        if (entry.isDirectory()) {
          // 递归扫描子目录
          if (scanOptions.recursive) {
            await this.scanDirectory(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          this.scanStats.totalFiles++;
          
          // 检查是否应该包含
          if (this.shouldInclude(relativePath)) {
            try {
              const metadata = await this.scanFile(fullPath);
              if (metadata) {
                this.scannedFiles.set(fullPath, metadata);
                this.scanStats.scannedFiles++;
              }
            } catch (error) {
              console.warn(`扫描文件失败: ${fullPath}`, error);
              this.scanStats.errorFiles++;
            }
          } else {
            this.scanStats.skippedFiles++;
          }
        } else if (entry.isSymbolicLink() && scanOptions.followSymlinks) {
          // 处理符号链接
          try {
            const stat = statSync(fullPath);
            if (stat.isDirectory() && scanOptions.recursive) {
              await this.scanDirectory(fullPath, depth + 1);
            } else if (stat.isFile() && this.shouldInclude(relativePath)) {
              const metadata = await this.scanFile(fullPath);
              if (metadata) {
                this.scannedFiles.set(fullPath, metadata);
                this.scanStats.scannedFiles++;
              }
            }
          } catch (error) {
            console.warn(`处理符号链接失败: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`读取目录失败: ${dirPath}`, error);
      throw error;
    }
    */
  }

  /**
   * 扫描单个文件
   * @param filePath 文件路径
   * @returns 文件元数据或null
   */
  private async scanFile(filePath: string): Promise<FileMetadata | null> {
    // File system operations are not supported in browser environment
    console.warn('File scanning is not supported in browser environment');
    return null;
  }

  /**
   * 获取文件基本信息
   * @param filePath 文件路径
   * @returns 文件信息
   */
  private getFileInfo(filePath: string): FileInfo {
    // File system operations are not supported in browser environment
    const ext = filePath.split('.').pop() || '';
    const name = filePath.split('/').pop() || filePath.split('\\').pop() || '';

    return {
      path: filePath,
      name: name,
      extension: ext.startsWith('.') ? ext : '.' + ext,
      size: 0, // File size not available in browser environment
      lastModified: new Date(), // Current date as fallback
      isTypeScript: ['.ts', '.tsx'].includes('.' + ext),
    };
  }

  /**
   * 提取文件中的导出信息
   * @param content 文件内容
   * @param filePath 文件路径
   * @returns 导出信息数组
   */
  private extractExports(content: string, filePath: string): any[] {
    const exports: any[] = [];
    const lines = content.split('\n');

    // 简化的导出提取逻辑
    // 实际项目中应该使用TypeScript编译器API进行更准确的解析
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';

      // 匹配各种导出模式
      const exportPatterns = [
        /^export\s+(?:default\s+)?(?:interface|type|class|function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
        /^export\s+\{([^}]+)\}/,
        /^export\s+\*\s+from\s+['"]([^'"]+)['"]/,
        /^export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/,
        /^export\s+default\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
      ];

      for (const pattern of exportPatterns) {
        const match = line.match(pattern);
        if (match) {
          // 这里简化处理，实际应该更详细地解析
          exports.push({
            filePath,
            exportType: line.includes('default') ? 'default' : 'named',
            exportName: match[1] || 'unknown',
            exportedType: this.inferExportType(line),
            isTypeOnly: line.includes('type '),
            sourceLocation: {
              filePath,
              startLine: i + 1,
              endLine: i + 1,
              startColumn: 0,
              endColumn: line.length,
            },
            dependencies: [],
          });
          break;
        }
      }
    }

    return exports;
  }

  /**
   * 推断导出类型
   * @param line 代码行
   * @returns 导出类型
   */
  private inferExportType(line: string): string {
    if (line.includes('interface')) return 'interface';
    if (line.includes('type ')) return 'type';
    if (line.includes('class')) return 'class';
    if (line.includes('function')) return 'function';
    if (line.includes('const') || line.includes('let') || line.includes('var'))
      return 'constant';
    if (
      line.includes('Component') ||
      line.includes('FC') ||
      line.includes('FunctionComponent')
    )
      return 'component';
    return 'unknown';
  }

  /**
   * 提取文件中的导入信息
   * @param content 文件内容
   * @returns 导入信息数组
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 匹配import语句
      const importPatterns = [
        /^import\s+[^'"]*from\s+['"]([^'"]+)['"]/,
        /^import\s+['"]([^'"]+)['"]/,
      ];

      for (const pattern of importPatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[1]) {
          imports.push(match[1]);
          break;
        }
      }
    }

    return imports;
  }

  /**
   * 提取文件依赖
   * @param content 文件内容
   * @returns 依赖数组
   */
  private extractDependencies(content: string): string[] {
    // 简化实现，实际应该分析AST
    const dependencies = this.extractImports(content);
    return dependencies.filter(dep => !dep.startsWith('.'));
  }

  /**
   * 检查语法错误
   * @param content 文件内容
   * @param filePath 文件路径
   * @returns 语法错误数组
   */
  private checkSyntax(content: string, _filePath: string): string[] {
    const errors: string[] = [];

    // 简化的语法检查
    // 实际项目中应该使用TypeScript编译器API
    try {
      // 检查基本的括号匹配
      const brackets = { '(': 0, '[': 0, '{': 0 };
      const closeBrackets = { ')': '(', ']': '[', '}': '{' };

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char && char in brackets) {
          brackets[char as keyof typeof brackets]++;
        } else if (char && char in closeBrackets) {
          const openBracket = closeBrackets[char as keyof typeof closeBrackets];
          if (brackets[openBracket as keyof typeof brackets] > 0) {
            brackets[openBracket as keyof typeof brackets]--;
          } else {
            errors.push(`不匹配的 ${char} 在位置 ${i}`);
          }
        }
      }

      // 检查未闭合的括号
      for (const [bracket, count] of Object.entries(brackets)) {
        if (count > 0) {
          errors.push(`未闭合的 ${bracket}`);
        }
      }
    } catch (error) {
      errors.push(`语法检查失败: ${error}`);
    }

    return errors;
  }

  /**
   * 检查文件是否应该包含
   * @param relativePath 相对路径
   * @returns 是否应该包含
   */
  private shouldInclude(relativePath: string): boolean {
    const { include } = this.config.scanOptions;

    // 检查是否匹配包含模式
    return include.some(pattern => minimatch(relativePath, pattern));
  }

  /**
   * 检查文件是否应该排除
   * @param relativePath 相对路径
   * @returns 是否应该排除
   */
  private shouldExclude(relativePath: string): boolean {
    const { exclude } = this.config.scanOptions;

    // 检查是否匹配排除模式
    return exclude.some(pattern => minimatch(relativePath, pattern));
  }

  /**
   * 重置扫描统计
   */
  private resetScanStats(): void {
    this.scanStats = {
      totalFiles: 0,
      scannedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
    };
  }

  /**
   * 获取扫描统计
   * @returns 扫描统计信息
   */
  getScanStats() {
    return { ...this.scanStats };
  }

  /**
   * 获取已扫描的文件
   * @returns 文件元数据映射
   */
  getScannedFiles(): Map<string, FileMetadata> {
    return new Map(this.scannedFiles);
  }

  /**
   * 根据路径获取文件元数据
   * @param filePath 文件路径
   * @returns 文件元数据或undefined
   */
  getFileMetadata(filePath: string): FileMetadata | undefined {
    return this.scannedFiles.get(filePath);
  }

  /**
   * 过滤文件
   * @param predicate 过滤条件
   * @returns 过滤后的文件元数据数组
   */
  filterFiles(predicate: (metadata: FileMetadata) => boolean): FileMetadata[] {
    return Array.from(this.scannedFiles.values()).filter(predicate);
  }

  /**
   * 获取TypeScript文件
   * @returns TypeScript文件元数据数组
   */
  getTypeScriptFiles(): FileMetadata[] {
    return this.filterFiles(metadata => metadata.fileInfo.isTypeScript);
  }

  /**
   * 获取有导出的文件
   * @returns 有导出的文件元数据数组
   */
  getFilesWithExports(): FileMetadata[] {
    return this.filterFiles(metadata => metadata.exports.length > 0);
  }

  /**
   * 获取有语法错误的文件
   * @returns 有语法错误的文件元数据数组
   */
  getFilesWithSyntaxErrors(): FileMetadata[] {
    return this.filterFiles(metadata => metadata.hasSyntaxErrors);
  }

  /**
   * 按扩展名分组文件
   * @returns 按扩展名分组的文件映射
   */
  groupFilesByExtension(): Map<string, FileMetadata[]> {
    const groups = new Map<string, FileMetadata[]>();

    for (const metadata of this.scannedFiles.values()) {
      const ext = metadata.fileInfo.extension;
      if (!groups.has(ext)) {
        groups.set(ext, []);
      }
      groups.get(ext)!.push(metadata);
    }

    return groups;
  }

  /**
   * 获取文件大小统计
   * @returns 文件大小统计信息
   */
  getFileSizeStats() {
    const sizes = Array.from(this.scannedFiles.values()).map(
      m => m.fileInfo.size
    );

    if (sizes.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0 };
    }

    const total = sizes.reduce((sum, size) => sum + size, 0);
    const average = total / sizes.length;
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);

    return { total, average, min, max };
  }
}

/**
 * 创建文件扫描器实例
 * @param config 配置对象
 * @returns 文件扫描器实例
 */
export function createFileScanner(config: ExportConfig): FileScanner {
  return new FileScanner(config);
}

/**
 * 扫描单个文件
 * @param filePath 文件路径
 * @param config 配置对象
 * @returns 文件元数据或null
 */
export async function scanSingleFile(
  filePath: string,
  config: ExportConfig
): Promise<FileMetadata | null> {
  const scanner = new FileScanner(config);

  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  return scanner['scanFile'](filePath);
}

/**
 * 快速扫描目录
 * @param dirPath 目录路径
 * @param options 扫描选项
 * @returns 文件路径数组
 */
export function quickScanDirectory(
  dirPath: string,
  options: Partial<ScanOptions> = {}
): string[] {
  const defaultOptions: ScanOptions = {
    include: ['**/*.ts', '**/*.tsx'],
    exclude: ['node_modules/**', 'dist/**', 'build/**'],
    recursive: true,
    followSymlinks: false,
  };

  const scanOptions = { ...defaultOptions, ...options };
  const files: string[] = [];

  function scanDir(currentPath: string, depth: number = 0): void {
    if (scanOptions.maxDepth && depth >= scanOptions.maxDepth) {
      return;
    }

    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(dirPath, fullPath);

        // 检查排除模式
        const shouldExclude = scanOptions.exclude.some(pattern =>
          minimatch(relativePath, pattern)
        );

        if (shouldExclude) {
          continue;
        }

        if (entry.isDirectory() && scanOptions.recursive) {
          scanDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          // 检查包含模式
          const shouldInclude = scanOptions.include.some(pattern =>
            minimatch(relativePath, pattern)
          );

          if (shouldInclude) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`扫描目录失败: ${currentPath}`, error);
    }
  }

  scanDir(dirPath);
  return files;
}

/**
 * 检查文件是否为TypeScript文件
 * @param filePath 文件路径
 * @returns 是否为TypeScript文件
 */
export function isTypeScriptFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ['.ts', '.tsx'].includes(ext);
}

/**
 * 获取文件的相对路径
 * @param filePath 文件路径
 * @param basePath 基础路径
 * @returns 相对路径
 */
export function getRelativePath(filePath: string, basePath: string): string {
  return relative(basePath, filePath);
}

/**
 * 规范化文件路径
 * @param filePath 文件路径
 * @returns 规范化后的路径
 */
export function normalizePath(filePath: string): string {
  return resolve(filePath).replace(/\\/g, '/');
}
