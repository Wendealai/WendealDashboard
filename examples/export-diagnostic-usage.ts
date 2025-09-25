/**
 * Export Diagnostic System Usage Examples
 * 导出诊断系统使用示例
 */

import { DiagnosticService, createDiagnosticService } from '../src/services/DiagnosticService';
import { DiagnosticEngine } from '../src/utils/diagnostic/DiagnosticEngine';
import { FileScanner } from '../src/utils/diagnostic/FileScanner';
import { ExportAnalyzer } from '../src/utils/diagnostic/ExportAnalyzer';
import { FixSuggester } from '../src/utils/diagnostic/FixSuggester';
import { DependencyResolver } from '../src/utils/diagnostic/DependencyResolver';
import { CacheManager } from '../src/utils/diagnostic/CacheManager';
import { TypeScriptIntegration } from '../src/utils/diagnostic/TypeScriptIntegration';
import { ESLintIntegration } from '../src/utils/diagnostic/ESLintIntegration';
import { ErrorHandler, withErrorHandling, withRetry, withTimeout } from '../src/utils/diagnostic/ErrorHandler';
import type { DiagnosticConfig, ScanOptions, DiagnosticReport } from '../src/types/exportDiagnostic';

/**
 * 示例1: 基本使用
 * Basic Usage Example
 */
async function basicUsage() {
  console.log('=== 基本使用示例 ===');

  // 创建诊断服务
  const service = createDiagnosticService({
    filePatterns: ['**/*.{ts,tsx}'],
    ignorePatterns: ['**/node_modules/**', '**/*.test.*'],
    enableCache: true,
  });

  // 执行诊断
  const report = await service.diagnose({
    rootDir: './src',
    recursive: true,
    onProgress: (progress) => {
      console.log(`进度: ${progress.processedFiles}/${progress.totalFiles}`);
    },
  });

  console.log(`扫描完成，发现 ${report.issuesFound} 个问题`);
  console.log(`导出使用率: ${(report.summary.exportUsageRate * 100).toFixed(1)}%`);
}

/**
 * 示例2: 高级配置
 * Advanced Configuration Example
 */
