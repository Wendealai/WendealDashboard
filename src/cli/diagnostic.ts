#!/usr/bin/env node

/**
 * Export Diagnostic CLI Tool
 * 导出诊断命令行工具
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { DiagnosticService } from '../services/DiagnosticService';
import {
  getConfigForEnvironment,
  loadConfigFromFile,
} from '../config/exportDiagnosticConfig';
import type { DiagnosticConfig, ScanOptions } from '../types/exportDiagnostic';

const program = new Command();

// CLI 工具元信息
program
  .name('export-diagnostic')
  .description('TypeScript/JavaScript 导出诊断工具')
  .version('1.0.0');

// 诊断命令
program
  .command('scan')
  .description('扫描项目中的导出问题')
  .option('-d, --directory <directory>', '扫描目录', '.')
  .option('-c, --config <file>', '配置文件路径')
  .option(
    '-f, --format <format>',
    '输出格式 (json, text, html, console)',
    'json'
  )
  .option('-o, --output <file>', '输出文件路径')
  .option('-v, --verbose', '详细输出')
  .option('--fix', '自动修复发现的问题')
  .option('--dry-run', '仅检查，不执行修复')
  .option('--include-node-modules', '包含 node_modules')
  .option('--include-tests', '包含测试文件')
  .option('--concurrency <number>', '并发扫描数量', parseInt, 4)
  .option('--timeout <ms>', '超时时间（毫秒）', parseInt, 30000)
  .option('--max-depth <depth>', '最大扫描深度', parseInt, 10)
  .action(async (options: any) => {
    try {
      const directory = options.directory || '.';
      console.log('🚀 开始导出诊断扫描...\n');

      // 加载配置
      const config = await loadConfiguration(options.config);
      const service = new DiagnosticService(config);

      // 构建扫描选项
      const scanOptions: ScanOptions = {
        rootDir: path.resolve(directory),
        outputFormat: 'json',
        showProgress: options.verbose || false,
        verbose: options.verbose || false,
        fixIssues: options.fix || false,
        fixConfirmation: options.dryRun ? 'none' : 'manual',
        recursive: true,
        includeHidden: false,
        includeNodeModules: options.includeNodeModules || false,
        includeTests: options.includeTests || false,
        concurrency: options.concurrency,
        onProgress: progress => {
          if (options.verbose) {
            const percent =
              progress.totalFiles > 0
                ? Math.round(
                    (progress.processedFiles / progress.totalFiles) * 100
                  )
                : 0;
            console.log(
              `📁 处理进度: ${progress.processedFiles}/${progress.totalFiles} (${percent}%) - ${progress.currentFile || '未知文件'}`
            );
          }
        },
      };

      // 显示扫描信息
      console.log(`📂 扫描目录: ${scanOptions.rootDir}`);
      console.log(`🔍 文件模式: ${config.filePatterns.join(', ')}`);
      console.log(`🚫 忽略模式: ${config.ignorePatterns.join(', ')}`);
      console.log(`⚡ 并发数: ${scanOptions.concurrency}`);
      console.log('');

      // 执行诊断
      const startTime = Date.now();
      const report = await service.diagnose(scanOptions);
      const duration = Date.now() - startTime;

      // 显示结果摘要
      console.log('📊 诊断结果摘要:');
      console.log(`   扫描文件: ${report.filesScanned}`);
      console.log(`   发现导出: ${report.summary?.totalExports || 0}`);
      console.log(`   已使用导出: ${report.summary?.usedExports || 0}`);
      console.log(`   未使用导出: ${report.summary?.unusedExports || 0}`);
      console.log(`   发现问题: ${report.issues.length}`);
      console.log(`   扫描时间: ${duration}ms`);
      console.log('');

      // 显示问题详情
      if (report.issues.length > 0) {
        console.log('⚠️  发现的问题:');
        const issuesByType = report.issues.reduce(
          (acc, issue) => {
            acc[issue.type] = (acc[issue.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        Object.entries(issuesByType).forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
        console.log('');
      }

      // 输出结果
      await outputResults(report, options);

      // 自动修复
      if (options.fix && !options.dryRun) {
        console.log('🔧 执行自动修复...');
        // 这里可以实现自动修复逻辑
        const totalSuggestions = report.issues.reduce(
          (sum, issue) => sum + (issue.suggestions?.length || 0),
          0
        );
        console.log(`   发现 ${totalSuggestions} 个修复建议`);
        console.log('   注意: 自动修复功能尚未实现，请手动修复');
      }

      console.log('\n✅ 诊断完成!');
    } catch (error) {
      console.error('❌ 诊断失败:', error);
      process.exit(1);
    }
  });

// 配置命令
program
  .command('config')
  .description('管理诊断配置')
  .option('--show', '显示当前配置')
  .option('--init', '创建默认配置文件')
  .option('--validate', '验证当前配置')
  .action(async (options: any) => {
    try {
      if (options.show) {
        const config = getConfigForEnvironment();
        console.log('📋 当前配置:');
        console.log(JSON.stringify(config, null, 2));
      } else if (options.init) {
        const configPath = './export-diagnostic.config.js';
        const config = getConfigForEnvironment();

        const configContent = `// Export Diagnostic Configuration
module.exports = ${JSON.stringify(config, null, 2)};
`;

        await fs.writeFile(configPath, configContent, 'utf-8');
        console.log(`✅ 配置文件已创建: ${configPath}`);
      } else if (options.validate) {
        const config = getConfigForEnvironment();
        const { validateConfig } = await import(
          '../config/exportDiagnosticConfig'
        );
        const result = validateConfig(config);

        if (result.valid) {
          console.log('✅ 配置验证通过');
        } else {
          console.log('❌ 配置验证失败:');
          result.errors.forEach(error => console.log(`   - ${error}`));
          process.exit(1);
        }
      } else {
        console.log('请指定操作: --show, --init, 或 --validate');
      }
    } catch (error) {
      console.error('❌ 配置操作失败:', error);
      process.exit(1);
    }
  });

// 缓存命令
program
  .command('cache')
  .description('管理诊断缓存')
  .option('--clear', '清除所有缓存')
  .option('--stats', '显示缓存统计')
  .action(async (options: any) => {
    try {
      const config = getConfigForEnvironment();
      const service = new DiagnosticService(config);

      if (options.clear) {
        await service.clearCache();
        console.log('✅ 缓存已清除');
      } else if (options.stats) {
        const status = await service.getStatus();
        console.log('📊 缓存统计:');
        console.log(`   缓存大小: ${status.cacheSize} 条目`);
      } else {
        console.log('请指定操作: --clear 或 --stats');
      }
    } catch (error) {
      console.error('❌ 缓存操作失败:', error);
      process.exit(1);
    }
  });

// 健康检查命令
program
  .command('health')
  .description('执行服务健康检查')
  .action(async () => {
    try {
      const config = getConfigForEnvironment();
      const service = new DiagnosticService(config);
      const health = await service.healthCheck();

      console.log('🏥 健康检查结果:');
      console.log(`   状态: ${health.healthy ? '✅ 健康' : '❌ 不健康'}`);
      console.log(`   响应时间: ${health.responseTime}ms`);
      console.log(`   检查时间: ${health.checkedAt.toISOString()}`);

      if (health.details) {
        console.log('   详细信息:');
        console.log(`     - 活跃连接: ${health.details.activeConnections}`);
        console.log(
          `     - 缓存命中率: ${health.details.cacheHitRate ? (health.details.cacheHitRate * 100).toFixed(1) : 'N/A'}%`
        );
        console.log(`     - 平均扫描时间: ${health.details.averageScanTime}ms`);
      }

      if (health.error) {
        console.log(`   错误: ${health.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 健康检查失败:', error);
      process.exit(1);
    }
  });

// 历史记录命令
program
  .command('history')
  .description('查看诊断历史')
  .option('-n, --limit <number>', '显示数量限制', parseInt, 10)
  .action(async (options: any) => {
    try {
      const config = getConfigForEnvironment();
      const service = new DiagnosticService(config);
      const history = await service.getHistory();

      if (history.length === 0) {
        console.log('📝 暂无诊断历史');
        return;
      }

      console.log('📝 诊断历史:');
      const recent = history.slice(-options.limit);

      recent.forEach((report, index) => {
        const scanTime = report.scanTime
          ? new Date(report.scanTime).toLocaleString()
          : '未知';
        console.log(
          `   ${index + 1}. ${scanTime} - ${report.issuesFound} 个问题, ${report.filesScanned} 个文件`
        );
      });
    } catch (error) {
      console.error('❌ 获取历史记录失败:', error);
      process.exit(1);
    }
  });

// 帮助信息
program.on('--help', () => {
  console.log('');
  console.log('示例:');
  console.log('  $ export-diagnostic scan                    # 扫描当前目录');
  console.log('  $ export-diagnostic scan src               # 扫描 src 目录');
  console.log('  $ export-diagnostic scan --format html     # HTML 格式输出');
  console.log('  $ export-diagnostic scan --verbose         # 详细输出');
  console.log('  $ export-diagnostic config --show          # 显示配置');
  console.log('  $ export-diagnostic config --init          # 创建配置文件');
  console.log('  $ export-diagnostic cache --clear          # 清除缓存');
  console.log('  $ export-diagnostic health                 # 健康检查');
  console.log('');
});

// 错误处理
program.on('command:*', unknownCommand => {
  console.error(`❌ 未知命令: ${unknownCommand[0]}`);
  console.log('运行 --help 查看可用命令');
  process.exit(1);
});

// 执行命令
program.parse();

/**
 * 加载配置
 */
