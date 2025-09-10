/**
 * Export Consistency Utilities Unit Tests
 *
 * Comprehensive tests for export consistency analysis tools
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ExportConfig } from '../../utils/exportConfig';
import { ExportDetector } from '../../utils/exportDetector';
import { ConsistencyAnalyzer } from '../../utils/consistencyAnalyzer';
import { AutoFixer } from '../../utils/autoFixer';
import { ReportGenerator } from '../../utils/reportGenerator';
import type {
  ExportInfo,
  ConsistencyIssue,
  ProjectAnalysisResult,
  FixSuggestion
} from '../../utils/export';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('Export Consistency System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.relative.mockImplementation((from, to) => to);
    mockPath.basename.mockImplementation((p) => p.split('/').pop() || '');
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/') || '');
    mockPath.extname.mockImplementation((p) => '.' + p.split('.').pop());
  });

  describe('ExportConfig', () => {
    test('should load default configuration', () => {
      const config = new ExportConfig();

      expect(config.getConfig()).toHaveProperty('patterns');
      expect(config.getConfig()).toHaveProperty('rules');
      expect(config.getConfig()).toHaveProperty('ignore');
    });

    test('should validate configuration rules', () => {
      const config = new ExportConfig();

      const validRule = {
        name: 'consistent-export-names',
        severity: 'error' as const,
        enabled: true
      };

      expect(() => config.validateRule(validRule)).not.toThrow();

      const invalidRule = {
        name: '',
        severity: 'invalid' as any,
        enabled: true
      };

      expect(() => config.validateRule(invalidRule)).toThrow();
    });

    test('should merge custom configuration', () => {
      const config = new ExportConfig();

      const customConfig = {
        patterns: ['**/*.custom.ts'],
        rules: {
          'custom-rule': {
            name: 'custom-rule',
            severity: 'warn' as const,
            enabled: true
          }
        }
      };

      const merged = config.mergeConfig(customConfig);

      expect(merged.patterns).toContain('**/*.custom.ts');
      expect(merged.rules).toHaveProperty('custom-rule');
    });
  });

  describe('ExportDetector', () => {
    let detector: ExportDetector;

    beforeEach(() => {
      detector = new ExportDetector();
    });

    test('should detect named exports', () => {
      const code = `
        export const Component1 = () => {};
        export const Component2 = () => {};
        export { helper } from './helper';
      `;

      const exports = detector.detectExports(code, 'test.ts');

      expect(exports.namedExports).toHaveLength(3);
      expect(exports.namedExports).toContainEqual(
        expect.objectContaining({ name: 'Component1', type: 'declaration' })
      );
    });

    test('should detect default exports', () => {
      const code = `
        const Component = () => {};
        export default Component;
      `;

      const exports = detector.detectExports(code, 'test.tsx');

      expect(exports.defaultExport).toBe('Component');
      expect(exports.namedExports).toHaveLength(0);
    });

    test('should detect re-exports', () => {
      const code = `
        export { Component } from './Component';
        export * from './utils';
      `;

      const exports = detector.detectExports(code, 'index.ts');

      expect(exports.reExports).toHaveLength(1);
      expect(exports.starExports).toHaveLength(1);
    });

    test('should handle TypeScript type exports', () => {
      const code = `
        export type { User, Config };
        export interface Settings {}
      `;

      const exports = detector.detectExports(code, 'types.ts');

      expect(exports.typeExports).toHaveLength(2);
      expect(exports.namedExports).toContainEqual(
        expect.objectContaining({ name: 'Settings', type: 'interface' })
      );
    });

    test('should detect mixed export patterns', () => {
      const code = `
        export const CONSTANT = 'value';
        export type { User };
        export { default as MainComponent } from './Main';
        export default function App() {}
      `;

      const exports = detector.detectExports(code, 'mixed.ts');

      expect(exports.namedExports).toHaveLength(1);
      expect(exports.typeExports).toHaveLength(1);
      expect(exports.reExports).toHaveLength(1);
      expect(exports.defaultExport).toBe('App');
    });
  });

  describe('ConsistencyAnalyzer', () => {
    let analyzer: ConsistencyAnalyzer;

    beforeEach(() => {
      analyzer = new ConsistencyAnalyzer();
    });

    test('should identify naming convention issues', () => {
      const exports: ExportInfo[] = [
        {
          file: 'src/components/button.ts',
          namedExports: [{ name: 'btn', type: 'declaration' }],
          defaultExport: null,
          reExports: [],
          starExports: [],
          typeExports: []
        }
      ];

      const issues = analyzer.analyzeNamingConvention(exports);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('naming-convention');
      expect(issues[0].severity).toBe('warn');
    });

    test('should detect export-import mismatches', () => {
      const exports: ExportInfo[] = [
        {
          file: 'src/utils/index.ts',
          namedExports: [{ name: 'formatDate', type: 're-export' }],
          defaultExport: null,
          reExports: [],
          starExports: [],
          typeExports: []
        }
      ];

      // Mock file system for import analysis
      mockFs.readFileSync.mockReturnValue(`
        import { formatDate } from './utils';
        import { wrongName } from './utils';
      `);

      const issues = analyzer.analyzeImportConsistency(exports);

      expect(issues.some(issue => issue.type === 'import-mismatch')).toBe(true);
    });

    test('should identify circular dependencies', () => {
      const exports: ExportInfo[] = [
        {
          file: 'src/a.ts',
          namedExports: [],
          defaultExport: null,
          reExports: [],
          starExports: [],
          typeExports: []
        },
        {
          file: 'src/b.ts',
          namedExports: [],
          defaultExport: null,
          reExports: [],
          starExports: [],
          typeExports: []
        }
      ];

      // Mock circular imports
      mockFs.readFileSync
        .mockReturnValueOnce("import { b } from './b'")
        .mockReturnValueOnce("import { a } from './a'");

      const issues = analyzer.analyzeCircularDependencies(exports);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('circular-dependency');
    });

    test('should validate export accessibility', () => {
      const exports: ExportInfo[] = [
        {
          file: 'src/internal/utils.ts',
          namedExports: [{ name: 'internalFunction', type: 'declaration' }],
          defaultExport: null,
          reExports: [],
          starExports: [],
          typeExports: []
        }
      ];

      const issues = analyzer.analyzeAccessibility(exports);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('accessibility-violation');
    });
  });

  describe('AutoFixer', () => {
    let fixer: AutoFixer;

    beforeEach(() => {
      fixer = new AutoFixer();
    });

    test('should generate naming convention fixes', () => {
      const issue: ConsistencyIssue = {
        id: 'naming-1',
        type: 'naming-convention',
        severity: 'warn',
        file: 'src/components/btn.ts',
        line: 1,
        message: 'Component name should be PascalCase',
        suggestion: 'Rename to Button'
      };

      const fix = fixer.generateFix(issue);

      expect(fix).toHaveProperty('type', 'rename');
      expect(fix).toHaveProperty('oldName', 'btn');
      expect(fix).toHaveProperty('newName', 'Button');
    });

    test('should generate import path fixes', () => {
      const issue: ConsistencyIssue = {
        id: 'import-1',
        type: 'import-mismatch',
        severity: 'error',
        file: 'src/components/Component.tsx',
        line: 5,
        message: 'Import path should be relative',
        suggestion: 'Change to ./Button'
      };

      const fix = fixer.generateFix(issue);

      expect(fix).toHaveProperty('type', 'update-import');
      expect(fix).toHaveProperty('newPath', './Button');
    });

    test('should apply fixes in dry-run mode', () => {
      const fixes: FixSuggestion[] = [
        {
          id: 'fix-1',
          type: 'rename',
          file: 'src/components/btn.ts',
          oldName: 'btn',
          newName: 'Button',
          line: 1
        }
      ];

      const result = fixer.applyFixes(fixes, true); // dry-run

      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.dryRunResults).toHaveLength(1);
    });

    test('should handle fix conflicts', () => {
      const conflictingFixes: FixSuggestion[] = [
        {
          id: 'fix-1',
          type: 'rename',
          file: 'src/components/Component.ts',
          oldName: 'oldName',
          newName: 'NewName',
          line: 1
        },
        {
          id: 'fix-2',
          type: 'rename',
          file: 'src/components/Component.ts',
          oldName: 'oldName',
          newName: 'DifferentName',
          line: 1
        }
      ];

      const result = fixer.applyFixes(conflictingFixes, false);

      expect(result.conflicts).toHaveLength(1);
      expect(result.applied).toHaveLength(0);
    });
  });

  describe('ReportGenerator', () => {
    let reporter: ReportGenerator;

    beforeEach(() => {
      reporter = new ReportGenerator();
    });

    test('should generate summary report', () => {
      const analysisResult: ProjectAnalysisResult = {
        timestamp: new Date().toISOString(),
        projectName: 'test-project',
        filesAnalyzed: 10,
        totalExports: 25,
        issues: [
          {
            id: 'issue-1',
            type: 'naming-convention',
            severity: 'warn',
            file: 'src/components/Button.ts',
            line: 1,
            message: 'Component should be PascalCase',
            suggestion: 'Rename to Button'
          },
          {
            id: 'issue-2',
            type: 'import-mismatch',
            severity: 'error',
            file: 'src/pages/Home.tsx',
            line: 5,
            message: 'Import path incorrect',
            suggestion: 'Use relative path'
          }
        ],
        statistics: {
          errors: 1,
          warnings: 1,
          suggestions: 0,
          filesWithIssues: 2
        }
      };

      const report = reporter.generateSummary(analysisResult);

      expect(report).toContain('test-project');
      expect(report).toContain('10 files');
      expect(report).toContain('25 exports');
      expect(report).toContain('2 issues');
    });

    test('should generate detailed report', () => {
      const analysisResult: ProjectAnalysisResult = {
        timestamp: new Date().toISOString(),
        projectName: 'test-project',
        filesAnalyzed: 5,
        totalExports: 12,
        issues: [
          {
            id: 'detail-1',
            type: 'circular-dependency',
            severity: 'error',
            file: 'src/a.ts',
            line: 1,
            message: 'Circular dependency detected',
            suggestion: 'Refactor to break circular dependency'
          }
        ],
        statistics: {
          errors: 1,
          warnings: 0,
          suggestions: 0,
          filesWithIssues: 1
        }
      };

      const report = reporter.generateDetailed(analysisResult);

      expect(report).toContain('Circular dependency detected');
      expect(report).toContain('Refactor to break circular dependency');
      expect(report).toContain('src/a.ts:1');
    });

    test('should generate JSON report', () => {
      const analysisResult: ProjectAnalysisResult = {
        timestamp: new Date().toISOString(),
        projectName: 'test-project',
        filesAnalyzed: 3,
        totalExports: 8,
        issues: [],
        statistics: {
          errors: 0,
          warnings: 0,
          suggestions: 0,
          filesWithIssues: 0
        }
      };

      const report = reporter.generateJSON(analysisResult);

      expect(() => JSON.parse(report)).not.toThrow();

      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('projectName', 'test-project');
      expect(parsed).toHaveProperty('filesAnalyzed', 3);
    });

    test('should calculate severity statistics', () => {
      const issues: ConsistencyIssue[] = [
        {
          id: '1',
          type: 'naming-convention',
          severity: 'error',
          file: 'a.ts',
          line: 1,
          message: 'Error issue'
        },
        {
          id: '2',
          type: 'import-mismatch',
          severity: 'warn',
          file: 'b.ts',
          line: 2,
          message: 'Warning issue'
        },
        {
          id: '3',
          type: 'accessibility',
          severity: 'info',
          file: 'c.ts',
          line: 3,
          message: 'Info issue'
        }
      ];

      const stats = reporter.calculateSeverityStats(issues);

      expect(stats.errors).toBe(1);
      expect(stats.warnings).toBe(1);
      expect(stats.suggestions).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex export scenarios', () => {
      const detector = new ExportDetector();
      const analyzer = new ConsistencyAnalyzer();

      const complexCode = `
        // Mixed exports with different patterns
        export const CONSTANT = 'value';
        export type { User, Config as AppConfig };
        export { default as MainComponent, helper } from './Main';
        export default function App() {}
        export * from './utils';
        export { Component } from './Component';
      `;

      const exports = detector.detectExports(complexCode, 'complex.ts');

      expect(exports.namedExports).toHaveLength(1); // CONSTANT
      expect(exports.typeExports).toHaveLength(2); // User, Config
      expect(exports.reExports).toHaveLength(2); // MainComponent, Component
      expect(exports.starExports).toHaveLength(1); // utils
      expect(exports.defaultExport).toBe('App');

      const issues = analyzer.analyzeNamingConvention([exports]);
      // Should identify naming issues based on configured rules
      expect(Array.isArray(issues)).toBe(true);
    });

    test('should handle edge cases gracefully', () => {
      const detector = new ExportDetector();

      // Empty file
      const emptyExports = detector.detectExports('', 'empty.ts');
      expect(emptyExports.namedExports).toHaveLength(0);
      expect(emptyExports.defaultExport).toBeNull();

      // File with only comments
      const commentOnly = detector.detectExports('// Just a comment\n/* block comment */', 'comments.ts');
      expect(commentOnly.namedExports).toHaveLength(0);

      // File with syntax errors
      const invalidCode = detector.detectExports('export const invalid = { unclosed: bracket', 'invalid.ts');
      // Should handle gracefully without throwing
      expect(invalidCode).toBeDefined();
    });

    test('should support different file extensions', () => {
      const detector = new ExportDetector();

      const tsCode = 'export const value = 42;';
      const tsxCode = 'export const Component = () => <div />;';
      const jsCode = 'export const func = () => {};';

      const tsExports = detector.detectExports(tsCode, 'file.ts');
      const tsxExports = detector.detectExports(tsxCode, 'file.tsx');
      const jsExports = detector.detectExports(jsCode, 'file.js');

      expect(tsExports.namedExports).toHaveLength(1);
      expect(tsxExports.namedExports).toHaveLength(1);
      expect(jsExports.namedExports).toHaveLength(1);
    });
  });
});
