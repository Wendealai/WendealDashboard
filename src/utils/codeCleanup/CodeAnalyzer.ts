/**
 * Code Analyzer Tool
 *
 * Performs comprehensive analysis of the codebase to identify syntax errors,
 * unused imports, dead code, and other code quality issues. This tool serves
 * as the foundation for the code cleanup process.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  CleanupAnalysis,
  CleanupRecommendation,
  SyntaxError,
  UnusedImport,
  DeadCodeResult,
  FileAnalysis,
  RiskLevel
} from './types';

/**
 * Code Analyzer Class
 * Provides comprehensive codebase analysis functionality
 */
export class CodeAnalyzer {
  private readonly projectRoot: string;
  private readonly config: {
    includePatterns: string[];
    excludePatterns: string[];
    maxFileSize: number;
  };

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.config = {
      includePatterns: ['**/*.{ts,tsx,js,jsx}'],
      excludePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/*.d.ts'
      ],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };
  }

  /**
   * Perform comprehensive codebase analysis
   * @param patterns - File patterns to analyze
   * @returns Analysis results
   */
  async analyzeCodebase(patterns?: string[]): Promise<CleanupAnalysis> {
    const startTime = Date.now();
    const includePatterns = patterns || this.config.includePatterns;

    console.log('🔍 Starting codebase analysis...');

    // Get all files to analyze
    const files = await this.getFilesToAnalyze(includePatterns);
    console.log(`📁 Found ${files.length} files to analyze`);

    // Perform different types of analysis
    const syntaxErrors = await this.detectSyntaxErrors(files);
    const unusedImports = await this.findUnusedImports(files);
    const deadCodeResult = await this.analyzeDeadCode(files);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      syntaxErrors,
      unusedImports,
      deadCodeResult,
      files.length
    );

    // Assess overall risk
    const riskAssessment = this.assessRiskLevel(
      syntaxErrors.length,
      unusedImports.length,
      deadCodeResult.totalDeadLines
    );

    const analysis: CleanupAnalysis = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      filesAnalyzed: files.length,
      issuesFound: {
        syntaxErrors: syntaxErrors.length,
        unusedImports: unusedImports.length,
        deadCode: deadCodeResult.totalDeadLines,
        unusedFiles: deadCodeResult.files.filter(f => f.deadLines === 0).length,
        circularDeps: 0 // TODO: Implement circular dependency detection
      },
      recommendations,
      riskAssessment
    };

    console.log('✅ Codebase analysis completed');
    console.log(`⏱️ Analysis took ${analysis.duration}ms`);
    console.log(`🔍 Found ${analysis.issuesFound.syntaxErrors} syntax errors`);
    console.log(`📦 Found ${analysis.issuesFound.unusedImports} unused imports`);
    console.log(`💀 Found ${analysis.issuesFound.deadCode} lines of dead code`);