async function advancedConfiguration() {
  console.log('=== 高级配置示例 ===');

  const config: DiagnosticConfig = {
    filePatterns: [
      '**/*.{ts,tsx,js,jsx}',
      '**/*.d.ts',
    ],
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/coverage/**',
    ],
    maxDepth: 10,
    timeout: 30000,
    concurrency: 4,
    enableCache: true,
    cacheExpiry: 5 * 60 * 1000, // 5分钟
    severityThreshold: 'info',
    typescriptConfig: {
      strict: true,
      checkTypeExports: true,
      target: 'ES2020',
    },
    eslintConfig: {
      enabled: true,
      configFile: '.eslintrc.js',
    },
    output: {
      format: 'json',
      verbose: true,
      includeSuggestions: true,
      includeCodeSnippets: true,
    },
  };

  const service = new DiagnosticService(config);
  const report = await service.diagnose({
    rootDir: './src',
    recursive: true,
  });

  // 输出详细报告
  console.log('详细报告:');
  console.log(`- 扫描文件: ${report.filesScanned}`);
  console.log(`- 处理时间: ${report.duration}ms`);
  console.log(`- 总导出数: ${report.summary.totalExports}`);
  console.log(`- 已使用导出: ${report.summary.usedExports}`);
  console.log(`- 未使用导出: ${report.summary.unusedExports}`);

  // 按类型统计问题
  const issuesByType = report.issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('问题统计:');
  Object.entries(issuesByType).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });
}

/**
 * 示例3: 错误处理和重试
 * Error Handling and Retry Example
 */
async function errorHandlingExample() {
  console.log('=== 错误处理示例 ===');

  const errorHandler = new ErrorHandler({
    enableLogging: true,
    maxRetries: 3,
    retryDelay: 1000,
  });

  // 使用重试装饰器
  const unreliableOperation = withRetry(async () => {
    // 模拟可能失败的操作
    if (Math.random() < 0.7) {
      throw new Error('临时网络错误');
    }
    return { success: true, data: '操作成功' };
  }, {
    maxRetries: 3,
    operationName: 'unreliable_operation',
  });

  try {
    const result = await unreliableOperation();
    console.log('操作成功:', result);
  } catch (error) {
    console.error('操作最终失败:', error);
  }

  // 使用超时装饰器
  const slowOperation = withTimeout(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return '慢操作完成';
  }, 5000, 'slow_operation');

  try {
    const result = await slowOperation();
    console.log('超时操作成功:', result);
  } catch (error) {
    console.error('超时操作失败:', error);
  }
}

/**
 * 示例4: 自定义规则和分析器
 * Custom Rules and Analyzer Example
 */
async function customAnalysisExample() {
  console.log('=== 自定义分析示例 ===');

  // 创建自定义分析器
  class CustomExportAnalyzer extends ExportAnalyzer {
    async analyzeCustomPatterns(exports: any[]) {
      const issues = [];

      for (const exp of exports) {
        // 检查自定义命名约定
        if (exp.name.startsWith('_') && exp.isUsed) {
          issues.push({
            id: `custom-naming-${exp.location.filePath}-${exp.name}`,
            type: 'custom_naming_issue',
            severity: 'warning',
            description: `私有导出 '${exp.name}' 被外部使用，建议重命名`,
            location: exp.location,
            suggestions: [{
              id: `rename-${exp.name}`,
              title: '重命名私有导出',
              description: `将 '${exp.name}' 重命名为 '${exp.name.replace('_', '')}'`,
              fixType: 'manual_fix',
              confidence: 0.8,
              affectedFiles: [exp.location.filePath],
            }],
            detectedAt: new Date(),
          });
        }
      }

      return issues;
    }
  }

  const config: DiagnosticConfig = {
    filePatterns: ['**/*.{ts,tsx}'],
    ignorePatterns: ['**/node_modules/**'],
    enableCache: false,
    customRules: [{
      id: 'no-underscore-exports',
      name: '禁止下划线开头的导出',
      description: '不允许使用下划线开头的导出名称',
      type: 'custom_naming_issue',
      severity: 'warning',
      condition: (exportInfo) => exportInfo.name.startsWith('_'),
      message: '导出名称不应以下划线开头',
      enabled: true,
    }],
  };

  const analyzer = new CustomExportAnalyzer(config);
  const customIssues = await analyzer.analyzeCustomPatterns([]);

  console.log(`发现 ${customIssues.length} 个自定义问题`);
}

/**
 * 示例5: 批量处理和报告生成
 * Batch Processing and Report Generation Example
 */
async function batchProcessingExample() {
  console.log('=== 批量处理示例 ===');

  const service = createDiagnosticService();

  // 批量处理多个项目
  const projects = [
    './src/components',
    './src/utils',
    './src/services',
  ];

  const reports: DiagnosticReport[] = [];

  for (const project of projects) {
    console.log(`处理项目: ${project}`);

    try {
      const report = await service.diagnose({
        rootDir: project,
        recursive: true,
      });

      reports.push(report);
      console.log(`  发现 ${report.issuesFound} 个问题`);
    } catch (error) {
      console.error(`  处理失败 ${project}:`, error);
    }
  }

  // 生成汇总报告
  const totalIssues = reports.reduce((sum, report) => sum + report.issuesFound, 0);
  const totalFiles = reports.reduce((sum, report) => sum + report.filesScanned, 0);
  const averageUsage = reports.reduce((sum, report) => sum + report.summary.exportUsageRate, 0) / reports.length;

  console.log('\n=== 汇总报告 ===');
  console.log(`总项目数: ${projects.length}`);
  console.log(`总文件数: ${totalFiles}`);
  console.log(`总问题数: ${totalIssues}`);
  console.log(`平均使用率: ${(averageUsage * 100).toFixed(1)}%`);

  // 生成HTML报告
  await generateHtmlReport(reports);
}

/**
 * 示例6: 持续集成集成
 * CI/CD Integration Example
 */
async function ciIntegrationExample() {
  console.log('=== CI/CD集成示例 ===');

  // CI环境配置
  const ciConfig: DiagnosticConfig = {
    filePatterns: ['**/*.{ts,tsx}'],
    ignorePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.*',
      '**/*.spec.*',
    ],
    enableCache: false, // CI中不使用缓存
    output: {
      format: 'junit', // JUnit格式用于CI报告
      file: 'export-diagnostic-results.xml',
      verbose: false,
    },
    severityThreshold: 'error', // 只报告错误级别问题
  };

  const service = new DiagnosticService(ciConfig);

  try {
    const report = await service.diagnose({
      rootDir: process.env.CI_PROJECT_DIR || './',
      recursive: true,
    });

    // 检查是否超过阈值
    const errorCount = report.issues.filter(issue => issue.severity === 'error').length;

    if (errorCount > 0) {
      console.error(`发现 ${errorCount} 个错误级别问题，构建失败`);
      process.exit(1);
    }

    console.log(`CI检查通过，发现 ${report.issuesFound} 个问题（${errorCount} 个错误）`);
  } catch (error) {
    console.error('CI诊断失败:', error);
    process.exit(1);
  }
}

