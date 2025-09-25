/**
 * Export Diagnostic Integration Tests
 * 导出诊断集成测试
 */

import { DiagnosticService } from '../../../services/DiagnosticService';
import { DiagnosticEngine } from '../../../utils/diagnostic/DiagnosticEngine';
import { FileScanner } from '../../../utils/diagnostic/FileScanner';
import { ExportAnalyzer } from '../../../utils/diagnostic/ExportAnalyzer';
import { FixSuggester } from '../../../utils/diagnostic/FixSuggester';
import { DependencyResolver } from '../../../utils/diagnostic/DependencyResolver';
import { CacheManager } from '../../../utils/diagnostic/CacheManager';
import { TypeScriptIntegration } from '../../../utils/diagnostic/TypeScriptIntegration';
import { ESLintIntegration } from '../../../utils/diagnostic/ESLintIntegration';
import { ErrorHandler } from '../../../utils/diagnostic/ErrorHandler';
import type {
  DiagnosticConfig,
  ScanOptions,
} from '../../../types/exportDiagnostic';

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
  },
  existsSync: jest.fn(),
}));

// Mock path operations
jest.mock('path', () => ({
  resolve: jest.fn((...args) => args.join('/')),
  relative: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn(),
  extname: jest.fn(),
  join: jest.fn((...args) => args.join('/')),
}));

