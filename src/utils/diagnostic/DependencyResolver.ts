/**
 * Dependency Resolver Component
 * 依赖关系解析器
 */

import type {
  ExportInfo,
  ExportIssue,
  DiagnosticConfig,
} from '@/types/exportDiagnostic';
import { ExportIssueType, IssueSeverity } from '@/types/exportDiagnostic';
import { FileSystemUtils } from '@/utils/exportDiagnosticUtils';

/**
 * 依赖关系接口
 */
export interface Dependency {
  /** 依赖来源文件 */
  from: string;
  /** 依赖目标文件 */
  to: string;
  /** 导入的导出名称 */
  importName: string;
  /** 导入类型 */
  importType: 'named' | 'default' | 'namespace' | 'side-effect';
  /** 导入位置 */
  location: {
    filePath: string;
    line: number;
    column: number;
    codeSnippet: string;
  };
}

/**
 * 依赖图接口
 */
export interface DependencyGraph {
  /** 文件节点 */
  nodes: Set<string>;
  /** 依赖边 */
  edges: Dependency[];
  /** 循环依赖链 */
  cycles: string[][];
}

/**
 * 依赖解析器类
 */
export class DependencyResolver {
  private config: DiagnosticConfig;

  constructor(config: DiagnosticConfig) {
    this.config = config;
  }

  /**
   * 解析项目依赖关系
   */
  async resolveDependencies(
    exports: ExportInfo[],
    onProgress?: (progress: {
      processed: number;
      total: number;
      current: string;
    }) => void
  ): Promise<DependencyGraph> {
    const graph: DependencyGraph = {
      nodes: new Set(),
      edges: [],
      cycles: [],
    };

    // 获取所有源文件
    const sourceFiles = [...new Set(exports.map(exp => exp.location.filePath))];
    graph.nodes = new Set(sourceFiles);

    let processed = 0;
    const total = sourceFiles.length;

    // 并行处理文件依赖解析
    const concurrency = this.config.concurrency || 4;
    const chunks = this.chunkArray(sourceFiles, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async filePath => {
        try {
          const dependencies = await this.resolveFileDependencies(
            filePath,
            exports
          );
          graph.edges.push(...dependencies);
        } catch (error) {
          console.warn(`解析文件依赖失败 ${filePath}:`, error);
        } finally {
          processed++;
          onProgress?.({ processed, total, current: filePath });
        }
      });

      await Promise.all(promises);
    }

    // 检测循环依赖
    graph.cycles = this.detectCycles(graph);

