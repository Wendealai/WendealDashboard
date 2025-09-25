import { ExportAnalyzer } from '../../../utils/diagnostic/ExportAnalyzer';
import type {
  ExportInfo,
  ExportIssue,
  DiagnosticConfig,
} from '../../../types/exportDiagnostic';
import {
  ExportIssueType,
  IssueSeverity,
} from '../../../types/exportDiagnostic';

describe('ExportAnalyzer', () => {
  let analyzer: ExportAnalyzer;
  let config: DiagnosticConfig;

  beforeEach(() => {
    config = {
      filePatterns: ['**/*.{ts,tsx,js,jsx}'],
      ignorePatterns: ['**/node_modules/**'],
      maxDepth: 10,
      timeout: 30000,
      enableCache: true,
      cacheExpiry: 5 * 60 * 1000,
      severityThreshold: 'info' as any,
    };
    analyzer = new ExportAnalyzer(config);
  });

  describe('analyzeExports', () => {
    it('should analyze exports and find issues', () => {
      const mockExports: ExportInfo[] = [
        {
          name: 'usedExport',
          type: 'named',
          location: {
            filePath: '/project/src/index.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export const usedExport = 1;',
          },
          isUsed: true,
          referenceCount: 5,
          lastModified: new Date(),
        },
        {
          name: 'unusedExport',
          type: 'named',
          location: {
            filePath: '/project/src/index.ts',
            line: 2,
            column: 0,
            codeSnippet: 'export const unusedExport = 2;',
          },
          isUsed: false,
          referenceCount: 0,
          lastModified: new Date(),
        },
      ];

      const issues = analyzer.analyzeExports(mockExports);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe(ExportIssueType.UNUSED_EXPORT);
      expect(issues[0].severity).toBe(IssueSeverity.WARNING);
    });

    it('should handle empty exports array', () => {
      const issues = analyzer.analyzeExports([]);

      expect(issues).toHaveLength(0);
    });

    it('should detect default export conflicts', () => {
      const mockExports: ExportInfo[] = [
        {
          name: 'default1',
          type: 'default',
          location: {
            filePath: '/project/src/index.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export default function() {};',
          },
          isUsed: true,
          referenceCount: 1,
          lastModified: new Date(),
        },
        {
          name: 'default2',
          type: 'default',
          location: {
            filePath: '/project/src/index.ts',
            line: 2,
            column: 0,
            codeSnippet: 'export default class {};',
          },
          isUsed: true,
          referenceCount: 1,
          lastModified: new Date(),
        },
      ];

      const issues = analyzer.analyzeExports(mockExports);

      expect(
        issues.some(
          issue => issue.type === ExportIssueType.DEFAULT_EXPORT_CONFLICT
        )
      ).toBe(true);
    });
  });

  describe('getAnalysisStats', () => {
    it('should return analysis statistics', () => {
      const stats = analyzer.getAnalysisStats();

      expect(stats).toHaveProperty('totalExports');
      expect(stats).toHaveProperty('issuesFound');
      expect(stats).toHaveProperty('issuesByType');
      expect(stats).toHaveProperty('issuesBySeverity');
    });
  });
});