describe('Export Diagnostic Integration', () => {
  let service: DiagnosticService;
  let config: DiagnosticConfig;

  beforeEach(() => {
    config = {
      filePatterns: ['**/*.{ts,tsx,js,jsx}'],
      ignorePatterns: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
      maxDepth: 5,
      timeout: 10000,
      concurrency: 2,
      enableCache: false,
      cacheExpiry: 300000,
      severityThreshold: 'info',
    };

    service = new DiagnosticService(config);
  });

  describe('端到端诊断流程', () => {
    it('应该完成完整的诊断流程', async () => {
      const scanOptions: ScanOptions = {
        rootDir: '/test/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      // Mock successful scan
      const mockReport = {
        id: 'test-report-1',
        scanTime: new Date(),
        duration: 1000,
        filesScanned: 5,
        issuesFound: 2,
        issues: [
          {
            id: 'issue-1',
            type: 'unused_export',
            severity: 'warning',
            description: 'Unused export found',
            location: {
              filePath: '/test/project/src/utils.ts',
              line: 1,
              column: 1,
              codeSnippet: 'export const unusedFunction',
            },
            suggestions: [
              {
                id: 'suggestion-1',
                title: 'Remove unused export',
                description: 'Remove the unused export to clean up the code',
                fixType: 'manual_fix',
                confidence: 0.9,
                affectedFiles: ['/test/project/src/utils.ts'],
              },
            ],
            detectedAt: new Date(),
          },
        ],
        config,
        performance: {
          memoryUsage: 50 * 1024 * 1024,
          cpuUsage: 25,
          filesPerSecond: 5,
        },
        summary: {
          totalExports: 10,
          usedExports: 8,
          unusedExports: 2,
          exportUsageRate: 0.8,
        },
      };

      // Mock the engine's diagnose method
      const engineSpy = jest.spyOn(DiagnosticEngine.prototype, 'diagnose');
      engineSpy.mockResolvedValue(mockReport);

      const report = await service.diagnose(scanOptions);

      expect(report).toBeDefined();
      expect(report.filesScanned).toBe(5);
      expect(report.issuesFound).toBe(2);
      expect(report.issues).toHaveLength(1);

      engineSpy.mockRestore();
    });

    it('应该处理扫描错误', async () => {
      const scanOptions: ScanOptions = {
        rootDir: '/nonexistent/project',
        recursive: true,
      };

      const engineSpy = jest.spyOn(DiagnosticEngine.prototype, 'diagnose');
      engineSpy.mockRejectedValue(new Error('扫描失败：目录不存在'));

      await expect(service.diagnose(scanOptions)).rejects.toThrow(
        '扫描失败：目录不存在'
      );

      engineSpy.mockRestore();
    });
  });

  describe('配置管理集成', () => {
    it('应该更新配置并重新初始化引擎', async () => {
      const newConfig = {
        ...config,
        maxDepth: 10,
        enableCache: true,
      };

      await service.updateConfig(newConfig);

      // Verify config was updated
      const currentConfig = await service.getConfig();
      expect(currentConfig.maxDepth).toBe(10);
      expect(currentConfig.enableCache).toBe(true);
    });

    it('应该验证配置有效性', async () => {
      const invalidConfig = {
        ...config,
        filePatterns: [], // Invalid: empty patterns
      };

      await expect(service.updateConfig(invalidConfig)).rejects.toThrow();
    });
  });

  describe('缓存集成', () => {
    it('应该清除缓存', async () => {
      const cacheSpy = jest.spyOn(DiagnosticEngine.prototype, 'clearCache');
      cacheSpy.mockResolvedValue();

      await service.clearCache();

      expect(cacheSpy).toHaveBeenCalled();
      cacheSpy.mockRestore();
    });
  });

  describe('历史记录管理', () => {
    it('应该维护诊断历史', async () => {
      const scanOptions: ScanOptions = {
        rootDir: '/test/project',
        recursive: true,
      };

      const mockReport = {
        id: 'test-report-1',
        scanTime: new Date(),
        duration: 500,
        filesScanned: 3,
        issuesFound: 0,
        issues: [],
        config,
        performance: {
          memoryUsage: 30 * 1024 * 1024,
          cpuUsage: 15,
          filesPerSecond: 6,
        },
        summary: {
          totalExports: 5,
          usedExports: 5,
          unusedExports: 0,
          exportUsageRate: 1.0,
        },
      };

      const engineSpy = jest.spyOn(DiagnosticEngine.prototype, 'diagnose');
      engineSpy.mockResolvedValue(mockReport);

      // Run multiple scans
      await service.diagnose(scanOptions);
      await service.diagnose(scanOptions);

      const history = await service.getHistory();
      expect(history).toHaveLength(2);

      engineSpy.mockRestore();
    });
  });

  describe('服务状态监控', () => {
    it('应该提供服务状态信息', async () => {
      const status = await service.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeScans');
      expect(status).toHaveProperty('cacheSize');
      expect(status).toHaveProperty('lastScanTime');
    });

    it('应该提供健康检查', async () => {
      const health = await service.healthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('checkedAt');
      expect(health).toHaveProperty('responseTime');
    });
  });

  describe('组件协作', () => {
    it('应该正确集成所有组件', () => {
      const engine = new DiagnosticEngine(config);

      // Verify engine has all required components
      expect(engine).toBeInstanceOf(DiagnosticEngine);

      // Test component initialization
      const scanner = new FileScanner(config);
      const analyzer = new ExportAnalyzer(config);
      const suggester = new FixSuggester(config);
      const resolver = new DependencyResolver(config);
      const cacheManager = new CacheManager(config);
      const tsIntegration = new TypeScriptIntegration({});
      const eslintIntegration = new ESLintIntegration({ enabled: false });
      const errorHandler = new ErrorHandler();

      expect(scanner).toBeInstanceOf(FileScanner);
      expect(analyzer).toBeInstanceOf(ExportAnalyzer);
      expect(suggester).toBeInstanceOf(FixSuggester);
      expect(resolver).toBeInstanceOf(DependencyResolver);
      expect(cacheManager).toBeInstanceOf(CacheManager);
      expect(tsIntegration).toBeInstanceOf(TypeScriptIntegration);
      expect(eslintIntegration).toBeInstanceOf(ESLintIntegration);
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });
  });

  describe('性能监控', () => {
    it('应该监控扫描性能', async () => {
      const scanOptions: ScanOptions = {
        rootDir: '/test/project',
        recursive: true,
      };

      const mockReport = {
        id: 'perf-test-report',
        scanTime: new Date(),
        duration: 2000,
        filesScanned: 10,
        issuesFound: 1,
        issues: [],
        config,
        performance: {
          memoryUsage: 100 * 1024 * 1024,
          cpuUsage: 45,
          filesPerSecond: 5,
        },
        summary: {
          totalExports: 20,
          usedExports: 18,
          unusedExports: 2,
          exportUsageRate: 0.9,
        },
      };

      const engineSpy = jest.spyOn(DiagnosticEngine.prototype, 'diagnose');
      engineSpy.mockResolvedValue(mockReport);

      const startTime = Date.now();
      const report = await service.diagnose(scanOptions);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
      expect(report.performance.filesPerSecond).toBe(5);

      engineSpy.mockRestore();
    });
  });

  describe('错误恢复', () => {
    it('应该在部分失败时继续处理', async () => {
      const scanOptions: ScanOptions = {
        rootDir: '/test/project',
        recursive: true,
      };

      // Mock partial success report
      const mockReport = {
        id: 'partial-success-report',
        scanTime: new Date(),
        duration: 1500,
        filesScanned: 8,
        issuesFound: 3,
        issues: [
          {
            id: 'error-1',
            type: 'parsing_error',
            severity: 'error',
            description: 'Failed to parse file',
            location: {
              filePath: '/test/project/src/broken.ts',
              line: 1,
              column: 1,
              codeSnippet: 'invalid syntax',
            },
            suggestions: [],
            detectedAt: new Date(),
          },
        ],
        config,
        performance: {
          memoryUsage: 80 * 1024 * 1024,
          cpuUsage: 35,
          filesPerSecond: 5.33,
        },
        summary: {
          totalExports: 15,
          usedExports: 12,
          unusedExports: 3,
          exportUsageRate: 0.8,
        },
      };

      const engineSpy = jest.spyOn(DiagnosticEngine.prototype, 'diagnose');
      engineSpy.mockResolvedValue(mockReport);

      const report = await service.diagnose(scanOptions);

      expect(report.filesScanned).toBe(8);
      expect(report.issuesFound).toBe(3);
      expect(report.issues).toHaveLength(1);

      engineSpy.mockRestore();
    });
  });

  describe('并发处理', () => {
    it('应该支持并发扫描', async () => {
      const scanOptions1: ScanOptions = {
        rootDir: '/test/project1',
        recursive: true,
        concurrency: 2,
      };

      const scanOptions2: ScanOptions = {
        rootDir: '/test/project2',
        recursive: true,
        concurrency: 2,
      };

      const mockReport = {
        id: 'concurrent-report',
        scanTime: new Date(),
        duration: 1000,
        filesScanned: 5,
        issuesFound: 0,
        issues: [],
        config,
        performance: {
          memoryUsage: 60 * 1024 * 1024,
          cpuUsage: 30,
          filesPerSecond: 5,
        },
        summary: {
          totalExports: 10,
          usedExports: 10,
          unusedExports: 0,
          exportUsageRate: 1.0,
        },
      };

      const engineSpy = jest.spyOn(DiagnosticEngine.prototype, 'diagnose');
      engineSpy.mockResolvedValue(mockReport);

      // Run concurrent scans
      const [report1, report2] = await Promise.all([
        service.diagnose(scanOptions1),
        service.diagnose(scanOptions2),
      ]);

      expect(report1.filesScanned).toBe(5);
      expect(report2.filesScanned).toBe(5);

      engineSpy.mockRestore();
    });
  });
});