async function loadConfiguration(
  configPath?: string
): Promise<DiagnosticConfig> {
  if (configPath) {
    return await loadConfigFromFile(configPath);
  }
  return getConfigForEnvironment();
}

/**
 * 输出结果
 */
async function outputResults(report: any, options: any): Promise<void> {
  const format = options.format || 'json';
  let output: string;

  switch (format) {
    case 'json':
      output = JSON.stringify(report, null, 2);
      break;
    case 'text':
      output = formatAsText(report);
      break;
    case 'html':
      output = formatAsHtml(report);
      break;
    case 'console':
      console.log(formatAsText(report));
      return;
    default:
      throw new Error(`不支持的输出格式: ${format}`);
  }

  if (options.output) {
    await fs.writeFile(options.output, output, 'utf-8');
    console.log(`📄 结果已保存到: ${options.output}`);
  } else {
    console.log(output);
  }
}

/**
 * 格式化为文本
 */
function formatAsText(report: any): string {
  let text = '导出诊断报告\n';
  text += '='.repeat(50) + '\n\n';

  text += `扫描时间: ${new Date().toLocaleString()}\n`;
  text += `扫描文件: ${report.filesScanned || 0}\n`;
  text += `发现导出: ${report.totalExports || 0}\n`;
  text += `已使用导出: ${report.usedExports || 0}\n`;
  text += `未使用导出: ${report.unusedExports || 0}\n`;
  text += `发现问题: ${report.issues?.length || 0}\n\n`;

  if (report.issues && report.issues.length > 0) {
    text += '问题列表:\n';
    text += '-'.repeat(30) + '\n';

    report.issues.forEach((issue: any, index: number) => {
      text += `${index + 1}. [${issue.severity}] ${issue.description}\n`;
      text += `   文件: ${issue.location?.filePath}:${issue.location?.line}\n`;
      if (issue.location?.codeSnippet) {
        text += `   代码: ${issue.location.codeSnippet}\n`;
      }
      text += '\n';
    });
  }

  return text;
}

