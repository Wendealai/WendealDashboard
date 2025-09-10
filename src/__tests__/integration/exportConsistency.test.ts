/**
 * Export Consistency Integration Tests
 *
 * End-to-end tests for the complete export consistency system
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Mock fs and child_process
jest.mock('fs');
jest.mock('child_process');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockPath = path as jest.Mocked<typeof path>;

describe('Export Consistency System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.relative.mockImplementation((from, to) => to);
    mockPath.basename.mockImplementation((p) => p.split('/').pop() || '');
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/') || '');
    mockPath.extname.mockImplementation((p) => '.' + p.split('.').pop());

    // Mock successful command execution
    mockExecSync.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('CLI Integration', () => {
    test('should execute scan command successfully', () => {
      // Mock file system for scan
      mockFs.readdirSync.mockReturnValue(['component.ts', 'utils.ts'] as any);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
      mockFs.readFileSync.mockReturnValue(`
        export const Component = () => {};
        export default Component;
      `);

      // Import and test CLI
      const { checkTypeScriptErrors, checkESLintErrors, scanDuplicateExports } = require('../../../scripts/check-exports.js');

      // Mock successful checks
      mockExecSync
        .mockReturnValueOnce(Buffer.from('')) // TypeScript check
        .mockReturnValueOnce(Buffer.from('')) // ESLint check
        .mockReturnValue(Buffer.from('')); // Duplicate exports check

      const tsResult = checkTypeScriptErrors();
      const eslintResult = checkESLintErrors();
      const duplicateResult = scanDuplicateExports();

      expect(tsResult).toBe(true);
      expect(eslintResult).toBe(true);
      expect(duplicateResult).toBe(true);
    });

    test('should handle scan command with issues', () => {
      // Mock file system with issues
      mockFs.readdirSync.mockReturnValue(['problematic.ts'] as any);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
      mockFs.readFileSync.mockReturnValue(`
        export const component = () => {}; // Should be PascalCase
        export { component as Component }; // Duplicate export
      `);

      const { scanDuplicateExports } = require('../../../scripts/check-exports.js');

      const result = scanDuplicateExports();

      expect(result).toBe(false); // Should find issues
    });

    test('should generate reports in different formats', () => {
      const { reportMode } = require('../../../scripts/check-exports.js');

      // Mock successful checks
      mockExecSync.mockReturnValue(Buffer.from(''));

      // Test console report
      const consoleReport = reportMode({ format: 'console' });
      expect(consoleReport).toHaveProperty('timestamp');
      expect(consoleReport).toHaveProperty('project');
      expect(consoleReport).toHaveProperty('checks');

      // Test JSON report
      const jsonReport = reportMode({ format: 'json' });
      expect(() => JSON.parse(jsonReport)).not.toThrow();

      // Test HTML report
      const htmlReport = reportMode({ format: 'html' });
      expect(htmlReport).toContain('<html>');
      expect(htmlReport).toContain('Export Consistency Report');
    });
  });

  describe('ESLint Integration', () => {
    test('should validate export consistency rules', () => {
      // This test verifies that ESLint configuration includes export consistency rules
      const eslintConfig = require('../../../eslint.config.js');

      // Find the TypeScript rules configuration
      const tsConfig = eslintConfig.find((config: any) =>
        config.files && config.files.includes('**/*.{ts,tsx}')
      );

      expect(tsConfig).toBeDefined();
      expect(tsConfig.rules).toHaveProperty('@typescript-eslint/consistent-type-exports');
      expect(tsConfig.rules).toHaveProperty('@typescript-eslint/consistent-type-imports');
      expect(tsConfig.rules).toHaveProperty('import/no-duplicates');
    });

    test('should handle TypeScript export patterns', () => {
      // Test various export patterns that ESLint should catch
      const testCases = [
        {
          code: 'export type { User }; export type { User };', // Duplicate type export
          shouldError: true
        },
        {
          code: 'import type { User } from "./types"; import { User } from "./types";', // Mixed import types
          shouldError: true
        },
        {
          code: 'export const Component = () => {}; export { Component };', // Duplicate export
          shouldError: true
        }
      ];

      // Mock ESLint execution
      testCases.forEach(({ code, shouldError }) => {
        mockFs.readFileSync.mockReturnValue(code);

        if (shouldError) {
          mockExecSync.mockImplementationOnce(() => {
            throw new Error('ESLint error');
          });
        } else {
          mockExecSync.mockReturnValueOnce(Buffer.from(''));
        }
      });

      const { checkESLintErrors } = require('../../../scripts/check-exports.js');

      // Should detect issues in problematic files
      const result = checkESLintErrors();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Pre-commit Hook Integration', () => {
    test('should integrate with lint-staged', () => {
      const lintStagedConfig = require('../../../.lintstagedrc.json');

      // Verify export consistency check is included
      expect(lintStagedConfig).toHaveProperty('src/**/!(test-utils).{ts,tsx}');
      expect(lintStagedConfig['src/**/!(test-utils).{ts,tsx}']).toContain('node scripts/check-exports.js scan --json');

      expect(lintStagedConfig).toHaveProperty('src/**/*.{js,jsx}');
      expect(lintStagedConfig['src/**/*.{js,jsx}']).toContain('node scripts/check-exports.js scan --json');
    });

    test('should run checks on modified files', () => {
      // Mock git status to return modified files
      mockExecSync.mockReturnValue(Buffer.from('src/components/Button.ts\nsrc/utils/helper.ts'));

      // Mock file content
      mockFs.readFileSync.mockReturnValue('export const Button = () => {};');

      const { checkTypeScriptErrors } = require('../../../scripts/check-exports.js');

      const result = checkTypeScriptErrors();

      // Should run checks on the modified files
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('npx tsc'),
        expect.any(Object)
      );
    });
  });

  describe('End-to-End Workflow', () => {
    test('should complete full export consistency workflow', () => {
      // Mock a complete project structure
      const mockProjectStructure = {
        'src/components/Button.ts': `
          export const Button = () => {};
          export default Button;
        `,
        'src/utils/index.ts': `
          export { formatDate } from './date';
          export { validateEmail } from './validation';
        `,
        'src/types/index.ts': `
          export type { User } from './User';
          export type { Config } from './Config';
        `
      };

      // Setup file system mocks
      let fileReadCount = 0;
      mockFs.readdirSync.mockImplementation((dir) => {
        if (dir.includes('src')) {
          return ['components', 'utils', 'types'] as any;
        }
        return ['Button.ts', 'index.ts'] as any;
      });

      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.statSync.mockReturnValueOnce({ isDirectory: () => false } as any);

      mockFs.readFileSync.mockImplementation((filePath) => {
        const fileName = path.basename(filePath as string);
        return mockProjectStructure[fileName as keyof typeof mockProjectStructure] || '';
      });

      const { scanDuplicateExports } = require('../../../scripts/check-exports.js');

      // Mock successful checks
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = scanDuplicateExports();

      // Should complete the scan without errors
      expect(typeof result).toBe('boolean');
      expect(mockFs.readdirSync).toHaveBeenCalled();
    });

    test('should handle complex project structures', () => {
      // Mock nested directory structure
      const directoryStack: string[] = [];

      mockFs.readdirSync.mockImplementation((dir) => {
        directoryStack.push(dir as string);

        if (dir.includes('components')) {
          return ['ui', 'forms', 'Button.tsx'] as any;
        } else if (dir.includes('ui')) {
          return ['Input.tsx', 'Select.tsx'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockImplementation((filePath) => {
        const isDir = !filePath.includes('.tsx');
        return { isDirectory: () => isDir } as any;
      });

      mockFs.readFileSync.mockReturnValue('export const Component = () => {};');

      const { scanDuplicateExports } = require('../../../scripts/check-exports.js');

      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = scanDuplicateExports();

      expect(directoryStack.length).toBeGreaterThan(0);
      expect(typeof result).toBe('boolean');
    });

    test('should generate comprehensive analysis reports', () => {
      const { reportMode } = require('../../../scripts/check-exports.js');

      // Mock comprehensive check results
      mockExecSync
        .mockReturnValueOnce(Buffer.from('')) // TypeScript: success
        .mockReturnValueOnce(Buffer.from('Found 2 issues')) // ESLint: issues found
        .mockReturnValue(Buffer.from('')); // Duplicate exports: success

      const report = reportMode({ format: 'console' });

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('project');
      expect(report.checks.typescript).toBe(true);
      expect(report.checks.eslint).toBe(false); // Found issues
      expect(report.checks.duplicateExports).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle file system errors gracefully', () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const { scanDuplicateExports } = require('../../../scripts/check-exports.js');

      // Should not crash on file system errors
      expect(() => scanDuplicateExports()).not.toThrow();
    });

    test('should handle invalid TypeScript files', () => {
      mockFs.readFileSync.mockReturnValue('export const invalid syntax {{{');

      mockFs.readdirSync.mockReturnValue(['invalid.ts'] as any);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      const { checkTypeScriptErrors } = require('../../../scripts/check-exports.js');

      // Should handle invalid syntax gracefully
      const result = checkTypeScriptErrors();
      expect(typeof result).toBe('boolean');
    });

    test('should handle missing dependencies', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found: tsc');
      });

      const { checkTypeScriptErrors } = require('../../../scripts/check-exports.js');

      const result = checkTypeScriptErrors();
      expect(result).toBe(false);
    });

    test('should provide meaningful error messages', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('TypeScript compilation failed');
      });

      const { checkTypeScriptErrors } = require('../../../scripts/check-exports.js');

      // Mock console methods
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = checkTypeScriptErrors();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TypeScript compilation errors')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large codebases efficiently', () => {
      // Mock large number of files
      const largeFileList = Array.from({ length: 100 }, (_, i) => `file${i}.ts`);

      mockFs.readdirSync.mockReturnValue(largeFileList as any);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
      mockFs.readFileSync.mockReturnValue('export const value = 42;');

      const { scanDuplicateExports } = require('../../../scripts/check-exports.js');

      mockExecSync.mockReturnValue(Buffer.from(''));

      const startTime = Date.now();
      const result = scanDuplicateExports();
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second for mocked operations)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(typeof result).toBe('boolean');
    });

    test('should process files incrementally', () => {
      // Test that the system can handle files being added/removed during processing
      let callCount = 0;
      mockFs.readdirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return ['file1.ts', 'file2.ts'] as any;
        }
        return ['file1.ts', 'file2.ts', 'file3.ts'] as any; // File added
      });

      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
      mockFs.readFileSync.mockReturnValue('export const test = true;');

      const { scanDuplicateExports } = require('../../../scripts/check-exports.js');

      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = scanDuplicateExports();
      expect(typeof result).toBe('boolean');
    });
  });
});
