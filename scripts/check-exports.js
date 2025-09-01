#!/usr/bin/env node

/**
 * 导出一致性检查CLI工具
 * 提供扫描、修复和报告生成功能
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 检查TypeScript编译错误
 */
function checkTypeScriptErrors() {
  log('🔍 检查 TypeScript 编译错误...', 'blue');
  
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ TypeScript 编译检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript 编译错误:', 'red');
    console.log(error.stdout.toString());
    return false;
  }
}

/**
 * 检查ESLint错误
 */
function checkESLintErrors() {
  log('🔍 检查 ESLint 错误...', 'blue');
  
  try {
    execSync('npx eslint src --ext .ts,.tsx', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ ESLint 检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ ESLint 错误:', 'red');
    console.log(error.stdout.toString());
    return false;
  }
}

/**
 * 扫描重复导出
 */
function scanDuplicateExports() {
  log('🔍 扫描重复导出...', 'blue');
  
  const srcDir = path.join(process.cwd(), 'src');
  const issues = [];
  
  function scanFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const exports = new Set();
      
      lines.forEach((line, index) => {
        // 检查默认导出和命名导出冲突
        const defaultExportMatch = line.match(/export\s+default\s+(\w+)/);
        const namedExportMatch = line.match(/export\s*{[^}]*\b(\w+)\b[^}]*}/);
        
        if (defaultExportMatch && namedExportMatch) {
          const defaultName = defaultExportMatch[1];
          const namedName = namedExportMatch[1];
          
          if (defaultName === namedName) {
            issues.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              issue: `重复导出 "${defaultName}" (默认导出和命名导出冲突)`,
              content: line.trim()
            });
          }
        }
        
        // 检查重复的命名导出
        const exportMatches = line.matchAll(/export\s*{([^}]+)}/g);
        for (const match of exportMatches) {
          const exportList = match[1].split(',').map(e => e.trim());
          exportList.forEach(exportName => {
            const cleanName = exportName.replace(/\s+as\s+\w+/, '').trim();
            if (exports.has(cleanName)) {
              issues.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                issue: `重复导出 "${cleanName}"`,
                content: line.trim()
              });
            }
            exports.add(cleanName);
          });
        }
      });
    } catch (error) {
      // 忽略读取错误
    }
  }
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else {
        scanFile(filePath);
      }
    });
  }
  
  walkDir(srcDir);
  
  if (issues.length === 0) {
    log('✅ 未发现重复导出问题', 'green');
    return true;
  } else {
    log(`❌ 发现 ${issues.length} 个重复导出问题:`, 'red');
    issues.forEach(issue => {
      log(`  ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
      log(`    ${issue.content}`, 'reset');
    });
    return false;
  }
}

/**
 * 扫描模式 - 检查导出一致性问题
 */
function scanMode(options = {}) {
  log('🔍 扫描导出一致性问题...', 'blue');
  
  const checks = [
    checkTypeScriptErrors,
    checkESLintErrors,
    scanDuplicateExports
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const check of checks) {
    const result = check();
    results.push(result);
    if (!result) {
      allPassed = false;
    }
    console.log(''); // 空行分隔
  }
  
  if (options.json) {
    console.log(JSON.stringify({ passed: allPassed, results }, null, 2));
  } else {
    if (allPassed) {
      log('🎉 所有检查通过！', 'green');
    } else {
      log('💥 发现导出一致性问题', 'red');
    }
  }
  
  return allPassed;
}

/**
 * 修复模式 - 自动修复导出一致性问题
 */
function fixMode(options = {}) {
  log('🔧 自动修复导出一致性问题...', 'blue');
  
  if (options.dryRun) {
    log('📋 干运行模式 - 仅显示将要进行的修复', 'yellow');
  }
  
  // 这里可以集成自动修复逻辑
  log('⚠️  自动修复功能正在开发中', 'yellow');
  log('💡 建议先运行扫描模式查看问题，然后手动修复', 'blue');
  
  return false;
}

/**
 * 报告模式 - 生成详细的导出一致性报告
 */
function reportMode(options = {}) {
  log('📊 生成导出一致性报告...', 'blue');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    project: path.basename(process.cwd()),
    checks: {
      typescript: checkTypeScriptErrors(),
      eslint: checkESLintErrors(),
      duplicateExports: scanDuplicateExports()
    }
  };
  
  const outputFormat = options.format || 'console';
  const outputFile = options.output;
  
  if (outputFormat === 'json') {
    const jsonReport = JSON.stringify(reportData, null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, jsonReport);
      log(`📄 JSON报告已保存到: ${outputFile}`, 'green');
    } else {
      console.log(jsonReport);
    }
  } else if (outputFormat === 'html') {
    const htmlReport = generateHTMLReport(reportData);
    const htmlFile = outputFile || 'export-consistency-report.html';
    fs.writeFileSync(htmlFile, htmlReport);
    log(`📄 HTML报告已保存到: ${htmlFile}`, 'green');
  } else {
    // 控制台输出
    log('\n📋 导出一致性报告', 'blue');
    log(`项目: ${reportData.project}`, 'reset');
    log(`时间: ${reportData.timestamp}`, 'reset');
    log('\n检查结果:', 'blue');
    log(`  TypeScript编译: ${reportData.checks.typescript ? '✅ 通过' : '❌ 失败'}`, reportData.checks.typescript ? 'green' : 'red');
    log(`  ESLint检查: ${reportData.checks.eslint ? '✅ 通过' : '❌ 失败'}`, reportData.checks.eslint ? 'green' : 'red');
    log(`  重复导出检查: ${reportData.checks.duplicateExports ? '✅ 通过' : '❌ 失败'}`, reportData.checks.duplicateExports ? 'green' : 'red');
  }
  
  return reportData;
}

/**
 * 生成HTML报告
 */
function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导出一致性报告 - ${data.project}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .check-item { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .pass { background: #d4edda; color: #155724; }
        .fail { background: #f8d7da; color: #721c24; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>导出一致性报告</h1>
        <p><strong>项目:</strong> ${data.project}</p>
        <p class="timestamp"><strong>生成时间:</strong> ${data.timestamp}</p>
    </div>
    
    <h2>检查结果</h2>
    <div class="check-item ${data.checks.typescript ? 'pass' : 'fail'}">
        <strong>TypeScript编译:</strong> ${data.checks.typescript ? '✅ 通过' : '❌ 失败'}
    </div>
    <div class="check-item ${data.checks.eslint ? 'pass' : 'fail'}">
        <strong>ESLint检查:</strong> ${data.checks.eslint ? '✅ 通过' : '❌ 失败'}
    </div>
    <div class="check-item ${data.checks.duplicateExports ? 'pass' : 'fail'}">
        <strong>重复导出检查:</strong> ${data.checks.duplicateExports ? '✅ 通过' : '❌ 失败'}
    </div>
</body>
</html>
  `;
}

/**
 * 设置CLI命令
 */
function setupCLI() {
  program
    .name('check-exports')
    .description('导出一致性检查CLI工具')
    .version('1.0.0');

  // 扫描命令
  program
    .command('scan')
    .description('扫描导出一致性问题')
    .option('-j, --json', '以JSON格式输出结果')
    .action((options) => {
      const passed = scanMode(options);
      process.exit(passed ? 0 : 1);
    });

  // 修复命令
  program
    .command('fix')
    .description('自动修复导出一致性问题')
    .option('-d, --dry-run', '干运行模式，仅显示将要进行的修复')
    .action((options) => {
      const success = fixMode(options);
      process.exit(success ? 0 : 1);
    });

  // 报告命令
  program
    .command('report')
    .description('生成导出一致性报告')
    .option('-f, --format <type>', '输出格式 (console, json, html)', 'console')
    .option('-o, --output <file>', '输出文件路径')
    .action((options) => {
      reportMode(options);
    });

  // 默认命令（向后兼容）
  if (process.argv.length === 2) {
    const passed = scanMode();
    process.exit(passed ? 0 : 1);
  }

  program.parse();
}

// 如果直接运行此脚本
if (import.meta.url === pathToFileURL(__filename).href) {
  setupCLI();
}

export {
  checkTypeScriptErrors,
  checkESLintErrors,
  scanDuplicateExports
};