    return graph;
  }

  /**
   * 解析单个文件的依赖关系
   */
  private async resolveFileDependencies(
    filePath: string,
    allExports: ExportInfo[]
  ): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];

    try {
      const content = await FileSystemUtils.readFileContent(filePath);
      const lines = content.split('\n');

      // 解析ES6 import语句
      const importRegex = /^import\s+(.+?)\s+from\s+['"](.+?)['"];?$/gm;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importClause = match[1].trim();
        const modulePath = match[2];

        // 解析相对路径
        const resolvedPath = this.resolveModulePath(filePath, modulePath);
        if (!resolvedPath) continue;

        // 解析导入子句
        const imports = this.parseImportClause(
          importClause,
          lines[match.index],
          match.index + 1
        );
        dependencies.push(
          ...imports.map(imp => ({
            from: filePath,
            to: resolvedPath,
            importName: imp.name,
            importType: imp.type,
            location: {
              filePath,
              line: match.index + 1,
              column: match[0].indexOf('import'),
              codeSnippet: match[0],
            },
          }))
        );
      }

      // 解析CommonJS require语句
      const requireRegex =
        /(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(\s*['"](.+?)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const varDeclaration = match[1].trim();
        const modulePath = match[2];

        const resolvedPath = this.resolveModulePath(filePath, modulePath);
        if (!resolvedPath) continue;

        dependencies.push({
          from: filePath,
          to: resolvedPath,
          importName: varDeclaration,
          importType: 'named',
          location: {
            filePath,
            line: this.getLineNumber(content, match.index),
            column: match[0].indexOf('require'),
            codeSnippet: match[0],
          },
        });
      }

      // 解析动态import
      const dynamicImportRegex = /import\s*\(\s*['"](.+?)['"]\s*\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        const modulePath = match[1];

        const resolvedPath = this.resolveModulePath(filePath, modulePath);
        if (!resolvedPath) continue;

        dependencies.push({
          from: filePath,
          to: resolvedPath,
          importName: '*',
          importType: 'namespace',
          location: {
            filePath,
            line: this.getLineNumber(content, match.index),
            column: match[0].indexOf('import'),
            codeSnippet: match[0],
          },
        });
      }
    } catch (error) {
      console.warn(`解析文件依赖失败 ${filePath}:`, error);
    }

    return dependencies;
  }

  /**
   * 解析导入子句
   */
  private parseImportClause(
    importClause: string,
    line: string,
    lineNumber: number
  ): Array<{
    name: string;
    type: 'named' | 'default' | 'namespace' | 'side-effect';
  }> {
    const imports: Array<{
      name: string;
      type: 'named' | 'default' | 'namespace' | 'side-effect';
    }> = [];

    // 移除花括号和空格
    const clause = importClause.trim();

    if (clause.startsWith('* as ')) {
      // import * as name from 'module'
      const name = clause.substring(5).trim();
      imports.push({ name, type: 'namespace' });
    } else if (clause.includes('{') && clause.includes('}')) {
      // import { name1, name2 } from 'module'
      const namedImports = clause
        .replace(/[{}]/g, '')
        .split(',')
        .map(s => s.trim());
      namedImports.forEach(name => {
        if (name) {
          imports.push({ name, type: 'named' });
        }
      });
    } else if (clause && !clause.includes('{') && !clause.includes('*')) {
      // import name from 'module'
      imports.push({ name: clause, type: 'default' });
    } else {
      // 可能是副作用导入或其他形式
      imports.push({ name: '*', type: 'side-effect' });
    }

    return imports;
  }

  /**
   * 解析模块路径
   */
  private resolveModulePath(
    fromFile: string,
    modulePath: string
  ): string | null {
    // 处理相对路径
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
      const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'));
      const resolved = this.resolveRelativePath(fromDir, modulePath);

      // 尝试添加文件扩展名
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
      for (const ext of extensions) {
        const candidate = resolved + ext;
        if (FileSystemUtils.fileExists(candidate)) {
          return candidate;
        }
      }

      // 尝试index文件
      for (const ext of extensions) {
        const candidate = resolved + '/index' + ext;
        if (FileSystemUtils.fileExists(candidate)) {
          return candidate;
        }
      }

      return resolved + '.ts'; // 默认返回.ts
    }

    // 处理绝对路径和node_modules
    if (modulePath.startsWith('/') || !modulePath.includes('/')) {
      // 对于node_modules模块，我们不解析具体文件
      return null;
    }

    return null;
  }

  /**
   * 解析相对路径
   */
  private resolveRelativePath(fromDir: string, relativePath: string): string {
    const parts = fromDir.split('/');
    const relativeParts = relativePath.split('/');

    for (const part of relativeParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    }

    return parts.join('/');
  }

  /**
   * 检测循环依赖
   */
  private detectCycles(graph: DependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]) => {
      if (recursionStack.has(node)) {
        // 找到循环
        const cycleStart = path.indexOf(node);
        const cycle = [...path.slice(cycleStart), node];
        cycles.push(cycle);
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);

      // 找到所有从当前节点出发的边
      const outgoingEdges = graph.edges.filter(edge => edge.from === node);
      for (const edge of outgoingEdges) {
        dfs(edge.to, [...path, node]);
      }

      recursionStack.delete(node);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * 分析依赖问题
   */
  analyzeDependencyIssues(
    graph: DependencyGraph,
    exports: ExportInfo[]
  ): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 检测循环依赖问题
    for (const cycle of graph.cycles) {
      issues.push({
        id: `circular-dependency-${cycle.join('-')}`,
        type: ExportIssueType.CIRCULAR_DEPENDENCY,
        severity: IssueSeverity.ERROR,
        description: `检测到循环依赖: ${cycle.join(' -> ')}`,
        location: {
          filePath: cycle[0],
          line: 1,
          column: 1,
          codeSnippet: `// 循环依赖链: ${cycle.join(' -> ')}`,
        },
        suggestions: [],
        detectedAt: new Date(),
      });
    }

    // 检测缺失的导入
    const exportMap = new Map<string, ExportInfo[]>();
    for (const exp of exports) {
      const key = exp.location.filePath;
      if (!exportMap.has(key)) {
        exportMap.set(key, []);
      }
      exportMap.get(key)!.push(exp);
    }

    for (const edge of graph.edges) {
      const fileExports = exportMap.get(edge.to);
      if (!fileExports) continue;

      const found = fileExports.some(exp => exp.name === edge.importName);
      if (!found) {
        issues.push({
          id: `missing-import-${edge.from}-${edge.importName}`,
          type: ExportIssueType.MISSING_EXPORT,
          severity: IssueSeverity.ERROR,
          description: `文件 ${edge.from} 导入了不存在的导出 '${edge.importName}'`,
          location: edge.location,
          suggestions: [],
          detectedAt: new Date(),
        });
      }
    }

    return issues;
  }

  /**
   * 获取依赖统计信息
   */
  getDependencyStats(graph: DependencyGraph): {
    totalFiles: number;
    totalDependencies: number;
    averageDependenciesPerFile: number;
    cyclesDetected: number;
    mostConnectedFile: string;
  } {
    const fileDependencies = new Map<string, number>();

    for (const edge of graph.edges) {
      fileDependencies.set(
        edge.from,
        (fileDependencies.get(edge.from) || 0) + 1
      );
    }

    const totalFiles = graph.nodes.size;
    const totalDependencies = graph.edges.length;
    const averageDependenciesPerFile =
      totalFiles > 0 ? totalDependencies / totalFiles : 0;

    let mostConnectedFile = '';
    let maxConnections = 0;
    for (const [file, count] of fileDependencies) {
      if (count > maxConnections) {
        maxConnections = count;
        mostConnectedFile = file;
      }
    }

    return {
      totalFiles,
      totalDependencies,
      averageDependenciesPerFile,
      cyclesDetected: graph.cycles.length,
      mostConnectedFile,
    };
  }

  /**
   * 工具方法：分块数组
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 工具方法：获取行号
   */
  private getLineNumber(content: string, index: number): number {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }
}

/**
 * 默认依赖解析器实例
 */
export const dependencyResolver = new DependencyResolver({
  filePatterns: ['**/*.{ts,tsx,js,jsx}'],
  ignorePatterns: ['**/node_modules/**'],
  maxDepth: 10,
  timeout: 30000,
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000,
  severityThreshold: 'info' as any,
});
