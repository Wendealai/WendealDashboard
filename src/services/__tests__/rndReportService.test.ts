import { RNDReportService } from '../rndReportService';
import type {
  Report,
  Category,
  FileValidationResult,
  RNDReportError,
} from '../../types/rndReport';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock FileReader
const mockFileReader = {
  readAsText: jest.fn(),
  onload: null,
  onerror: null,
  result: null,
};
global.FileReader = jest.fn(() => mockFileReader) as any;

// Mock DOMParser
const mockDOMParser = {
  parseFromString: jest.fn(),
};
global.DOMParser = jest.fn(() => mockDOMParser) as any;

describe('RNDReportService', () => {
  let service: RNDReportService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock IndexedDB open
    mockDb = {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue(null),
          getAll: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue(undefined),
          clear: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      close: jest.fn(),
    };

    mockIndexedDB.open.mockReturnValue({
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      result: mockDb,
    });

    // Create service instance
    service = new RNDReportService();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const config = {
        maxFileSize: 50 * 1024 * 1024,
        allowedFileTypes: ['text/html'],
        storagePath: 'test-reports',
        autoExtractMetadata: true,
        enableReadingProgress: true,
        enableBookmarks: true,
        enableSearch: true,
        enableCategories: true,
        defaultViewMode: 'list' as const,
        itemsPerPage: 20,
        enableOfflineMode: true,
      };

      await expect(service.initialize(config)).resolves.toBeUndefined();
    });

    it('should handle IndexedDB initialization error', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        throw new Error('IndexedDB error');
      });

      await expect(service.initialize({})).rejects.toThrow();
    });
  });

  describe('file validation', () => {
    it('should validate HTML file successfully', async () => {
      const mockFile = new File(['<html><body>Test</body></html>'], 'test.html', {
        type: 'text/html',
      });

      mockDOMParser.parseFromString.mockReturnValue({
        querySelectorAll: jest.fn().mockReturnValue([]),
        body: {},
        head: {},
      });

      const result = await service.validateFile(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('text/html');
    });

    it('should reject invalid file type', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const result = await service.validateFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file that is too large', async () => {
      const largeContent = 'x'.repeat(60 * 1024 * 1024); // 60MB
      const mockFile = new File([largeContent], 'large.html', {
        type: 'text/html',
      });

      const result = await service.validateFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });

    it('should reject empty file', async () => {
      const mockFile = new File([''], 'empty.html', {
        type: 'text/html',
      });

      const result = await service.validateFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File is empty');
    });
  });

  describe('file upload', () => {
    beforeEach(async () => {
      await service.initialize({});
    });

    it('should upload file successfully', async () => {
      const mockFile = new File(['<html><body>Test</body></html>'], 'test.html', {
        type: 'text/html',
      });

      // Mock file reader
      mockFileReader.result = '<html><body>Test</body></html>';
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({} as any);
        }
      }, 0);

      // Mock DOM parser
      mockDOMParser.parseFromString.mockReturnValue({
        querySelectorAll: jest.fn().mockReturnValue([]),
        querySelector: jest.fn().mockReturnValue(null),
        body: {},
        head: {},
      });

      // Mock localStorage
      mockLocalStorage.setItem.mockImplementation(() => {});

      const result = await service.uploadFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should handle upload error', async () => {
      const mockFile = new File(['invalid content'], 'test.html', {
        type: 'text/html',
      });

      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      await expect(service.uploadFile(mockFile)).rejects.toThrow();
    });
  });

  describe('report management', () => {
    beforeEach(async () => {
      await service.initialize({});
    });

    it('should get reports with pagination', async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Test Report 1',
          originalName: 'test1.html',
          filePath: 'files/test1.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
        {
          id: '2',
          name: 'Test Report 2',
          originalName: 'test2.html',
          filePath: 'files/test2.html',
          categoryId: 'tech',
          fileSize: 2048,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      mockDb.transaction().objectStore().getAll.mockResolvedValue(mockReports);

      const result = await service.getReports();

      expect(result.reports).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter reports by category', async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Tech Report',
          originalName: 'tech.html',
          filePath: 'files/tech.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
        {
          id: '2',
          name: 'Marketing Report',
          originalName: 'marketing.html',
          filePath: 'files/marketing.html',
          categoryId: 'marketing',
          fileSize: 2048,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      mockDb.transaction().objectStore().getAll.mockResolvedValue(mockReports);

      const result = await service.getReports({
        categoryIds: ['tech'],
      });

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].categoryId).toBe('tech');
    });

    it('should search reports by query', async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Technical Analysis',
          originalName: 'tech.html',
          filePath: 'files/tech.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {
            description: 'Technical analysis report',
          },
        },
        {
          id: '2',
          name: 'Marketing Strategy',
          originalName: 'marketing.html',
          filePath: 'files/marketing.html',
          categoryId: 'marketing',
          fileSize: 2048,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      mockDb.transaction().objectStore().getAll.mockResolvedValue(mockReports);

      const result = await service.searchReports('technical');

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].name).toContain('Technical');
    });

    it('should handle report not found', async () => {
      mockDb.transaction().objectStore().get.mockResolvedValue(null);

      await expect(service.getReport('nonexistent')).rejects.toThrow('Report not found');
    });
  });

  describe('category management', () => {
    beforeEach(async () => {
      await service.initialize({});
    });

    it('should get all categories', async () => {
      const mockCategories: Category[] = [
        {
          id: 'tech',
          name: 'Technical Research',
          reportCount: 5,
          createdDate: new Date(),
        },
        {
          id: 'marketing',
          name: 'Marketing',
          reportCount: 3,
          createdDate: new Date(),
        },
      ];

      mockDb.transaction().objectStore().getAll.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result.categories).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should create new category', async () => {
      const categoryData = {
        name: 'New Category',
        description: 'Test category',
        color: '#1890ff',
      };

      const result = await service.createCategory(categoryData);

      expect(result.name).toBe(categoryData.name);
      expect(result.description).toBe(categoryData.description);
      expect(result.color).toBe(categoryData.color);
      expect(result.id).toBeDefined();
    });

    it('should update category', async () => {
      const existingCategory: Category = {
        id: 'tech',
        name: 'Technical Research',
        reportCount: 5,
        createdDate: new Date(),
      };

      mockDb.transaction().objectStore().get.mockResolvedValue(existingCategory);

      const updates = {
        name: 'Updated Technical Research',
        description: 'Updated description',
      };

      const result = await service.updateCategory('tech', updates);

      expect(result.name).toBe(updates.name);
      expect(result.description).toBe(updates.description);
    });

    it('should delete category', async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Test Report',
          originalName: 'test.html',
          filePath: 'files/test.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      mockDb.transaction().objectStore().get.mockResolvedValue({
        id: 'tech',
        name: 'Technical Research',
        reportCount: 1,
        createdDate: new Date(),
      });

      // Mock query by index for reports
      mockDb.transaction().objectStore().index = jest.fn().mockReturnValue({
        getAll: jest.fn().mockResolvedValue(mockReports),
      });

      await service.deleteCategory('tech');

      expect(mockDb.transaction().objectStore().put).toHaveBeenCalled();
      expect(mockDb.transaction().objectStore().delete).toHaveBeenCalledWith('tech');
    });
  });

  describe('reading progress', () => {
    beforeEach(async () => {
      await service.initialize({});
    });

    it('should get reading progress', async () => {
      const mockProgress = {
        reportId: 'test-report',
        currentPosition: 50,
        totalPages: 10,
        currentPage: 6,
        lastReadAt: new Date(),
        bookmarks: [],
      };

      mockDb.transaction().objectStore().get.mockResolvedValue(mockProgress);

      const result = await service.getReadingProgress('test-report');

      expect(result.currentPosition).toBe(50);
      expect(result.totalPages).toBe(10);
    });

    it('should create default reading progress if not exists', async () => {
      mockDb.transaction().objectStore().get.mockResolvedValue(null);

      const result = await service.getReadingProgress('new-report');

      expect(result.reportId).toBe('new-report');
      expect(result.currentPosition).toBe(0);
      expect(result.bookmarks).toEqual([]);
    });

    it('should update reading progress', async () => {
      const existingProgress = {
        reportId: 'test-report',
        currentPosition: 25,
        totalPages: 10,
        currentPage: 3,
        lastReadAt: new Date(),
        bookmarks: [],
      };

      mockDb.transaction().objectStore().get.mockResolvedValue(existingProgress);

      const updates = {
        currentPosition: 75,
        currentPage: 8,
      };

      const result = await service.updateReadingProgress('test-report', updates);

      expect(result.currentPosition).toBe(75);
      expect(result.currentPage).toBe(8);
      expect(mockDb.transaction().objectStore().put).toHaveBeenCalled();
    });

    it('should add bookmark', async () => {
      const existingProgress = {
        reportId: 'test-report',
        currentPosition: 25,
        totalPages: 10,
        currentPage: 3,
        lastReadAt: new Date(),
        bookmarks: [],
      };

      mockDb.transaction().objectStore().get.mockResolvedValue(existingProgress);

      const bookmarkData = {
        position: 50,
        title: 'Important Section',
        notes: 'This section is important',
      };

      const result = await service.addBookmark('test-report', bookmarkData);

      expect(result.position).toBe(50);
      expect(result.title).toBe('Important Section');
      expect(result.notes).toBe('This section is important');
      expect(result.id).toBeDefined();
    });
  });

  describe('storage operations', () => {
    beforeEach(async () => {
      await service.initialize({});
    });

    it('should get storage info', async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Test Report',
          originalName: 'test.html',
          filePath: 'files/test.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      mockDb.transaction().objectStore().getAll.mockResolvedValue(mockReports);

      const result = await service.getStorageInfo();

      expect(result.used).toBe(1024);
      expect(result.files).toBe(1);
      expect(result.available).toBeGreaterThan(0);
    });

    it('should cleanup old files', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

      const mockReports: Report[] = [
        {
          id: 'old',
          name: 'Old Report',
          originalName: 'old.html',
          filePath: 'files/old.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: oldDate,
          readingProgress: 0,
          metadata: {},
        },
        {
          id: 'new',
          name: 'New Report',
          originalName: 'new.html',
          filePath: 'files/new.html',
          categoryId: 'tech',
          fileSize: 2048,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      mockDb.transaction().objectStore().getAll.mockResolvedValue(mockReports);

      const result = await service.cleanupStorage(30);

      expect(result.deletedCount).toBe(1);
      expect(result.freedSpace).toBe(1024);
    });
  });

  describe('error handling', () => {
    it('should handle service not initialized', async () => {
      const uninitializedService = new RNDReportService();

      await expect(uninitializedService.validateFile(new File([], 'test.html')))
        .rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.transaction.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.getReports()).rejects.toThrow();
    });
  });

  describe('service lifecycle', () => {
    it('should dispose resources properly', async () => {
      await service.initialize({});
      service.dispose();

      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should check service health', async () => {
      await service.initialize({});

      const isHealthy = await service.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should get service statistics', async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Test Report',
          originalName: 'test.html',
          filePath: 'files/test.html',
          categoryId: 'tech',
          fileSize: 1024,
          uploadDate: new Date(),
          readingProgress: 0,
          metadata: {},
        },
      ];

      const mockCategories: Category[] = [
        {
          id: 'tech',
          name: 'Technical Research',
          reportCount: 1,
          createdDate: new Date(),
        },
      ];

      mockDb.transaction().objectStore().getAll
        .mockResolvedValueOnce(mockReports)
        .mockResolvedValueOnce(mockCategories);

      const stats = await service.getStats();

      expect(stats.totalReports).toBe(1);
      expect(stats.totalCategories).toBe(1);
      expect(stats.totalStorageUsed).toBe(1024);
    });
  });
});
