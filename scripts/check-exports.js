#!/usr/bin/env node

/**
 * Export consistency check CLI tool
 * Provides scanning, fixing and report generation functionality
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color output
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
 * Check TypeScript compilation errors
 */
function checkTypeScriptErrors() {
  log('🔍 Checking TypeScript compilation errors...', 'blue');
  
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ TypeScript compilation check passed', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript compilation errors:', 'red');
    console.log(error.stdout.toString());
    return false;
  }
}

/**
 * Check ESLint errors
 */
function checkESLintErrors() {
  log('🔍 Checking ESLint errors...', 'blue');
  
  try {
    execSync('npx eslint src --ext .ts,.tsx', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    log('✅ ESLint check passed', 'green');
    return true;
  } catch (error) {
    log('❌ ESLint errors:', 'red');
    console.log(error.stdout.toString());
    return false;
  }
}

/**
 * Scan duplicate exports
 */
function scanDuplicateExports() {
  log('🔍 Scanning duplicate exports...', 'blue');
  
  const srcDir = path.join(process.cwd(), 'src');
  const issues = [];
  
  function scanFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const exports = new Set();
      
      lines.forEach((line, index) => {
        // Check for conflicts between default and named exports
        const defaultExportMatch = line.match(/export\s+default\s+(\w+)/);
        const namedExportMatch = line.match(/export\s*{[^}]*\b(\w+)\b[^}]*}/);
        
        if (defaultExportMatch && namedExportMatch) {
          const defaultName = defaultExportMatch[1];
          const namedName = namedExportMatch[1];
          
          if (defaultName === namedName) {
            issues.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              issue: `Duplicate export "${defaultName}" (default and named export conflict)`,
              content: line.trim()
            });
          }
        }
        
        // Check for duplicate named exports
        const exportMatches = line.matchAll(/export\s*{([^}]+)}/g);
        for (const match of exportMatches) {
          const exportList = match[1].split(',').map(e => e.trim());
          exportList.forEach(exportName => {
            const cleanName = exportName.replace(/\s+as\s+\w+/, '').trim();
            if (exports.has(cleanName)) {
              issues.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                issue: `Duplicate export "${cleanName}"`,
                content: line.trim()
              });
            }
            exports.add(cleanName);
          });
        }
      });
    } catch (error) {
      // Ignore read errors
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
    log('✅ No duplicate export issues found', 'green');
    return true;
  } else {
    log(`❌ Found ${issues.length} duplicate export issues:`, 'red');
    issues.forEach(issue => {
      log(`  ${issue.file}:${issue.line} - ${issue.issue}`, 'yellow');
      log(`    ${issue.content}`, 'reset');
    });
    return false;
  }
}

/**
 * Scan mode - Check export consistency issues
 */
function scanMode(options = {}) {
  log('🔍 Scanning export consistency issues...', 'blue');
  
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
      log('🎉 All checks passed!', 'green');
    } else {
      log('💥 Export consistency issues found', 'red');
    }
  }
  
  return allPassed;
}

/**
 * Fix mode - Automatically fix export consistency issues
 */
function fixMode(options = {}) {
  log('🔧 Automatically fixing export consistency issues...', 'blue');
  
  if (options.dryRun) {
    log('📋 Dry run mode - Only showing fixes to be made', 'yellow');
  }
  
  // Auto-fix logic can be integrated here
  log('⚠️  Auto-fix functionality is under development', 'yellow');
  log('💡 Recommend running scan mode first to view issues, then fix manually', 'blue');
  
  return false;
}

/**
 * Report mode - Generate detailed export consistency report
 */
function reportMode(options = {}) {
  log('📊 Generating export consistency report...', 'blue');
  
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
      log(`📄 JSON report saved to: ${outputFile}`, 'green');
    } else {
      console.log(jsonReport);
    }
  } else if (outputFormat === 'html') {
    const htmlReport = generateHTMLReport(reportData);
    const htmlFile = outputFile || 'export-consistency-report.html';
    fs.writeFileSync(htmlFile, htmlReport);
    log(`📄 HTML report saved to: ${htmlFile}`, 'green');
  } else {
    // Console output
    log('\n📋 Export Consistency Report', 'blue');
    log(`Project: ${reportData.project}`, 'reset');
    log(`Time: ${reportData.timestamp}`, 'reset');
    log('\nCheck Results:', 'blue');
    log(`  TypeScript Compilation: ${reportData.checks.typescript ? '✅ Passed' : '❌ Failed'}`, reportData.checks.typescript ? 'green' : 'red');
     log(`  ESLint Check: ${reportData.checks.eslint ? '✅ Passed' : '❌ Failed'}`, reportData.checks.eslint ? 'green' : 'red');
     log(`  Duplicate Export Check: ${reportData.checks.duplicateExports ? '✅ Passed' : '❌ Failed'}`, reportData.checks.duplicateExports ? 'green' : 'red');
  }
  
  return reportData;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Export Consistency Report - ${data.project}</title>
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
        <h1>Export Consistency Report</h1>
        <p><strong>Project:</strong> ${data.project}</p>
        <p class="timestamp"><strong>Generated:</strong> ${data.timestamp}</p>
    </div>
    
    <h2>Check Results</h2>
    <div class="check-item ${data.checks.typescript ? 'pass' : 'fail'}">
        <strong>TypeScript Compilation:</strong> ${data.checks.typescript ? '✅ Passed' : '❌ Failed'}
    </div>
    <div class="check-item ${data.checks.eslint ? 'pass' : 'fail'}">
        <strong>ESLint Check:</strong> ${data.checks.eslint ? '✅ Passed' : '❌ Failed'}
    </div>
    <div class="check-item ${data.checks.duplicateExports ? 'pass' : 'fail'}">
        <strong>Duplicate Export Check:</strong> ${data.checks.duplicateExports ? '✅ Passed' : '❌ Failed'}
    </div>
</body>
</html>
  `;
}

/**
 * Setup CLI commands
 */
function setupCLI() {
  program
    .name('check-exports')
    .description('Export consistency check CLI tool')
    .version('1.0.0');

  // Scan command
  program
    .command('scan')
    .description('Scan export consistency issues')
    .option('-j, --json', 'Output results in JSON format')
    .action((options) => {
      const passed = scanMode(options);
      process.exit(passed ? 0 : 1);
    });

  // Fix command
  program
    .command('fix')
    .description('Automatically fix export consistency issues')
    .option('-d, --dry-run', 'Dry run mode, only show fixes to be made')
    .action((options) => {
      const success = fixMode(options);
      process.exit(success ? 0 : 1);
    });

  // Report command
  program
    .command('report')
    .description('Generate export consistency report')
    .option('-f, --format <type>', 'Output format (console, json, html)', 'console')
    .option('-o, --output <file>', 'Output file path')
    .action((options) => {
      reportMode(options);
    });

  // Default command (backward compatibility)
  if (process.argv.length === 2) {
    const passed = scanMode();
    process.exit(passed ? 0 : 1);
  }

  // Handle lint-staged case where files are passed as arguments
  if (process.argv.length > 2 && !process.argv.some(arg => arg.startsWith('-'))) {
    // Files are passed as arguments, run scan mode
    const passed = scanMode();
    process.exit(passed ? 0 : 1);
  }

  program.parse();
}

// If running this script directly
if (import.meta.url === pathToFileURL(__filename).href) {
  setupCLI();
}

export {
  checkTypeScriptErrors,
  checkESLintErrors,
  scanDuplicateExports
};