/**
 * 格式化为HTML
 */
function formatAsHtml(report: any): string {
  const escapeHtml = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const issueRows =
    report.issues && report.issues.length > 0
      ? report.issues
          .map(
            (issue: any, index: number) => `
      <article class="issue issue-${String(issue.severity || 'info').toLowerCase()}">
        <div class="issue-head">
          <span class="issue-index">#${index + 1}</span>
          <span class="issue-level">${escapeHtml(issue.severity || 'INFO')}</span>
          <h3>${escapeHtml(issue.description || '未知问题')}</h3>
        </div>
        <p class="issue-meta"><strong>文件:</strong> ${escapeHtml(issue.location?.filePath || '')}:${escapeHtml(issue.location?.line || '')}</p>
        ${
          issue.location?.codeSnippet
            ? `<pre><code>${escapeHtml(issue.location.codeSnippet)}</code></pre>`
            : ''
        }
      </article>
    `
          )
          .join('')
      : '';

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>导出诊断报告</title>
  <style>
    :root {
      --bg: #f4f7fb;
      --surface: #ffffff;
      --line: #dbe5f0;
      --text: #1a2533;
      --muted: #5f6f83;
      --primary: #0f5bdb;
      --danger: #9b2226;
      --warning: #8d5a00;
      --info: #1f4d8f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .container {
      max-width: 1120px;
      margin: 0 auto;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface);
      box-shadow: 0 8px 24px rgba(8, 27, 51, 0.08);
    }
    .hero {
      padding: 22px 24px;
      color: #fff;
      background: linear-gradient(120deg, #0f5bdb 0%, #1f4aa8 60%, #0f5bdb 100%);
    }
    .hero h1 { margin: 0; font-size: 28px; }
    .hero p { margin: 8px 0 0; font-size: 13px; opacity: 0.92; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--line);
      background: #f9fbff;
    }
    .summary-card {
      border: 1px solid #cfe0ff;
      border-radius: 10px;
      padding: 12px;
      background: #eef4ff;
    }
    .summary-card .num {
      font-size: 24px;
      line-height: 1;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 4px;
    }
    .summary-card .label {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .issues {
      padding: 18px 20px 22px;
    }
    .issues h2 {
      margin: 0 0 12px;
      font-size: 18px;
      color: #223248;
    }
    .issue {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      background: #fff;
    }
    .issue-head {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }
    .issue-head h3 {
      margin: 0;
      font-size: 15px;
      line-height: 1.45;
      color: #223248;
    }
    .issue-index {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      color: var(--muted);
      background: #f8fbff;
    }
    .issue-level {
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .issue-error .issue-level {
      color: var(--danger);
      background: #fde8ea;
      border-color: #f4b7bc;
    }
    .issue-warning .issue-level {
      color: var(--warning);
      background: #fff4da;
      border-color: #f1d08c;
    }
    .issue-info .issue-level {
      color: var(--info);
      background: #e4f1ff;
      border-color: #b8d5ff;
    }
    .issue-meta {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 12px;
    }
    pre {
      margin: 0;
      padding: 10px;
      overflow: auto;
      border-radius: 8px;
      border: 1px solid #d7e4f5;
      background: #f7fbff;
      color: #1f2f47;
      font-size: 12px;
      line-height: 1.45;
    }
    .empty {
      border: 1px dashed #b7cae3;
      border-radius: 10px;
      padding: 14px;
      color: #2e4a74;
      background: #f6f9ff;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .container { border: none; box-shadow: none; border-radius: 0; max-width: none; }
      .hero {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <section class="hero">
      <h1>导出诊断报告</h1>
      <p>生成时间: ${new Date().toLocaleString()}</p>
    </section>
    <section class="summary-grid">
      <div class="summary-card"><div class="num">${report.filesScanned || 0}</div><div class="label">扫描文件</div></div>
      <div class="summary-card"><div class="num">${report.totalExports || 0}</div><div class="label">发现导出</div></div>
      <div class="summary-card"><div class="num">${report.usedExports || 0}</div><div class="label">已使用导出</div></div>
      <div class="summary-card"><div class="num">${report.unusedExports || 0}</div><div class="label">未使用导出</div></div>
      <div class="summary-card"><div class="num">${report.issues?.length || 0}</div><div class="label">发现问题</div></div>
    </section>
    <section class="issues">
      <h2>问题列表</h2>
      ${
        issueRows || '<div class="empty">没有发现问题，当前扫描结果良好。</div>'
      }
    </section>
  </div>
</body>
</html>
  `.trim();
}
