import * as ts from 'typescript';
// import { readFileSync } from 'fs'; // Removed for browser compatibility
import type { ExportInfo, ParsedExport, SourceLocation } from '../types/export';

/**
 * 导出检测器类 - 用于分析TypeScript文件中的导出语句
 */
export class ExportDetector {
  private program: ts.Program | null = null;

  /**
   * 初始化TypeScript编译器程序
   * @param filePaths - 要分析的文件路径数组
   * @param compilerOptions - TypeScript编译选项
   */
  public initializeProgram(
    filePaths: string[],
    compilerOptions?: ts.CompilerOptions
  ): void {
    const defaultOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
      ...compilerOptions,
    };

    this.program = ts.createProgram(filePaths, defaultOptions);
  }

  /**
   * 分析单个文件的导出信息
   * @param filePath - 文件路径
   * @returns 导出信息数组
   */
  public analyzeFile(filePath: string): ExportInfo[] {
    try {
      const sourceFile = this.getSourceFile(filePath);
      if (!sourceFile) {
        return [];
      }

      const exports: ExportInfo[] = [];
      this.visitNode(sourceFile, exports, filePath);
      return exports;
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 获取源文件对象
   * @param filePath - 文件路径
   * @returns TypeScript源文件对象
   */
  private getSourceFile(filePath: string): ts.SourceFile | undefined {
    if (this.program) {
      return this.program.getSourceFile(filePath);
    }

    // File system operations are not supported in browser environment
    console.warn('File reading is not supported in browser environment');
    return undefined;
  }

  /**
   * 递归访问AST节点
   * @param node - AST节点
   * @param exports - 导出信息数组
   * @param filePath - 文件路径
   */
  private visitNode(
    node: ts.Node,
    exports: ExportInfo[],
    filePath: string
  ): void {
    // 检查导出声明
    if (ts.isExportDeclaration(node)) {
      this.handleExportDeclaration(node, exports, filePath);
    }
    // 检查导出赋值
    else if (ts.isExportAssignment(node)) {
      this.handleExportAssignment(node, exports, filePath);
    }
    // 检查带有export修饰符的声明
    else if (this.hasExportModifier(node)) {
      this.handleExportedDeclaration(node, exports, filePath);
    }

    // 递归访问子节点
    ts.forEachChild(node, child => this.visitNode(child, exports, filePath));
  }

  /**
   * 处理export声明
   * @param node - export声明节点
   * @param exports - 导出信息数组
   * @param filePath - 文件路径
   */
  private handleExportDeclaration(
    node: ts.ExportDeclaration,
    exports: ExportInfo[],
    filePath: string
  ): void {
    const location = this.getSourceLocation(node, filePath);

    if (node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        // 命名导出: export { a, b as c } from './module'
        node.exportClause.elements.forEach(element => {
          const exportName = element.name.text;

          exports.push({
            filePath,
            exportName: exportName,
            exportType: 'named',
            exportedType: 'constant',
            isTypeOnly: false,
            sourceLocation: location,
            dependencies: [],
          });
        });
      } else if (ts.isNamespaceExport(node.exportClause)) {
        // 命名空间导出: export * as name from './module'
        const exportName = node.exportClause.name.text;
        exports.push({
          filePath,
          exportName: exportName,
          exportType: 'namespace',
          exportedType: 'constant',
          isTypeOnly: false,
          sourceLocation: location,
          dependencies: [],
        });
      }
    } else {
      // 重新导出所有: export * from './module'
      exports.push({
        filePath,
        exportName: '*',
        exportType: 'reexport',
        exportedType: 'constant',
        isTypeOnly: false,
        sourceLocation: location,
        dependencies: [],
      });
    }
  }

  /**
   * 处理export赋值
   * @param node - export赋值节点
   * @param exports - 导出信息数组
   * @param filePath - 文件路径
   */
  private handleExportAssignment(
    node: ts.ExportAssignment,
    exports: ExportInfo[],
    filePath: string
  ): void {
    const location = this.getSourceLocation(node, filePath);
    const isDefault = node.isExportEquals !== true;

    exports.push({
      filePath,
      exportName: isDefault ? 'default' : '=',
      exportType: isDefault ? 'default' : 'named',
      exportedType: 'function',
      isTypeOnly: false,
      sourceLocation: location,
      dependencies: [],
    });
  }

  /**
   * 处理带有export修饰符的声明
   * @param node - 声明节点
   * @param exports - 导出信息数组
   * @param filePath - 文件路径
   */
  private handleExportedDeclaration(
    node: ts.Node,
    exports: ExportInfo[],
    filePath: string
  ): void {
    const location = this.getSourceLocation(node, filePath);
    const isDefault = this.hasDefaultModifier(node);

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)
    ) {
      const name =
        node.name?.getText() || (isDefault ? 'default' : 'anonymous');
      exports.push({
        filePath,
        exportName: name,
        exportType: isDefault ? 'default' : 'named',
        exportedType: 'constant',
        isTypeOnly: false,
        sourceLocation: location,
        dependencies: [],
      });
    } else if (ts.isVariableStatement(node)) {
      // 处理变量声明
      node.declarationList.declarations.forEach(declaration => {
        if (ts.isIdentifier(declaration.name)) {
          exports.push({
            filePath,
            exportName: declaration.name.text,
            exportType: isDefault ? 'default' : 'named',
            exportedType: 'constant',
            isTypeOnly: false,
            sourceLocation: location,
            dependencies: [],
          });
        }
      });
    } else if (ts.isEnumDeclaration(node)) {
      const name = node.name.text;
      exports.push({
        filePath,
        exportName: name,
        exportType: isDefault ? 'default' : 'named',
        exportedType: 'constant',
        isTypeOnly: false,
        sourceLocation: location,
        dependencies: [],
      });
    }
  }

  /**
   * 检查节点是否有export修饰符
   * @param node - AST节点
   * @returns 是否有export修饰符
   */
  private hasExportModifier(node: ts.Node): boolean {
    return (
      (ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) ||
      false
    );
  }

  /**
   * 检查节点是否有default修饰符
   * @param node - AST节点
   * @returns 是否有default修饰符
   */
  private hasDefaultModifier(node: ts.Node): boolean {
    return (
      (ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) ||
      false
    );
  }

  /**
   * 获取源码位置信息
   * @param node - AST节点
   * @param filePath - 文件路径
   * @returns 源码位置信息
   */
  private getSourceLocation(node: ts.Node, filePath: string): SourceLocation {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      filePath,
      startLine: start.line + 1,
      startColumn: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    };
  }

  /**
   * 获取字符串字面量的值
   * @param node - 字符串字面量节点
   * @returns 字符串值
   */

  /**
   * 清理资源
   */
  public dispose(): void {
    this.program = null;
  }
}

