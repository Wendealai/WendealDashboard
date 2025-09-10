#!/usr/bin/env node

/**
 * Codebase Analysis Script
 *
 * Runs comprehensive analysis of the codebase to identify issues
 * that need to be addressed during cleanup.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class CodebaseAnalyzer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.config = {
      includePatterns: ['**/*.{ts,tsx,js,jsx}'],
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/*.d.ts',
        '**/coverage/**',
        '**/.next/**'
      ],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };
  }

  async analyze() {
    console.log('🔍 Starting comprehensive codebase analysis...');
    const startTime = Date.now();

    // Get files to analyze
    const files = this.getFilesToAnalyze();
    console.log(`📁 Found ${files.length} files to analyze`);

    // Run TypeScript check
    console.log('🔧 Running TypeScript compilation check...');
    const tsErrors = this.checkTypeScriptErrors();
    console.log(`⚠️ Found ${tsErrors.length} TypeScript errors`);

    // Check for unused files
    console.log('🔍 Analyzing file usage...');
    const unusedFiles = this.findUnusedFiles(files);
    console.log(`🗑️ Found ${unusedFiles.length} potentially unused files`);

    // Check for console.log statements
    console.log('🔍 Checking for debug statements...');
    const debugStatements = this.findDebugStatements(files);
    console.log(`🐛 Found ${debugStatements.length} debug console.log statements`);

    // Check for unused imports (basic)
    console.log('🔍 Checking for unused imports...');
    const unusedImports = this.findUnusedImports(files);
    console.log(`📦 Found ${unusedImports.length} unused import statements`);

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      filesAnalyzed: files.length,
      issuesFound: {
        typescriptErrors: tsErrors.length,
        unusedFiles: unusedFiles.length,
        debugStatements: debugStatements.length,
        unusedImports: unusedImports.length
      },
      details: {
        typescriptErrors: tsErrors.slice(0, 10), // First 10 errors
        unusedFiles: unusedFiles.slice(0, 20), // First 20 unused files
        debugStatements: debugStatements.slice(0, 10), // First 10 debug statements
        unusedImports: unusedImports.slice(0, 10) // First 10 unused imports
      }
    };

    // Save report
    const reportPath = path.join(this.projectRoot, 'reports/cleanup/analysis-report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Analysis report saved to: ${reportPath}`);

    // Print summary
    console.log('\n📋 Analysis Summary:');
    console.log(`⏱️ Analysis took: ${report.duration}ms`);
    console.log(`📁 Files analyzed: ${report.filesAnalyzed}`);
    console.log(`⚠️ TypeScript errors: ${report.issuesFound.typescriptErrors}`);
    console.log(`🗑️ Unused files: ${report.issuesFound.unusedFiles}`);
    console.log(`🐛 Debug statements: ${report.issuesFound.debugStatements}`);
    console.log(`📦 Unused imports: ${report.issuesFound.unusedImports}`);

    return report;
  }

  getFilesToAnalyze() {
    const files = [];

    const walkDirectory = (dir) => {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!this.shouldExclude(fullPath)) {
              walkDirectory(fullPath);
            }
          } else if (stat.isFile()) {
            if (this.shouldInclude(fullPath) && stat.size <= this.config.maxFileSize) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}:`, error.message);
      }
    };

    walkDirectory(this.projectRoot);
    return files;
  }

  shouldInclude(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return false;
    }

    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return false;
      }
    }

    return true;
  }

  shouldExclude(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);

    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  matchesPattern(str, pattern) {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    return new RegExp(`^${regex}$`).test(str);
  }

  checkTypeScriptErrors() {
    const errors = [];

    try {
      const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        try {
          execSync('npx tsc --noEmit --skipLibCheck', {
            cwd: this.projectRoot,
            stdio: 'pipe'
          });
        } catch (error) {
          const output = error.stdout?.toString() || error.stderr?.toString() || '';
          const lines = output.split('\n').filter(line => line.trim());

          for (const line of lines) {
            const match = line.match(/(.+?)\((\d+),(\d+)\):\s*(error|warning)\s*TS(\d+):\s*(.+)/);
            if (match) {
              const [, file, lineNum, colNum, , code, message] = match;
              errors.push({
                file: path.resolve(file),
                line: parseInt(lineNum),
                column: parseInt(colNum),
                message: message.trim(),
                code: `TS${code}`
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not run TypeScript compiler:', error.message);
    }

    return errors;
  }

  findUnusedFiles(files) {
    const unusedFiles = [];

    // This is a basic check - in a real implementation, you'd use
    // static analysis to determine actual usage
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');

        // Skip files that are clearly entry points
        if (file.includes('index.') || file.includes('main.') ||
            file.includes('App.') || content.includes('export default')) {
          continue;
        }

        // Check if file is imported anywhere
        let isUsed = false;
        const fileName = path.basename(file, path.extname(file));

        for (const otherFile of files) {
          if (otherFile !== file) {
            try {
              const otherContent = fs.readFileSync(otherFile, 'utf-8');
              if (otherContent.includes(fileName) ||
                  otherContent.includes(`./${fileName}`) ||
                  otherContent.includes(`../${fileName}`)) {
                isUsed = true;
                break;
              }
            } catch (e) {
              // Ignore read errors
            }
          }
        }

        if (!isUsed) {
          unusedFiles.push(file);
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}:`, error.message);
      }
    }

    return unusedFiles;
  }

  findDebugStatements(files) {
    const debugStatements = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes('console.log') && !line.includes('return')) {
            debugStatements.push({
              file,
              line: i + 1,
              content: line
            });
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}:`, error.message);
      }
    }

    return debugStatements;
  }

  findUnusedImports(files) {
    const unusedImports = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');

        // Find import statements
        const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          const [, imports, modulePath] = match;
          const importedItems = imports.split(',').map(item => item.trim().split(' as ')[0]);

          // Check if imported items are used
          const unusedItems = [];
          for (const item of importedItems) {
            if (item && !content.includes(item.trim())) {
              unusedItems.push(item.trim());
            }
          }

          if (unusedItems.length > 0) {
            unusedImports.push({
              file,
              unusedItems,
              module: modulePath
            });
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}:`, error.message);
      }
    }

    return unusedImports;
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new CodebaseAnalyzer();
  analyzer.analyze()
    .then(() => {
      console.log('✅ Analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

export default CodebaseAnalyzer;
