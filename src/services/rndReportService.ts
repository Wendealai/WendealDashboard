// R&D Report Service Implementation
import type {
  Report,
  Category,
  FileValidationResult,
  FileProcessingResult,
  ReadingProgress,
  ReportSearchFilters,
  ReportSortOptions,
  ReportListResponse,
  CategoryListResponse,
  StorageInfo,
  RNDReportConfig,
  RNDReportError,
  RNDReportErrorCode,
} from '../types/rndReport';
import { DEFAULT_CATEGORIES, DEFAULT_RND_REPORT_CONFIG } from '../types/rndReport';
import type { IRNDReportService } from './IRNDReportService';

/**
 * R&D Report 服务实现类
 * 提供完整的R&D Report功能，包括文件管理、分类、阅读进度等
 */
export class RNDReportService implements IRNDReportService {
  private config: RNDReportConfig;
  private db: IDBDatabase | null = null;
  private dbVersion = 1;
  private isInitialized = false;

  // 数据库存储对象名称
  private readonly DB_NAME = 'rnd-reports-db';
  private readonly STORES = {
    REPORTS: 'reports',
    CATEGORIES: 'categories',
    READING_PROGRESS: 'reading-progress',
    METADATA: 'metadata',
  };

  constructor(config: Partial<RNDReportConfig> = {}) {
    this.config = { ...DEFAULT_RND_REPORT_CONFIG, ...config };
  }

  /**
   * 初始化服务
   */
  async initialize(config: RNDReportConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = { ...this.config, ...config };

    try {
      // 初始化IndexedDB
      await this.initializeIndexedDB();

      // 初始化文件系统目录
      await this.initializeFileSystem();

      // 初始化默认分类
      await this.initializeDefaultCategories();

      this.isInitialized = true;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to initialize R&D Report service', error);
    }
  }

  /**
   * 初始化IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.STORES.REPORTS)) {
          const reportsStore = db.createObjectStore(this.STORES.REPORTS, { keyPath: 'id' });
          reportsStore.createIndex('categoryId', 'categoryId', { unique: false });
          reportsStore.createIndex('uploadDate', 'uploadDate', { unique: false });
          reportsStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.STORES.CATEGORIES)) {
          const categoriesStore = db.createObjectStore(this.STORES.CATEGORIES, { keyPath: 'id' });
          categoriesStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains(this.STORES.READING_PROGRESS)) {
          const progressStore = db.createObjectStore(this.STORES.READING_PROGRESS, { keyPath: 'reportId' });
          progressStore.createIndex('lastReadAt', 'lastReadAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.STORES.METADATA)) {
          db.createObjectStore(this.STORES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * 初始化文件系统
   */
  private async initializeFileSystem(): Promise<void> {
    try {
      // 检查是否支持File System Access API
      if (!('showDirectoryPicker' in window)) {
        console.warn('File System Access API not supported, falling back to localStorage');
        return;
      }

      // 这里可以添加文件系统初始化逻辑
      // 暂时使用localStorage作为后备方案
    } catch (error) {
      console.warn('File system initialization failed:', error);
    }
  }

  /**
   * 初始化默认分类
   */
  private async initializeDefaultCategories(): Promise<void> {
    try {
      const existingCategories = await this.getCategories();
      console.log('📂 检查现有分类:', existingCategories.categories.length, '个');

      if (existingCategories.categories.length === 0) {
        console.log('🏗️ 初始化默认分类...');
        for (const category of DEFAULT_CATEGORIES) {
          console.log(`➕ 创建分类: ${category.name}`);
          await this.createCategory(category);
        }
        console.log('✅ 默认分类初始化完成');
      } else {
        console.log('📋 现有分类:', existingCategories.categories.map(c => `${c.name} (${c.id})`));
      }
    } catch (error) {
      console.warn('Failed to initialize default categories:', error);
    }
  }

  // ==================== 文件操作方法 ====================