/**
 * 创建导出检测器实例
 * @returns 导出检测器实例
 */
export function createExportDetector(): ExportDetector {
  return new ExportDetector();
}

/**
 * 快速分析单个文件的导出信息
 * @param filePath - 文件路径
 * @param compilerOptions - TypeScript编译选项
 * @returns 导出信息数组
 */
export function analyzeFileExports(
  filePath: string,
  compilerOptions?: ts.CompilerOptions
): ExportInfo[] {
  const detector = createExportDetector();
  try {
    detector.initializeProgram([filePath], compilerOptions);
    return detector.analyzeFile(filePath);
  } finally {
    detector.dispose();
  }
}

/**
 * 分析多个文件的导出信息
 * @param filePaths - 文件路径数组
 * @param compilerOptions - TypeScript编译选项
 * @returns 文件路径到导出信息的映射
 */
export function analyzeMultipleFiles(
  filePaths: string[],
  compilerOptions?: ts.CompilerOptions
): Map<string, ExportInfo[]> {
  const detector = createExportDetector();
  const results = new Map<string, ExportInfo[]>();

  try {
    detector.initializeProgram(filePaths, compilerOptions);

    for (const filePath of filePaths) {
      const exports = detector.analyzeFile(filePath);
      results.set(filePath, exports);
    }

    return results;
  } finally {
    detector.dispose();
  }
}

/**
 * 解析导出语句为结构化信息
 * @param exportInfo - 导出信息
 * @returns 解析后的导出信息
 */
export function parseExportStatement(exportInfo: ExportInfo): ParsedExport {
  return {
    statement: '', // 需要从源码中提取
    type: exportInfo.exportType,
    name: exportInfo.exportName,
    isTypeOnly: exportInfo.isTypeOnly,
    from: '', // 如果是re-export则需要设置
    location: exportInfo.sourceLocation,
  };
}

/**
 * 检查导出是否符合命名约定
 * @param exportInfo - 导出信息
 * @param namingRules - 命名规则
 * @returns 是否符合命名约定
 */
export function validateExportNaming(
  exportInfo: ExportInfo,
  namingRules: Record<string, RegExp>
): boolean {
  const { exportName, exportType } = exportInfo;

  // 根据导出类型选择相应的命名规则
  const ruleKey = exportType === 'default' ? 'default' : 'named';
  const rule = namingRules[ruleKey];

  if (!rule) {
    return true; // 如果没有规则，认为是有效的
  }

  return rule.test(exportName);
}

/**
 * 获取导出的依赖关系
 * @param exportInfo - 导出信息
 * @returns 依赖的模块列表
 */
export function getExportDependencies(exportInfo: ExportInfo): string[] {
  const dependencies: string[] = [];

  // ExportInfo中的dependencies属性已经包含了模块依赖
  dependencies.push(...exportInfo.dependencies);

  return dependencies;
}

/**
 * 检查导出是否存在冲突
 * @param exports - 导出信息数组
 * @returns 冲突的导出名称数组
 */
export function findExportConflicts(exports: ExportInfo[]): string[] {
  const nameCount = new Map<string, number>();
  const conflicts: string[] = [];

  for (const exportInfo of exports) {
    const count = nameCount.get(exportInfo.exportName) || 0;
    nameCount.set(exportInfo.exportName, count + 1);

    if (count === 1) {
      conflicts.push(exportInfo.exportName);
    }
  }

  return conflicts;
}
