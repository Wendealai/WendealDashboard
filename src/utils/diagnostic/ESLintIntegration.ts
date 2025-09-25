/**
 * ESLint Integration Component
 * ESLint集成组件
 */

import { ESLint } from 'eslint';
import {
  ExportIssueType,
  IssueSeverity,
  type ExportIssue,
  type DiagnosticConfig,
} from '@/types/exportDiagnostic';
import { FileSystemUtils } from '@/utils/exportDiagnosticUtils';

/**
 * ESLint配置接口
 */
export interface ESLintConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 配置文件路径 */
  configFile?: string;
  /** 支持的文件扩展名 */
  extensions?: string[];
  /** 自定义规则 */
  rules?: Record<string, any>;
  /** 环境配置 */
  env?: Record<string, boolean>;
  /** 全局变量 */
  globals?: Record<string, boolean | 'readonly' | 'writable' | 'off'>;
}

/**
 * ESLint分析结果
 */
export interface ESLintAnalysisResult {
  /** 文件路径 */
  filePath: string;
  /** ESLint结果 */
  result: ESLint.LintResult;
  /** 处理时间 */
  processingTime: number;
}

/**
 * ESLint集成类
 */
export class ESLintIntegration {
  private config: ESLintConfig;
  private eslint?: ESLint;

  constructor(config: ESLintConfig) {
    this.config = config;
    if (config.enabled) {
      this.initializeESLint();
    }
  }

