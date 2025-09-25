import { DiagnosticEngine } from '../../../utils/diagnostic/DiagnosticEngine';
import { FileScanner } from '../../../utils/diagnostic/FileScanner';
import { ExportAnalyzer } from '../../../utils/diagnostic/ExportAnalyzer';
import { FixSuggester } from '../../../utils/diagnostic/FixSuggester';
import { CacheManager } from '../../../utils/diagnostic/CacheManager';
import { ESLintIntegration } from '../../../utils/diagnostic/ESLintIntegration';
import { TypeScriptIntegration } from '../../../utils/diagnostic/TypeScriptIntegration';
import type {
  DiagnosticConfig,
  ScanOptions,
} from '../../../types/exportDiagnostic';

// Mock all dependencies
jest.mock('../../../utils/diagnostic/FileScanner');
jest.mock('../../../utils/diagnostic/ExportAnalyzer');
jest.mock('../../../utils/diagnostic/FixSuggester');
jest.mock('../../../utils/diagnostic/CacheManager');
jest.mock('../../../utils/diagnostic/ESLintIntegration');
jest.mock('../../../utils/diagnostic/TypeScriptIntegration');

const mockFileScanner = FileScanner as jest.MockedClass<typeof FileScanner>;
const mockExportAnalyzer = ExportAnalyzer as jest.MockedClass<
  typeof ExportAnalyzer
>;
const mockFixSuggester = FixSuggester as jest.MockedClass<typeof FixSuggester>;
const mockCacheManager = CacheManager as jest.MockedClass<typeof CacheManager>;
const mockESLintIntegration = ESLintIntegration as jest.MockedClass<
  typeof ESLintIntegration
>;
const mockTypeScriptIntegration = TypeScriptIntegration as jest.MockedClass<
  typeof TypeScriptIntegration
>;