  async validateFile(file: File): Promise<FileValidationResult> {
    try {
      // 检查文件类型
      if (!this.config.allowedFileTypes.some(type => file.type === type || file.name.toLowerCase().endsWith('.html'))) {
        return {
          isValid: false,
          error: 'File type not allowed. Only HTML files are accepted.',
        };
      }

      // 检查文件大小
      if (file.size > this.config.maxFileSize) {
        return {
          isValid: false,
          error: `File size exceeds limit of ${this.config.maxFileSize / (1024 * 1024)}MB`,
        };
      }

      // 检查文件内容（基础验证）
      const content = await file.text();
      if (!content.trim()) {
        return {
          isValid: false,
          error: 'File is empty',
        };
      }

      return {
        isValid: true,
        fileType: file.type,
        fileSize: file.size,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'File validation failed',
      };
    }
  }

  async uploadFile(file: File, categoryId?: string): Promise<FileProcessingResult> {
    try {
      // 验证文件
      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        throw this.createError('VALIDATION_ERROR', validation.error || 'File validation failed');
      }

      // 生成报告ID
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 读取文件内容
      const content = await file.text();

      // 提取元数据
      const metadata = await this.extractMetadata(content);

      // 创建报告对象
      const report: Report = {
        id: reportId,
        name: file.name.replace(/\.html?$/i, ''),
        originalName: file.name,
        filePath: `${this.config.storagePath}/files/${reportId}.html`,
        categoryId: categoryId || 'uncategorized',
        fileSize: file.size,
        uploadDate: new Date(),
        readingProgress: 0,
        metadata,
      };

      // 存储文件内容（暂时使用localStorage，后续可扩展为文件系统）
      localStorage.setItem(`rnd-report-content-${reportId}`, content);
      console.log('📁 File content stored in localStorage:', reportId);

      // 存储报告元数据到IndexedDB
      await this.storeInIndexedDB(this.STORES.REPORTS, report);
      console.log('💾 Report metadata stored in IndexedDB:', report);

      // 更新分类报告计数
      if (categoryId) {
        await this.updateCategoryReportCount(categoryId, 1);
        console.log('📊 Category report count updated for:', categoryId);
      }

      return {
        success: true,
        filePath: report.filePath,
        metadata,
      };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'File upload failed', error);
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      // 获取报告信息
      const report = await this.getReport(reportId);

      // 删除文件内容
      localStorage.removeItem(`rnd-report-content-${reportId}`);

      // 删除元数据
      await this.deleteFromIndexedDB(this.STORES.REPORTS, reportId);

      // 删除阅读进度
      await this.deleteFromIndexedDB(this.STORES.READING_PROGRESS, reportId);