    return analysis;
  }

  /**
   * Get files that should be analyzed
   * @param patterns - Include patterns
   * @returns Array of file paths
   */
  private async getFilesToAnalyze(patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    const walkDirectory = (dir: string): void => {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // Check if directory should be excluded
            if (!this.shouldExclude(fullPath)) {
              walkDirectory(fullPath);
            }
          } else if (stat.isFile()) {
            // Check if file matches include patterns and size limit
            if (this.shouldInclude(fullPath) && stat.size <= this.config.maxFileSize) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}:`, error);
      }
    };

    walkDirectory(this.projectRoot);
    return files;
  }

  /**
   * Check if path should be included in analysis
   * @param filePath - File path to check
   * @returns Whether to include the file
   */
  private shouldInclude(filePath: string): boolean {
    const relativePath = path.relative(this.projectRoot, filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Check file extension
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.includePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if path should be excluded
   * @param filePath - File path to check
   * @returns Whether to exclude the path
   */
  private shouldExclude(filePath: string): boolean {
    const relativePath = path.relative(this.projectRoot, filePath);

    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching (supports * and ** wildcards)
   * @param str - String to match
   * @param pattern - Pattern to match against
   * @returns Whether the pattern matches
   */
  private matchesPattern(str: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    return new RegExp(`^${regex}$`).test(str);
  }

  /**
   * Detect syntax and type errors in files
   * @param files - Files to analyze
   * @returns Array of syntax errors
   */
  private async detectSyntaxErrors(files: string[]): Promise<SyntaxError[]> {
    const errors: SyntaxError[] = [];

    try {
      // Run TypeScript compiler to check for errors
      const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        try {
          execSync('npx tsc --noEmit --skipLibCheck', {
            cwd: this.projectRoot,
            stdio: 'pipe'
          });
        } catch (error: any) {
          // Parse TypeScript errors
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
                code: `TS${code}`,
                fixable: this.isFixableError(`TS${code}`)
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not run TypeScript compiler:', error);
    }

    // Additional syntax checking could be added here
    // For example: ESLint, Prettier checks, etc.

    return errors;
  }

  /**
   * Check if a TypeScript error is fixable
   * @param errorCode - TypeScript error code
   * @returns Whether the error is fixable
   */
  private isFixableError(errorCode: string): boolean {
    const fixableErrors = [
      'TS2304', // Cannot find name
      'TS2307', // Cannot find module
      'TS2322', // Type mismatch
      'TS2339', // Property does not exist
      'TS2345', // Argument type mismatch
      'TS2451', // Cannot redeclare block-scoped variable
      'TS6133', // Variable declared but never used
      'TS6138', // Property declared but never used
    ];

    return fixableErrors.includes(errorCode);
  }

  /**
   * Find unused import statements
   * @param files - Files to analyze
   * @returns Array of unused imports
   */
  private async findUnusedImports(files: string[]): Promise<UnusedImport[]> {
    const unusedImports: UnusedImport[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Simple regex-based import detection
        // This is a basic implementation - a more sophisticated AST-based
        // analysis would be better for production use
        const importMatches = content.match(/import\s+.*?\s+from\s+['"][^'"]+['"]/g) || [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith('import')) {
            // Basic check for unused imports
            // This is a simplified version - production implementation would
            // use TypeScript compiler API for more accurate analysis
            const importMatch = line.match(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
            if (importMatch) {
              const [, imports, modulePath] = importMatch;
              const importedItems = imports.split(',').map(item => item.trim().split(' as ')[0]);

              // Check if imported items are used in the file
              const unusedItems: string[] = [];
              for (const item of importedItems) {
                if (item && !content.includes(item)) {
                  unusedItems.push(item);
                }
              }

              if (unusedItems.length > 0) {
                unusedImports.push({
                  file,
                  importStatement: line,
                  unusedIdentifiers: unusedItems,
                  line: i + 1,
                  safeToRemove: unusedItems.length === importedItems.length
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}:`, error);
      }
    }

    return unusedImports;
  }

  /**
   * Analyze dead code in files
   * @param files - Files to analyze
   * @returns Dead code analysis result
   */
  private async analyzeDeadCode(files: string[]): Promise<DeadCodeResult> {
    const deadCodeFiles: any[] = [];
    let totalDeadLines = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const deadRegions: any[] = [];
        let deadLines = 0;

        // Simple dead code detection
        // This is a basic implementation - production version would use
        // more sophisticated static analysis
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Skip empty lines and comments
          if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
            continue;
          }

          // Check for obviously dead code patterns
          if (line.includes('console.log') && !line.includes('return')) {
            deadRegions.push({
              startLine: i + 1,
              endLine: i + 1,
              content: line,
              reason: 'Debug console.log statement'
            });
            deadLines++;
          }

          // Check for unused variables (very basic)
          if (line.match(/^(const|let|var)\s+\w+\s*=\s*.*$/) && !line.includes('export')) {
            const varMatch = line.match(/^(const|let|var)\s+(\w+)/);
            if (varMatch) {
              const varName = varMatch[2];
              const remainingContent = lines.slice(i + 1).join('\n');
              if (!remainingContent.includes(varName)) {
                deadRegions.push({
                  startLine: i + 1,
                  endLine: i + 1,
                  content: line,
                  reason: 'Unused variable declaration'
                });
                deadLines++;
              }
            }
          }
        }

        if (deadLines > 0) {
          deadCodeFiles.push({
            file,
            deadRegions,
            deadLines
          });
          totalDeadLines += deadLines;
        }
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file} for dead code:`, error);
      }
    }

    return {
      files: deadCodeFiles,
      totalDeadLines,
      deadCodePercentage: files.length > 0 ? (totalDeadLines / files.reduce((sum, f) => {
        try {
          return sum + fs.readFileSync(f, 'utf-8').split('\n').length;
        } catch {
          return sum;
        }
      }, 0)) * 100 : 0
    };
  }

  /**
   * Generate cleanup recommendations based on analysis results
   * @param syntaxErrors - Syntax errors found
   * @param unusedImports - Unused imports found
   * @param deadCode - Dead code analysis
   * @param totalFiles - Total files analyzed
   * @returns Array of recommendations
   */
  private generateRecommendations(
    syntaxErrors: SyntaxError[],
    unusedImports: UnusedImport[],
    deadCode: DeadCodeResult,
    totalFiles: number
  ): CleanupRecommendation[] {
    const recommendations: CleanupRecommendation[] = [];

    // Syntax error recommendations
    if (syntaxErrors.length > 0) {
      recommendations.push({
        id: 'fix-syntax-errors',
        type: 'fix',
        file: 'multiple',
        description: `Fix ${syntaxErrors.length} syntax and type errors`,
        severity: syntaxErrors.length > 10 ? 'high' : 'medium',
        automated: syntaxErrors.every(e => e.fixable),
        impact: 'Improve code reliability and build stability'
      });
    }

    // Unused imports recommendations
    if (unusedImports.length > 0) {
      recommendations.push({
        id: 'remove-unused-imports',
        type: 'remove',
        file: 'multiple',
        description: `Remove ${unusedImports.length} unused import statements`,
        severity: unusedImports.length > 20 ? 'medium' : 'low',
        automated: true,
        impact: 'Reduce bundle size and improve code clarity'
      });
    }

    // Dead code recommendations
    if (deadCode.totalDeadLines > 0) {
      recommendations.push({
        id: 'remove-dead-code',
        type: 'remove',
        file: 'multiple',
        description: `Remove ${deadCode.totalDeadLines} lines of dead code`,
        severity: deadCode.deadCodePercentage > 10 ? 'medium' : 'low',
        automated: false, // Requires manual review
        impact: 'Improve maintainability and reduce complexity'
      });
    }

    return recommendations;
  }

  /**
   * Assess overall risk level based on issues found
   * @param syntaxErrors - Number of syntax errors
   * @param unusedImports - Number of unused imports
   * @param deadLines - Number of dead code lines
   * @returns Risk level
   */
  private assessRiskLevel(syntaxErrors: number, unusedImports: number, deadLines: number): RiskLevel {
    if (syntaxErrors > 50 || deadLines > 1000) {
      return 'critical';
    } else if (syntaxErrors > 20 || deadLines > 500) {
      return 'high';
    } else if (syntaxErrors > 5 || deadLines > 100) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

