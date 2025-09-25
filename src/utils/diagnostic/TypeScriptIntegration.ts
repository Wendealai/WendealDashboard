/**
 * TypeScript Integration Component
 * TypeScript集成
 */

import * as ts from 'typescript';
import {
  ExportIssueType,
  IssueSeverity,
  type ExportInfo,
  type ExportIssue,
  type DiagnosticConfig,
} from '@/types/exportDiagnostic';
import { FileSystemUtils } from '@/utils/exportDiagnosticUtils';

/**
 * TypeScript配置
 */
export interface TypeScriptConfig {
  strict: boolean;
  checkTypeExports: boolean;
  target: string;
  moduleResolution?: 'node' | 'classic';
  jsx?: 'react' | 'preserve' | 'react-native';
}

/**
 * TypeScript分析结果
 */
export interface TypeScriptAnalysisResult {
  exports: ExportInfo[];
  issues: ExportIssue[];
  compileErrors: ts.Diagnostic[];
  symbolTable: Map<string, ts.Symbol>;
  typeCheckResults: ts.Diagnostic[];
}

/**
 * TypeScript集成类
 */
export class TypeScriptIntegration {
  private config: TypeScriptConfig;

  constructor(config: TypeScriptConfig) {
    this.config = config;
  }

  /**
   * 分析TypeScript文件
   */
  async analyzeFile(
    filePath: string
  ): Promise<TypeScriptAnalysisResult | null> {
    try {
      // 读取文件内容
      const content = await FileSystemUtils.readFileContent(filePath);

      // 创建TypeScript程序
      const program = this.createProgram(filePath, content);
      const sourceFile = program.getSourceFile(filePath);

      if (!sourceFile) {
        return null;
      }

      // 分析导出
      const exports = this.analyzeExports(sourceFile, program);

      // 类型检查
      const typeCheckResults = this.performTypeCheck(program);

      // 编译错误
      const compileErrors = ts.getPreEmitDiagnostics(program);

      // 符号表
      const symbolTable = this.buildSymbolTable(program);

      // 生成问题
      const issues = this.generateIssues(
        sourceFile,
        program,
        typeCheckResults,
        compileErrors
      );

      return {
        exports,
        issues,
        compileErrors: [...compileErrors],
        symbolTable,
        typeCheckResults,
      };
    } catch (error) {
      console.warn(`TypeScript分析文件失败 ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 创建TypeScript程序
   */
  private createProgram(filePath: string, content: string): ts.Program {
    const compilerOptions: ts.CompilerOptions = {
      target: this.getScriptTarget(this.config.target),
      module: ts.ModuleKind.ESNext,
      moduleResolution:
        this.config.moduleResolution === 'node'
          ? ts.ModuleResolutionKind.NodeJs
          : ts.ModuleResolutionKind.Classic,
      jsx: this.getJsxEmit(this.config.jsx || 'react'),
      strict: this.config.strict,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    };

    const host = ts.createCompilerHost(compilerOptions);
    const originalReadFile = host.readFile;

    // 重写readFile以使用我们的内容
    host.readFile = (fileName: string) => {
      if (fileName === filePath) {
        return content;
      }
      return originalReadFile.call(host, fileName);
    };

    const program = ts.createProgram([filePath], compilerOptions, host);
    return program;
  }

  /**
   * 分析导出声明
   */
  private analyzeExports(
    sourceFile: ts.SourceFile,
    program: ts.Program
  ): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const checker = program.getTypeChecker();

    // 遍历所有语句
    for (const statement of sourceFile.statements) {
      if (ts.isExportDeclaration(statement)) {
        // export { ... } from '...'
        if (
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause)
        ) {
          for (const element of statement.exportClause.elements) {
            const exportInfo = this.createExportInfoFromNamedExport(
              element,
              sourceFile,
              checker
            );
            if (exportInfo) exports.push(exportInfo);
          }
        }
      } else if (ts.isExportAssignment(statement)) {
        // export default ...
        const exportInfo = this.createExportInfoFromExportAssignment(
          statement,
          sourceFile
        );
        if (exportInfo) exports.push(exportInfo);
      } else if (
        ts.isVariableStatement(statement) &&
        this.hasExportModifier(statement)
      ) {
        // export const/let/var
        for (const declaration of statement.declarationList.declarations) {
          const exportInfo = this.createExportInfoFromVariableDeclaration(
            declaration,
            sourceFile,
            checker
          );
          if (exportInfo) exports.push(exportInfo);
        }
      } else if (
        ts.isFunctionDeclaration(statement) &&
        this.hasExportModifier(statement)
      ) {
        // export function
        const exportInfo = this.createExportInfoFromFunctionDeclaration(
          statement,
          sourceFile
        );
        if (exportInfo) exports.push(exportInfo);
      } else if (
        ts.isClassDeclaration(statement) &&
        this.hasExportModifier(statement)
      ) {
        // export class
        const exportInfo = this.createExportInfoFromClassDeclaration(
          statement,
          sourceFile
        );
        if (exportInfo) exports.push(exportInfo);
      } else if (
        ts.isInterfaceDeclaration(statement) &&
        this.hasExportModifier(statement)
      ) {
        // export interface
        const exportInfo = this.createExportInfoFromInterfaceDeclaration(
          statement,
          sourceFile
        );
        if (exportInfo) exports.push(exportInfo);
      } else if (
        ts.isTypeAliasDeclaration(statement) &&
        this.hasExportModifier(statement)
      ) {
        // export type
        const exportInfo = this.createExportInfoFromTypeAliasDeclaration(
          statement,
          sourceFile
        );
        if (exportInfo) exports.push(exportInfo);
      }
    }

    return exports;
  }

  /**
   * 执行类型检查
   */
  private performTypeCheck(program: ts.Program): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];

    // 获取语义诊断
    const semanticDiagnostics = program.getSemanticDiagnostics();
    diagnostics.push(...semanticDiagnostics);

    // 获取建议诊断
    const suggestionDiagnostics = program.getSuggestionDiagnostics();
    diagnostics.push(...suggestionDiagnostics);

    return diagnostics;
  }

  /**
   * 构建符号表
   */
  private buildSymbolTable(program: ts.Program): Map<string, ts.Symbol> {
    const symbolTable = new Map<string, ts.Symbol>();
    const checker = program.getTypeChecker();

    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        ts.forEachChild(sourceFile, node => {
          if (
            ts.isExportDeclaration(node) ||
            this.hasExportModifier(node as any)
          ) {
            const symbol = checker.getSymbolAtLocation(node);
            if (symbol) {
              symbolTable.set(symbol.name, symbol);
            }
          }
        });
      }
    }

    return symbolTable;
  }

  /**
   * 生成问题列表
   */
  private generateIssues(
    sourceFile: ts.SourceFile,
    program: ts.Program,
    typeCheckResults: ts.Diagnostic[],
    compileErrors: readonly ts.Diagnostic[]
  ): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 处理编译错误
    for (const diagnostic of compileErrors) {
      if (diagnostic.file === sourceFile) {
        const issue = this.createIssueFromDiagnostic(diagnostic, sourceFile);
        if (issue) issues.push(issue);
      }
    }

    // 处理类型检查结果
    for (const diagnostic of typeCheckResults) {
      if (
        diagnostic.file === sourceFile &&
        diagnostic.category === ts.DiagnosticCategory.Error
      ) {
        const issue = this.createIssueFromDiagnostic(diagnostic, sourceFile);
        if (issue) issues.push(issue);
      }
    }

    // 检查类型导出问题
    if (this.config.checkTypeExports) {
      const typeIssues = this.checkTypeExportIssues(sourceFile, program);
      issues.push(...typeIssues);
    }

    return issues;
  }

  /**
   * 从诊断创建问题
   */
  private createIssueFromDiagnostic(
    diagnostic: ts.Diagnostic,
    sourceFile: ts.SourceFile
  ): ExportIssue | null {
    const { line, character } = ts.getLineAndCharacterOfPosition(
      sourceFile,
      diagnostic.start || 0
    );

    return {
      id: `ts-${diagnostic.code}-${sourceFile.fileName}-${line}-${character}`,
      type: ExportIssueType.TYPE_EXPORT_ISSUE,
      severity:
        diagnostic.category === ts.DiagnosticCategory.Error
          ? IssueSeverity.ERROR
          : IssueSeverity.WARNING,
      description: ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      ),
      location: {
        filePath: sourceFile.fileName,
        line: line + 1,
        column: character + 1,
        codeSnippet: this.getCodeSnippet(sourceFile, diagnostic.start || 0),
      },
      suggestions: [],
      detectedAt: new Date(),
    };
  }

  /**
   * 检查类型导出问题
   */
  private checkTypeExportIssues(
    sourceFile: ts.SourceFile,
    program: ts.Program
  ): ExportIssue[] {
    const issues: ExportIssue[] = [];

    // 这里可以添加更复杂的类型导出检查逻辑
    // 例如：检查类型是否应该使用命名导出而不是默认导出

    return issues;
  }

  /**
   * 工具方法：检查是否有export修饰符
   */
  private hasExportModifier(node: ts.Node): boolean {
    return !!(
      node.modifiers &&
      node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)
    );
  }

  /**
   * 工具方法：从命名导出创建导出信息
   */
  private createExportInfoFromNamedExport(
    element: ts.ExportSpecifier,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): ExportInfo | null {
    const name = element.name.text;
    const symbol = checker.getSymbolAtLocation(element.name);

    return {
      name,
      type: 'named',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, element.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, element.getStart())
            .character + 1,
        codeSnippet: element.getText(),
      },
      isUsed: false, // 需要进一步分析
      referenceCount: 0,
      lastModified: new Date(),
      valueType: symbol ? this.getSymbolType(symbol, checker) : undefined,
    };
  }

  /**
   * 工具方法：从导出赋值创建导出信息
   */
  private createExportInfoFromExportAssignment(
    statement: ts.ExportAssignment,
    sourceFile: ts.SourceFile
  ): ExportInfo | null {
    return {
      name: 'default',
      type: 'default',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, statement.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, statement.getStart())
            .character + 1,
        codeSnippet: statement.getText(),
      },
      isUsed: false,
      referenceCount: 0,
      lastModified: new Date(),
    };
  }

  /**
   * 工具方法：从变量声明创建导出信息
   */
  private createExportInfoFromVariableDeclaration(
    declaration: ts.VariableDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): ExportInfo | null {
    if (!ts.isIdentifier(declaration.name)) return null;

    const name = declaration.name.text;
    const symbol = checker.getSymbolAtLocation(declaration.name);

    return {
      name,
      type: 'named',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .character + 1,
        codeSnippet: declaration.getText(),
      },
      isUsed: false,
      referenceCount: 0,
      lastModified: new Date(),
      valueType: symbol ? this.getSymbolType(symbol, checker) : undefined,
    };
  }

  /**
   * 工具方法：从函数声明创建导出信息
   */
  private createExportInfoFromFunctionDeclaration(
    declaration: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): ExportInfo | null {
    if (!declaration.name) return null;

    const name = declaration.name.text;

    return {
      name,
      type: 'named',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .character + 1,
        codeSnippet: declaration.getText(),
      },
      isUsed: false,
      referenceCount: 0,
      lastModified: new Date(),
      valueType: 'function',
    };
  }

  /**
   * 工具方法：从类声明创建导出信息
   */
  private createExportInfoFromClassDeclaration(
    declaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile
  ): ExportInfo | null {
    if (!declaration.name) return null;

    const name = declaration.name.text;

    return {
      name,
      type: 'named',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .character + 1,
        codeSnippet: declaration.getText(),
      },
      isUsed: false,
      referenceCount: 0,
      lastModified: new Date(),
      valueType: 'class',
    };
  }

  /**
   * 工具方法：从接口声明创建导出信息
   */
  private createExportInfoFromInterfaceDeclaration(
    declaration: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile
  ): ExportInfo | null {
    const name = declaration.name.text;

    return {
      name,
      type: 'named',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .character + 1,
        codeSnippet: declaration.getText(),
      },
      isUsed: false,
      referenceCount: 0,
      lastModified: new Date(),
      valueType: 'interface',
    };
  }

  /**
   * 工具方法：从类型别名声明创建导出信息
   */
  private createExportInfoFromTypeAliasDeclaration(
    declaration: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile
  ): ExportInfo | null {
    const name = declaration.name.text;

    return {
      name,
      type: 'named',
      location: {
        filePath: sourceFile.fileName,
        line:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .line + 1,
        column:
          ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart())
            .character + 1,
        codeSnippet: declaration.getText(),
      },
      isUsed: false,
      referenceCount: 0,
      lastModified: new Date(),
      valueType: 'type',
    };
  }

  /**
   * 工具方法：获取符号类型
   */
  private getSymbolType(symbol: ts.Symbol, checker: ts.TypeChecker): string {
    try {
      const type = checker.getTypeOfSymbolAtLocation(
        symbol,
        symbol.valueDeclaration || symbol.declarations[0]
      );
      return checker.typeToString(type);
    } catch {
      return 'unknown';
    }
  }

  /**
   * 工具方法：获取代码片段
   */
  private getCodeSnippet(sourceFile: ts.SourceFile, position: number): string {
    const { line } = ts.getLineAndCharacterOfPosition(sourceFile, position);
    const lines = sourceFile.text.split('\n');
    return lines[line] || '';
  }

  /**
   * 工具方法：获取脚本目标
   */
  private getScriptTarget(target: string): ts.ScriptTarget {
    switch (target.toLowerCase()) {
      case 'es3':
        return ts.ScriptTarget.ES3;
      case 'es5':
        return ts.ScriptTarget.ES5;
      case 'es2015':
        return ts.ScriptTarget.ES2015;
      case 'es2016':
        return ts.ScriptTarget.ES2016;
      case 'es2017':
        return ts.ScriptTarget.ES2017;
      case 'es2018':
        return ts.ScriptTarget.ES2018;
      case 'es2019':
        return ts.ScriptTarget.ES2019;
      case 'es2020':
        return ts.ScriptTarget.ES2020;
      case 'esnext':
        return ts.ScriptTarget.ESNext;
      default:
        return ts.ScriptTarget.ES2020;
    }
  }

  /**
   * 工具方法：获取JSX发射
   */
  private getJsxEmit(jsx: string): ts.JsxEmit {
    switch (jsx.toLowerCase()) {
      case 'react':
        return ts.JsxEmit.React;
      case 'preserve':
        return ts.JsxEmit.Preserve;
      case 'react-native':
        return ts.JsxEmit.ReactNative;
      default:
        return ts.JsxEmit.React;
    }
  }
}

/**
 * 默认TypeScript集成实例
 */
export const typescriptIntegration = new TypeScriptIntegration({
  strict: false,
  checkTypeExports: true,
  target: 'ES2020',
  moduleResolution: 'node',
  jsx: 'react',
});