      // 更新分类报告计数
      if (report.categoryId !== 'uncategorized') {
        await this.updateCategoryReportCount(report.categoryId, -1);
      }
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to delete report', error);
    }
  }

  async getReportContent(reportId: string): Promise<string> {
    try {
      const content = localStorage.getItem(`rnd-report-content-${reportId}`);
      if (!content) {
        throw this.createError('FILE_NOT_FOUND', `Report content not found: ${reportId}`);
      }
      return content;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get report content', error);
    }
  }

  // ==================== 数据检查方法 ====================

  /**
   * 检查数据库和存储状态
   */
  async checkDataStatus(): Promise<{
    dbInitialized: boolean;
    reportsCount: number;
    categoriesCount: number;
    localStorageCount: number;
    dbError?: string;
  }> {
    try {
      console.log('🔍 Checking data status...');

      // Check DB initialization
      const dbInitialized = this.db !== null;
      console.log('💾 Database initialized:', dbInitialized);

      if (!dbInitialized) {
        return {
          dbInitialized: false,
          reportsCount: 0,
          categoriesCount: 0,
          localStorageCount: 0,
          dbError: 'Database not initialized',
        };
      }

      // Check IndexedDB data
      let reportsCount = 0;
      let categoriesCount = 0;

      try {
        const reports = await this.getAllFromIndexedDB<Report>(this.STORES.REPORTS);
        reportsCount = reports.length;
        console.log('📋 Reports in IndexedDB:', reportsCount);
      } catch (error) {
        console.error('❌ Failed to read reports from IndexedDB:', error);
      }

      try {
        const categories = await this.getAllFromIndexedDB<Category>(this.STORES.CATEGORIES);
        categoriesCount = categories.length;
        console.log('📂 Categories in IndexedDB:', categoriesCount);
      } catch (error) {
        console.error('❌ Failed to read categories from IndexedDB:', error);
      }

      // Check localStorage
      const localStorageCount = Object.keys(localStorage).filter(key =>
        key.startsWith('rnd-report-content-')
      ).length;
      console.log('📦 Files in localStorage:', localStorageCount);

      return {
        dbInitialized: true,
        reportsCount,
        categoriesCount,
        localStorageCount,
      };
    } catch (error) {
      console.error('❌ Data status check failed:', error);
      return {
        dbInitialized: false,
        reportsCount: 0,
        categoriesCount: 0,
        localStorageCount: 0,
        dbError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== 报告管理方法 ====================

  async getReports(
    filters?: ReportSearchFilters,
    sortOptions?: ReportSortOptions,
    page = 1,
    pageSize = this.config.itemsPerPage
  ): Promise<ReportListResponse> {
    try {
      const reports = await this.getAllFromIndexedDB<Report>(this.STORES.REPORTS);
      console.log('📋 Loaded reports from IndexedDB:', reports.length, 'reports');

      let filteredReports = reports;

      // 应用过滤器
      if (filters) {
        filteredReports = this.applyFilters(filteredReports, filters);
      }

      // 应用排序
      if (sortOptions) {
        filteredReports = this.applySorting(filteredReports, sortOptions);
      }

      // 分页
      const totalCount = filteredReports.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedReports = filteredReports.slice(startIndex, endIndex);

      return {
        reports: paginatedReports,
        totalCount,
        hasMore: endIndex < totalCount,
      };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get reports', error);
    }
  }

  async getReport(reportId: string): Promise<Report> {
    try {
      const report = await this.getFromIndexedDB<Report>(this.STORES.REPORTS, reportId);
      if (!report) {
        throw this.createError('FILE_NOT_FOUND', `Report not found: ${reportId}`);
      }
      return report;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get report', error);
    }
  }

  async updateReport(reportId: string, updates: Partial<Report>): Promise<Report> {
    try {
      const report = await this.getReport(reportId);
      const updatedReport = { ...report, ...updates };

      await this.storeInIndexedDB(this.STORES.REPORTS, updatedReport);
      return updatedReport;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to update report', error);
    }
  }

  async searchReports(query: string, filters?: ReportSearchFilters): Promise<ReportListResponse> {
    try {
      const reports = await this.getAllFromIndexedDB<Report>(this.STORES.REPORTS);
      const searchFilters = { ...filters, query };

      const filteredReports = this.applyFilters(reports, searchFilters);

      return {
        reports: filteredReports,
        totalCount: filteredReports.length,
        hasMore: false,
      };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Search failed', error);
    }
  }

  // ==================== 分类管理方法 ====================

  async getCategories(): Promise<CategoryListResponse> {
    try {
      const categories = await this.getAllFromIndexedDB<Category>(this.STORES.CATEGORIES);
      console.log('📂 Loaded categories from IndexedDB:', categories.length, 'categories');

      // 更新报告计数
      const updatedCategories = await Promise.all(
        categories.map(async (category) => {
          const reports = await this.getReports({ categoryIds: [category.id] });
          return { ...category, reportCount: reports.totalCount };
        })
      );

      return {
        categories: updatedCategories,
        totalCount: updatedCategories.length,
      };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get categories', error);
    }
  }

  async getCategory(categoryId: string): Promise<Category> {
    try {
      const category = await this.getFromIndexedDB<Category>(this.STORES.CATEGORIES, categoryId);
      if (!category) {
        throw this.createError('FILE_NOT_FOUND', `Category not found: ${categoryId}`);
      }
      return category;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get category', error);
    }
  }

  async createCategory(category: Omit<Category, 'id' | 'createdDate' | 'reportCount'>): Promise<Category> {
    try {
      const categoryId = `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newCategory: Category = {
        ...category,
        id: categoryId,
        reportCount: 0,
        createdDate: new Date(),
      };

      await this.storeInIndexedDB(this.STORES.CATEGORIES, newCategory);
      return newCategory;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to create category', error);
    }
  }

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    try {
      const category = await this.getCategory(categoryId);
      const updatedCategory = { ...category, ...updates };

      await this.storeInIndexedDB(this.STORES.CATEGORIES, updatedCategory);
      return updatedCategory;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to update category', error);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      // 将该分类下的所有报告移到"未分类"
      const reports = await this.getReports({ categoryIds: [categoryId] });
      const uncategorizedId = 'uncategorized';

      for (const report of reports.reports) {
        await this.updateReport(report.id, { categoryId: uncategorizedId });
      }

      // 删除分类
      await this.deleteFromIndexedDB(this.STORES.CATEGORIES, categoryId);
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to delete category', error);
    }
  }

  // ==================== 阅读进度管理方法 ====================

  async getReadingProgress(reportId: string): Promise<ReadingProgress> {
    try {
      let progress = await this.getFromIndexedDB<ReadingProgress>(this.STORES.READING_PROGRESS, reportId);

      if (!progress) {
        progress = {
          reportId,
          currentPosition: 0,
          totalPages: 0,
          currentPage: 0,
          lastReadAt: new Date(),
          bookmarks: [],
        };
      }

      return progress;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get reading progress', error);
    }
  }

  async updateReadingProgress(reportId: string, progressData: Partial<ReadingProgress>): Promise<ReadingProgress> {
    try {
      const existingProgress = await this.getReadingProgress(reportId);
      const updatedProgress: ReadingProgress = {
        ...existingProgress,
        ...progressData,
        reportId,
        lastReadAt: new Date(),
      };

      await this.storeInIndexedDB(this.STORES.READING_PROGRESS, updatedProgress);
      return updatedProgress;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to update reading progress', error);
    }
  }

  async addBookmark(reportId: string, bookmark: Omit<ReadingProgress['bookmarks'][0], 'id' | 'createdAt'>): Promise<ReadingProgress['bookmarks'][0]> {
    try {
      const progress = await this.getReadingProgress(reportId);
      const newBookmark = {
        ...bookmark,
        id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
      };

      progress.bookmarks.push(newBookmark);
      await this.storeInIndexedDB(this.STORES.READING_PROGRESS, progress);

      return newBookmark;
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to add bookmark', error);
    }
  }

  async removeBookmark(reportId: string, bookmarkId: string): Promise<void> {
    try {
      const progress = await this.getReadingProgress(reportId);
      progress.bookmarks = progress.bookmarks.filter(b => b.id !== bookmarkId);
      await this.storeInIndexedDB(this.STORES.READING_PROGRESS, progress);
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to remove bookmark', error);
    }
  }

  // ==================== 存储管理方法 ====================

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      // 计算存储使用情况
      const reports = await this.getAllFromIndexedDB<Report>(this.STORES.REPORTS);
      const totalSize = reports.reduce((sum, report) => sum + report.fileSize, 0);

      return {
        totalSpace: 500 * 1024 * 1024, // 假设500MB可用空间
        usedSpace: totalSize,
        availableSpace: 500 * 1024 * 1024 - totalSize,
        reportsCount: reports.length,
        categoriesCount: (await this.getAllFromIndexedDB<Category>(this.STORES.CATEGORIES)).length,
      };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get storage info', error);
    }
  }

  async cleanupStorage(olderThanDays = 30): Promise<{ deletedCount: number; freedSpace: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const reports = await this.getAllFromIndexedDB<Report>(this.STORES.REPORTS);
      const oldReports = reports.filter(report => report.uploadDate < cutoffDate);

      let deletedCount = 0;
      let freedSpace = 0;

      for (const report of oldReports) {
        await this.deleteReport(report.id);
        deletedCount++;
        freedSpace += report.fileSize;
      }

      return { deletedCount, freedSpace };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Cleanup failed', error);
    }
  }

  async exportReports(reportIds: string[], format: 'json' | 'csv'): Promise<string> {
    try {
      const reports = await Promise.all(reportIds.map(id => this.getReport(id)));

      if (format === 'json') {
        const data = JSON.stringify(reports, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        return URL.createObjectURL(blob);
      } else {
        // CSV format
        const headers = ['ID', 'Name', 'Category', 'File Size', 'Upload Date', 'Reading Progress'];
        const rows = reports.map(report => [
          report.id,
          report.name,
          report.categoryId,
          report.fileSize.toString(),
          report.uploadDate.toISOString(),
          report.readingProgress.toString(),
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Export failed', error);
    }
  }

  // ==================== 配置管理方法 ====================

  getConfig(): RNDReportConfig {
    return { ...this.config };
  }

  async updateConfig(config: Partial<RNDReportConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    // 这里可以持久化配置到IndexedDB
  }

  async resetConfig(): Promise<void> {
    this.config = { ...DEFAULT_RND_REPORT_CONFIG };
  }

  // ==================== 系统方法 ====================

  async healthCheck(): Promise<boolean> {
    try {
      await this.getStorageInfo();
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    totalReports: number;
    totalCategories: number;
    totalStorageUsed: number;
    lastSyncDate?: Date;
  }> {
    try {
      const reports = await this.getAllFromIndexedDB<Report>(this.STORES.REPORTS);
      const categories = await this.getAllFromIndexedDB<Category>(this.STORES.CATEGORIES);
      const totalStorageUsed = reports.reduce((sum, report) => sum + report.fileSize, 0);

      return {
        totalReports: reports.length,
        totalCategories: categories.length,
        totalStorageUsed,
        lastSyncDate: new Date(), // 这里可以从metadata中获取实际的同步时间
      };
    } catch (error) {
      throw this.createError('UNKNOWN_ERROR', 'Failed to get stats', error);
    }
  }

  async syncData(): Promise<void> {
    // 数据同步逻辑（如果需要）
    console.log('Data sync completed');
  }

  async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }

  // ==================== 辅助方法 ====================

  private createError(code: RNDReportErrorCode, message: string, details?: any): RNDReportError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
    };
  }

  private async extractMetadata(content: string): Promise<Report['metadata']> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      const title = doc.querySelector('title')?.textContent?.trim();
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
      const author = doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim();

      return {
        title,
        description,
        author,
      };
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
      return {};
    }
  }

  private applyFilters(reports: Report[], filters: ReportSearchFilters): Report[] {
    return reports.filter(report => {
      // 分类过滤
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        if (!filters.categoryIds.includes(report.categoryId)) {
          return false;
        }
      }

      // 日期范围过滤
      if (filters.dateRange?.start && report.uploadDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange?.end && report.uploadDate > filters.dateRange.end) {
        return false;
      }

      // 文件大小过滤
      if (filters.fileSizeRange?.min && report.fileSize < filters.fileSizeRange.min) {
        return false;
      }
      if (filters.fileSizeRange?.max && report.fileSize > filters.fileSizeRange.max) {
        return false;
      }

      // 阅读进度过滤
      if (filters.readingProgressRange?.min && report.readingProgress < filters.readingProgressRange.min) {
        return false;
      }
      if (filters.readingProgressRange?.max && report.readingProgress > filters.readingProgressRange.max) {
        return false;
      }

      // 搜索查询
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const searchableText = `${report.name} ${report.metadata?.title || ''} ${report.metadata?.description || ''}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  private applySorting(reports: Report[], sortOptions: ReportSortOptions): Report[] {
    return [...reports].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploadDate':
          aValue = a.uploadDate.getTime();
          bValue = b.uploadDate.getTime();
          break;
        case 'lastReadDate':
          aValue = a.lastReadDate?.getTime() || 0;
          bValue = b.lastReadDate?.getTime() || 0;
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'readingProgress':
          aValue = a.readingProgress;
          bValue = b.readingProgress;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOptions.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private async updateCategoryReportCount(categoryId: string, delta: number): Promise<void> {
    try {
      const category = await this.getCategory(categoryId);
      await this.updateCategory(categoryId, {
        reportCount: Math.max(0, category.reportCount + delta),
      });
    } catch (error) {
      // 静默处理错误，避免影响主要操作
      console.warn('Failed to update category report count:', error);
    }
  }

  // ==================== IndexedDB 辅助方法 ====================

  private async storeInIndexedDB<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => {
        console.error('❌ IndexedDB store error:', storeName, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log('✅ Data stored in IndexedDB:', storeName, data);
        resolve();
      };
    });
  }

  private async getFromIndexedDB<T>(storeName: string, key: string | number): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async getAllFromIndexedDB<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error('❌ IndexedDB getAll error:', storeName, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        const result = request.result || [];
        console.log('✅ Data retrieved from IndexedDB:', storeName, result.length, 'items');
        resolve(result);
      };
    });
  }

  private async deleteFromIndexedDB(storeName: string, key: string | number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