/**
 * 示例7: 实时监控和钩子
 * Real-time Monitoring and Hooks Example
 */
async function monitoringExample() {
  console.log('=== 实时监控示例 ===');

  const service = new DiagnosticService({
    filePatterns: ['**/*.{ts,tsx}'],
    enableCache: true,
  }, {
    events: {
      onScanStarted: (options) => {
        console.log(`开始扫描: ${options.rootDir}`);
      },
      onScanProgress: (progress) => {
        const percent = progress.totalFiles > 0 ?
          Math.round((progress.processedFiles / progress.totalFiles) * 100) : 0;
        console.log(`扫描进度: ${percent}% (${progress.processedFiles}/${progress.totalFiles})`);
      },
      onScanCompleted: (report) => {
        console.log(`扫描完成: ${report.duration}ms, ${report.issuesFound} 个问题`);
      },
      onScanError: (error, options) => {
        console.error(`扫描失败 ${options.rootDir}:`, error);
      },
    },
  });

  // 监控模式：定期扫描
  const monitor = async () => {
    while (true) {
      try {
        console.log('\n--- 开始监控扫描 ---');
        const report = await service.diagnose({
          rootDir: './src',
          recursive: true,
        });

        // 检查是否有新问题
        if (report.issuesFound > 0) {
          console.log('⚠️  发现新问题，发送通知...');
          // 这里可以发送邮件、Slack通知等
        }

        // 等待下次扫描
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5分钟
      } catch (error) {
        console.error('监控扫描失败:', error);
        await new Promise(resolve => setTimeout(resolve, 60 * 1000)); // 1分钟后重试
      }
    }
  };

  // 启动监控（在实际使用中需要处理程序退出）
  // monitor();
}

/**
 * 工具函数：生成HTML报告
 */
async function generateHtmlReport(reports: DiagnosticReport[]): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>导出诊断汇总报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .project { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .metric { display: inline-block; margin: 10px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #007acc; }
    .metric-label { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>导出诊断汇总报告</h1>
  <div class="summary">
    <div class="metric">
      <div class="metric-value">${reports.length}</div>
      <div class="metric-label">项目数</div>
    </div>
    <div class="metric">
      <div class="metric-value">${reports.reduce((sum, r) => sum + r.filesScanned, 0)}</div>
      <div class="metric-label">总文件数</div>
    </div>
    <div class="metric">
      <div class="metric-value">${reports.reduce((sum, r) => sum + r.issuesFound, 0)}</div>
      <div class="metric-label">总问题数</div>
    </div>
    <div class="metric">
      <div class="metric-value">${(reports.reduce((sum, r) => sum + r.summary.exportUsageRate, 0) / reports.length * 100).toFixed(1)}%</div>
      <div class="metric-label">平均使用率</div>
    </div>
  </div>

  <h2>项目详情</h2>
  ${reports.map((report, index) => `
    <div class="project">
      <h3>项目 ${index + 1}</h3>
      <p><strong>扫描时间:</strong> ${report.scanTime ? new Date(report.scanTime).toLocaleString() : '未知'}</p>
      <p><strong>文件数:</strong> ${report.filesScanned}</p>
      <p><strong>问题数:</strong> ${report.issuesFound}</p>
      <p><strong>导出使用率:</strong> ${(report.summary.exportUsageRate * 100).toFixed(1)}%</p>
      <p><strong>处理时间:</strong> ${report.duration}ms</p>
    </div>
  `).join('')}
</body>
</html>
  `;

  // 在实际使用中，这里会写入文件
  console.log('HTML报告生成完成');
}

/**
 * 主函数：运行所有示例
 */
async function runAllExamples() {
  try {
    await basicUsage();
    console.log('');

    await advancedConfiguration();
    console.log('');

    await errorHandlingExample();
    console.log('');

    await customAnalysisExample();
    console.log('');

    await batchProcessingExample();
    console.log('');

    // 注意：CI和监控示例在实际运行时需要特殊处理
    console.log('CI和监控示例请单独运行');

  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}

export {
  basicUsage,
  advancedConfiguration,
  errorHandlingExample,
  customAnalysisExample,
  batchProcessingExample,
  ciIntegrationExample,
  monitoringExample,
  runAllExamples,
};