describe('Export Diagnosis Integration', () => {
  let engine: DiagnosticEngine;
  let config: DiagnosticConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      filePatterns: ['**/*.{ts,tsx}'],
      ignorePatterns: ['**/node_modules/**'],
      maxDepth: 10,
      timeout: 30000,
      enableCache: true,
      cacheExpiry: 5 * 60 * 1000,
      severityThreshold: 'info' as any,
      typescriptConfig: {
        strict: false,
        checkTypeExports: true,
        target: 'ES2020',
      },
      eslintConfig: {
        enabled: true,
      },
    };

    // Setup mock instances
    mockFileScanner.mockImplementation(
      () =>
        ({
          scanDirectory: jest.fn(),
        }) as any
    );

    mockExportAnalyzer.mockImplementation(
      () =>
        ({
          analyzeExports: jest.fn(),
        }) as any
    );

    mockFixSuggester.mockImplementation(
      () =>
        ({
          suggestFixes: jest.fn(),
        }) as any
    );

    mockCacheManager.mockImplementation(
      () =>
        ({
          get: jest.fn(),
          set: jest.fn(),
        }) as any
    );

    mockESLintIntegration.mockImplementation(
      () =>
        ({
          analyzeFile: jest.fn(),
        }) as any
    );

    mockTypeScriptIntegration.mockImplementation(
      () =>
        ({
          analyzeFile: jest.fn(),
        }) as any
    );

    engine = new DiagnosticEngine(config);
  });

  describe('Full Diagnostic Workflow', () => {
    it('should execute complete diagnostic workflow', async () => {
      const mockExports = [
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
          referenceCount: 1,
          lastModified: new Date(),
        },
        {
          name: 'unusedExport',
          type: 'named',
          location: {
            filePath: '/project/src/utils.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export const unusedExport = 2;',
          },
          isUsed: false,
          referenceCount: 0,
          lastModified: new Date(),
        },
      ];

      const mockIssues = [
        {
          id: 'unused-export-test',
          type: 'UNUSED_EXPORT' as any,
          severity: 'WARNING' as any,
          description: 'Unused export found',
          location: mockExports[1].location,
          suggestions: [],
          detectedAt: new Date(),
        },
      ];

      const mockSuggestions = [
        {
          id: 'remove-unused',
          title: 'Remove unused export',
          description: 'Delete the unused export declaration',
          fixType: 'AUTO_FIX' as any,
          confidence: 0.9,
          affectedFiles: ['/project/src/utils.ts'],
        },
      ];

      // Setup mock returns
      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockResolvedValue(mockExports);

      const mockAnalyzerInstance = new mockExportAnalyzer();
      mockAnalyzerInstance.analyzeExports = jest
        .fn()
        .mockReturnValue(mockIssues);

      const mockSuggesterInstance = new mockFixSuggester();
      mockSuggesterInstance.suggestFixes = jest
        .fn()
        .mockResolvedValue(mockSuggestions);

      const mockCacheInstance = new mockCacheManager();
      mockCacheInstance.get = jest.fn().mockReturnValue(null);
      mockCacheInstance.set = jest.fn();

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 2,
      };

      const result = await engine.diagnose(options);

      // Verify the workflow was executed
      expect(mockScannerInstance.scanDirectory).toHaveBeenCalledWith(
        '/project',
        options,
        expect.any(Function)
      );
      expect(mockAnalyzerInstance.analyzeExports).toHaveBeenCalledWith(
        mockExports
      );
      expect(mockSuggesterInstance.suggestFixes).toHaveBeenCalledWith(
        mockIssues
      );

      // Verify result structure
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('performance');
      expect(result.issues).toEqual(mockIssues);
      expect(result.suggestions).toEqual(mockSuggestions);
    });

    it('should handle errors gracefully in workflow', async () => {
      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockRejectedValue(new Error('Scan failed'));

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      await expect(engine.diagnose(options)).rejects.toThrow('Scan failed');
    });

    it('should integrate ESLint analysis when enabled', async () => {
      const mockExports = [
        {
          name: 'testExport',
          type: 'named',
          location: {
            filePath: '/project/src/index.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export const testExport = 1;',
          },
          isUsed: true,
          referenceCount: 1,
          lastModified: new Date(),
        },
      ];

      const mockESLintResult = {
        filePath: '/project/src/index.ts',
        messages: [
          {
            ruleId: 'no-unused-vars',
            severity: 1,
            message: 'Unused variable',
            line: 1,
            column: 0,
          },
        ],
        errorCount: 0,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 1,
      };

      // Setup mocks
      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockResolvedValue(mockExports);

      const mockAnalyzerInstance = new mockExportAnalyzer();
      mockAnalyzerInstance.analyzeExports = jest.fn().mockReturnValue([]);

      const mockESLintInstance = new mockESLintIntegration();
      mockESLintInstance.analyzeFile = jest
        .fn()
        .mockResolvedValue(mockESLintResult);

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      const result = await engine.diagnose(options);

      expect(mockESLintInstance.analyzeFile).toHaveBeenCalledWith(
        '/project/src/index.ts'
      );
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should integrate TypeScript analysis when enabled', async () => {
      const mockExports = [
        {
          name: 'testExport',
          type: 'named',
          location: {
            filePath: '/project/src/index.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export const testExport: string = "test";',
          },
          isUsed: true,
          referenceCount: 1,
          lastModified: new Date(),
        },
      ];

      const mockTSResult = {
        exports: mockExports,
        issues: [],
        compileErrors: [],
        symbolTable: new Map(),
        typeCheckResults: [],
      };

      // Setup mocks
      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockResolvedValue(mockExports);

      const mockAnalyzerInstance = new mockExportAnalyzer();
      mockAnalyzerInstance.analyzeExports = jest.fn().mockReturnValue([]);

      const mockTSInstance = new mockTypeScriptIntegration();
      mockTSInstance.analyzeFile = jest.fn().mockResolvedValue(mockTSResult);

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      const result = await engine.diagnose(options);

      expect(mockTSInstance.analyzeFile).toHaveBeenCalledWith(
        '/project/src/index.ts'
      );
      expect(result).toHaveProperty('performance');
    });

    it('should use cache when available', async () => {
      const cachedResult = {
        exports: [],
        issues: [],
        suggestions: [],
        summary: { totalExports: 0, usedExports: 0, unusedExports: 0 },
        performance: { scanTime: 100, analysisTime: 50, totalTime: 150 },
      };

      const mockCacheInstance = new mockCacheManager();
      mockCacheInstance.get = jest.fn().mockReturnValue(cachedResult);

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      const result = await engine.diagnose(options);

      expect(mockCacheInstance.get).toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
      // Should not call scanner when cache hit
      expect(mockFileScanner).not.toHaveBeenCalled();
    });

    it('should cache results after analysis', async () => {
      const mockExports = [
        {
          name: 'testExport',
          type: 'named',
          location: {
            filePath: '/project/src/index.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export const testExport = 1;',
          },
          isUsed: true,
          referenceCount: 1,
          lastModified: new Date(),
        },
      ];

      const mockCacheInstance = new mockCacheManager();
      mockCacheInstance.get = jest.fn().mockReturnValue(null);
      mockCacheInstance.set = jest.fn();

      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockResolvedValue(mockExports);

      const mockAnalyzerInstance = new mockExportAnalyzer();
      mockAnalyzerInstance.analyzeExports = jest.fn().mockReturnValue([]);

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      await engine.diagnose(options);

      expect(mockCacheInstance.set).toHaveBeenCalled();
    });

    it('should handle progress callbacks', async () => {
      const progressCallback = jest.fn();

      const mockExports = [
        {
          name: 'testExport',
          type: 'named',
          location: {
            filePath: '/project/src/index.ts',
            line: 1,
            column: 0,
            codeSnippet: 'export const testExport = 1;',
          },
          isUsed: true,
          referenceCount: 1,
          lastModified: new Date(),
        },
      ];

      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockImplementation(async (dir, options, onProgress) => {
          onProgress?.({
            processedFiles: 1,
            totalFiles: 1,
            currentFile: '/project/src/index.ts',
            issuesFound: 0,
            elapsedTime: 100,
          });
          return mockExports;
        });

      const mockAnalyzerInstance = new mockExportAnalyzer();
      mockAnalyzerInstance.analyzeExports = jest.fn().mockReturnValue([]);

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
        onProgress: progressCallback,
      };

      await engine.diagnose(options);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should validate configuration', () => {
      const invalidConfig = {
        ...config,
        maxDepth: -1, // Invalid
      };

      expect(() => new DiagnosticEngine(invalidConfig)).toThrow();
    });

    it('should handle timeout correctly', async () => {
      const timeoutConfig = {
        ...config,
        timeout: 1, // Very short timeout
      };

      const engineWithTimeout = new DiagnosticEngine(timeoutConfig);

      const mockScannerInstance = new mockFileScanner();
      mockScannerInstance.scanDirectory = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve([]), 100))
        );

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      await expect(engineWithTimeout.diagnose(options)).rejects.toThrow();
    });
  });
});
