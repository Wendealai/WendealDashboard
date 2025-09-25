import { FileScanner } from '../../../utils/diagnostic/FileScanner';
import { FileSystemUtils } from '../../../utils/exportDiagnosticUtils';
import type {
  ScanOptions,
  DiagnosticConfig,
} from '../../../types/exportDiagnostic';

// Mock FileSystemUtils
jest.mock('../../../utils/exportDiagnosticUtils', () => ({
  FileSystemUtils: {
    getAllFiles: jest.fn(),
    readFileContent: jest.fn(),
    getFileModifiedTime: jest.fn(),
  },
  PathResolver: {
    matchesPattern: jest.fn(() => true),
    shouldIgnore: jest.fn(() => false),
    isSourceFile: jest.fn(() => true),
    getRelativePath: jest.fn((dir, file) => file.replace(dir + '/', '')),
  },
  CacheUtils: {
    generateFileCacheKey: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clearExpired: jest.fn(),
  },
}));

const mockFileSystemUtils = FileSystemUtils as jest.Mocked<
  typeof FileSystemUtils
>;

describe('FileScanner', () => {
  let scanner: FileScanner;
  let config: DiagnosticConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      filePatterns: ['**/*.{ts,tsx,js,jsx}'],
      ignorePatterns: ['**/node_modules/**'],
      maxDepth: 10,
      timeout: 30000,
      enableCache: true,
      cacheExpiry: 5 * 60 * 1000,
      severityThreshold: 'info' as any,
    };
    scanner = new FileScanner(config);
  });

  describe('scanDirectory', () => {
    it('should scan directory successfully', async () => {
      const mockFileContent = `
export const testFunction = () => {};
export default class TestClass {}
      `.trim();

      mockFileSystemUtils.getAllFiles.mockResolvedValue([
        '/project/src/index.ts',
      ]);
      mockFileSystemUtils.readFileContent.mockResolvedValue(mockFileContent);
      mockFileSystemUtils.getFileModifiedTime.mockResolvedValue(new Date());

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 2,
      };

      const result = await scanner.scanDirectory('/project', options);

      expect(mockFileSystemUtils.getAllFiles).toHaveBeenCalledWith(
        '/project',
        10
      );
      expect(result.length).toBeGreaterThan(0); // Should find exports
    });

    it('should filter files based on patterns', async () => {
      mockFileSystemUtils.getAllFiles.mockResolvedValue([
        '/project/src/index.ts',
      ]);
      mockFileSystemUtils.readFileContent.mockResolvedValue(
        'export const test = 1;'
      );
      mockFileSystemUtils.getFileModifiedTime.mockResolvedValue(new Date());

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      const result = await scanner.scanDirectory('/project', options);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle file read errors gracefully', async () => {
      mockFileSystemUtils.getAllFiles.mockResolvedValue([
        '/project/src/index.ts',
      ]);
      mockFileSystemUtils.readFileContent.mockRejectedValue(
        new Error('File not found')
      );

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      // Should not throw, but return empty array
      const result = await scanner.scanDirectory('/project', options);
      expect(result).toHaveLength(0);
    });

    it('should call progress callback when provided', async () => {
      const mockProgressCallback = jest.fn();

      mockFileSystemUtils.getAllFiles.mockResolvedValue([
        '/project/src/index.ts',
      ]);
      mockFileSystemUtils.readFileContent.mockResolvedValue(
        'export const test = 1;'
      );
      mockFileSystemUtils.getFileModifiedTime.mockResolvedValue(new Date());

      const options: ScanOptions = {
        rootDir: '/project',
        recursive: true,
        includeHidden: false,
        includeNodeModules: false,
        includeTests: false,
        concurrency: 1,
      };

      await scanner.scanDirectory('/project', options, mockProgressCallback);

      expect(mockProgressCallback).toHaveBeenCalled();
    });
  });

  describe('scanFile', () => {
    it('should parse TypeScript file exports', async () => {
      const fileContent = `export const namedExport = 'test';
export default function defaultExport() {}`;

      mockFileSystemUtils.readFileContent.mockResolvedValue(fileContent);
      mockFileSystemUtils.getFileModifiedTime.mockResolvedValue(new Date());

      const result = await scanner.scanFile('/project/src/index.ts');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(exp => exp.name === 'namedExport')).toBe(true);
    });

    it('should handle file read errors', async () => {
      mockFileSystemUtils.readFileContent.mockRejectedValue(
        new Error('File not found')
      );

      await expect(
        scanner.scanFile('/project/src/missing.ts')
      ).rejects.toThrow();
    });
  });

  describe('getScanStats', () => {
    it('should return scan statistics', () => {
      const stats = scanner.getScanStats();

      expect(stats).toHaveProperty('cachedFiles');
      expect(stats).toHaveProperty('scannedFiles');
      expect(stats).toHaveProperty('totalExports');
    });
  });

  describe('clearCache', () => {
    it('should clear cache without throwing', () => {
      expect(() => scanner.clearCache()).not.toThrow();
    });
  });
});