  /**
   * 初始化ESLint实例
   */
  private initializeESLint(): void {
    try {
      const eslintConfig: any = {
        overrideConfig: {
          env: {
            browser: true,
            es2021: true,
            node: true,
            ...this.config.env,
          },
          extends: ['eslint:recommended', '@typescript-eslint/recommended'],
          parser: '@typescript-eslint/parser',
          parserOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            project: './tsconfig.json',
          },
          plugins: ['@typescript-eslint'],
          rules: {
            // 导出相关规则
            'no-unused-vars': 'error',
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            // 其他有用的规则
            'prefer-const': 'error',
            'no-var': 'error',
            ...this.config.rules,
          },
          globals: this.config.globals,
        },
        extensions: this.config.extensions || ['.ts', '.tsx', '.js', '.jsx'],
        ignorePatterns: ['node_modules/**', 'dist/**', 'build/**'],
      };

      // 如果指定了配置文件，尝试加载
      if (
        this.config.configFile &&
        FileSystemUtils.fileExists(this.config.configFile)
      ) {
        eslintConfig.overrideConfigFile = this.config.configFile;
      }

      this.eslint = new ESLint(eslintConfig);
    } catch (error) {
      console.warn('ESLint初始化失败:', error);
      this.config.enabled = false;
    }
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(filePath: string): Promise<ESLintAnalysisResult | null> {
    if (!this.config.enabled || !this.eslint) {
      return null;
    }

    const startTime = Date.now();

    try {
      // 检查文件是否存在
      if (!(await FileSystemUtils.fileExists(filePath))) {
        return null;
      }

      // 检查文件扩展名
      const ext = this.getFileExtension(filePath);
      if (!this.config.extensions?.includes(ext)) {
        return null;
      }

      // 执行ESLint分析
      const results = await this.eslint.lintFiles([filePath]);

      const processingTime = Date.now() - startTime;

      return {
        filePath,
        result: results[0] || {
          filePath,
          messages: [],
          errorCount: 0,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
          source: '',
          usedDeprecatedRules: [],
        },
        processingTime,
      };
    } catch (error) {
      console.warn(`ESLint分析文件失败 ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 批量分析文件
   */
  async analyzeFiles(filePaths: string[]): Promise<ESLintAnalysisResult[]> {
    if (!this.config.enabled || !this.eslint) {
      return [];
    }

    const results: ESLintAnalysisResult[] = [];
    const batchSize = 10; // 每批处理10个文件

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchPromises = batch.map(filePath => this.analyzeFile(filePath));
      const batchResults = await Promise.all(batchPromises);

      results.push(
        ...batchResults.filter(
          (result): result is ESLintAnalysisResult => result !== null
        )
      );
    }

    return results;
  }

  /**
   * 将ESLint结果转换为导出问题
   */
  convertToExportIssues(results: ESLintAnalysisResult[]): ExportIssue[] {
    const issues: ExportIssue[] = [];

    for (const analysisResult of results) {
      const { result, filePath } = analysisResult;

      for (const message of result.messages) {
        // 只处理与导出相关的ESLint错误
        if (this.isExportRelatedMessage(message)) {
          const issue = this.createIssueFromESLintMessage(message, filePath);
          if (issue) {
            issues.push(issue);
          }
        }
      }
    }

    return issues;
  }

  /**
   * 判断ESLint消息是否与导出相关
   */
  private isExportRelatedMessage(message: any): boolean {
    const exportRelatedRules = [
      'no-unused-vars',
      '@typescript-eslint/no-unused-vars',
      'no-undef',
      '@typescript-eslint/no-undef',
      'import/no-unresolved',
      'import/named',
      'import/default',
      'import/namespace',
      'export/named',
      'export/default',
    ];

    return exportRelatedRules.includes(message.ruleId || '');
  }

  /**
   * 从ESLint消息创建导出问题
   */
  private createIssueFromESLintMessage(
    message: any,
    filePath: string
  ): ExportIssue | null {
    try {
      // 获取代码片段
      const source = message.source || '';
      const lines = source.split('\n');
      const codeSnippet = lines[message.line - 1] || '';

      // 确定问题类型
      let issueType: ExportIssueType = ExportIssueType.TYPE_EXPORT_ISSUE;
      let severity: IssueSeverity = IssueSeverity.INFO;

      switch (message.ruleId) {
        case 'no-unused-vars':
        case '@typescript-eslint/no-unused-vars':
          issueType = ExportIssueType.UNUSED_EXPORT;
          severity = IssueSeverity.WARNING;
          break;
        case 'no-undef':
        case '@typescript-eslint/no-undef':
          issueType = ExportIssueType.MISSING_EXPORT;
          severity = IssueSeverity.ERROR;
          break;
        default:
          issueType = ExportIssueType.TYPE_EXPORT_ISSUE;
          severity = IssueSeverity.INFO;
      }

      return {
        id: `eslint-${message.ruleId}-${filePath}-${message.line}-${message.column}`,
        type: issueType,
        severity,
        description: message.message,
        location: {
          filePath,
          line: message.line,
          column: message.column,
          codeSnippet,
        },
        suggestions: [],
        detectedAt: new Date(),
      };
    } catch (error) {
      console.warn('创建ESLint问题失败:', error);
      return null;
    }
  }

  /**
   * 修复ESLint问题
   */
  async fixFile(filePath: string): Promise<{
    fixed: boolean;
    output: string;
    messages: any[];
  } | null> {
    if (!this.config.enabled || !this.eslint) {
      return null;
    }

    try {
      const results = await this.eslint.lintFiles([filePath]);
      const result = results[0];

      if (!result) {
        return null;
      }

      // 应用自动修复
      const fixer = new ESLint({ fix: true });
      const fixedResults = await fixer.lintFiles([filePath]);
      const fixedResult = fixedResults[0];

      if (fixedResult && fixedResult.output) {
        // 写入修复后的文件
        await FileSystemUtils.writeFileContent(filePath, fixedResult.output);

        return {
          fixed: true,
          output: fixedResult.output,
          messages: fixedResult.messages,
        };
      }

      return {
        fixed: false,
        output: result.source || '',
        messages: result.messages,
      };
    } catch (error) {
      console.warn(`ESLint修复文件失败 ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 获取ESLint配置
   */
  async getConfig(filePath?: string): Promise<any> {
    if (!this.eslint) {
      return null;
    }

    try {
      if (filePath) {
        return await this.eslint.calculateConfigForFile(filePath);
      }
      return this.eslint.getRules();
    } catch (error) {
      console.warn('获取ESLint配置失败:', error);
      return null;
    }
  }

  /**
   * 验证ESLint配置
   */
  async validateConfig(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!this.config.enabled) {
        return { valid: true, errors, warnings };
      }

      if (!this.eslint) {
        errors.push('ESLint实例未初始化');
        return { valid: false, errors, warnings };
      }

      // 检查配置文件
      if (
        this.config.configFile &&
        !(await FileSystemUtils.fileExists(this.config.configFile))
      ) {
        warnings.push(`ESLint配置文件不存在: ${this.config.configFile}`);
      }

      // 验证规则配置
      if (this.config.rules) {
        for (const [ruleName, ruleConfig] of Object.entries(
          this.config.rules
        )) {
          try {
            // 这里可以添加更详细的规则验证
            if (
              typeof ruleConfig !== 'string' &&
              typeof ruleConfig !== 'number' &&
              !Array.isArray(ruleConfig)
            ) {
              warnings.push(`规则 ${ruleName} 的配置格式无效`);
            }
          } catch (error) {
            warnings.push(`规则 ${ruleName} 配置验证失败: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`ESLint配置验证失败: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取支持的文件扩展名
   */
  getSupportedExtensions(): string[] {
    return this.config.extensions || ['.ts', '.tsx', '.js', '.jsx'];
  }

  /**
   * 检查文件是否受支持
   */
  isFileSupported(filePath: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const ext = this.getFileExtension(filePath);
    return this.getSupportedExtensions().includes(ext);
  }

  /**
   * 获取ESLint版本信息
   */
  getVersion(): string {
    try {
      // 这里可以返回ESLint版本
      return '8.x.x'; // 占位符
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    filesAnalyzed: number;
    totalIssues: number;
    fixableIssues: number;
    averageProcessingTime: number;
  } {
    // 这里可以实现统计收集
    return {
      filesAnalyzed: 0,
      totalIssues: 0,
      fixableIssues: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * 工具方法：获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return ext.toLowerCase();
  }
}

/**
 * 默认ESLint集成实例
 */
export const eslintIntegration = new ESLintIntegration({
  enabled: true,
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
});
