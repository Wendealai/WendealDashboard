/**
 * IndexedDB utilities for R&D Report module
 * Provides client-side database operations for reports and categories metadata
 */

import type { Report, Category, ReadingProgress } from '../types/rndReport';

/**
 * Database configuration
 */
export interface DBConfig {
  name: string;
  version: number;
  stores: Record<string, StoreConfig>;
}

export interface StoreConfig {
  keyPath: string;
  indexes?: Record<string, IDBIndexParameters>;
}

/**
 * R&D Report Database configuration
 */
export const RND_REPORT_DB_CONFIG: DBConfig = {
  name: 'rnd-reports-db',
  version: 1,
  stores: {
    reports: {
      keyPath: 'id',
      indexes: {
        categoryId: { unique: false },
        uploadDate: { unique: false },
        name: { unique: false },
      },
    },
    categories: {
      keyPath: 'id',
      indexes: {
        name: { unique: true },
      },
    },
    'reading-progress': {
      keyPath: 'reportId',
      indexes: {
        lastReadAt: { unique: false },
      },
    },
    metadata: {
      keyPath: 'key',
    },
  },
};

/**
 * IndexedDB Manager class
 * Handles database operations for R&D Report module
 */
export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private config: DBConfig;

  constructor(config: DBConfig = RND_REPORT_DB_CONFIG) {
    this.config = config;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser'));
        return;
      }

      const request = indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores during database upgrade
   */
  private createObjectStores(db: IDBDatabase): void {
    Object.entries(this.config.stores).forEach(([storeName, storeConfig]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: storeConfig.keyPath,
        });

        // Create indexes
        if (storeConfig.indexes) {
          Object.entries(storeConfig.indexes).forEach(([indexName, indexConfig]) => {
            store.createIndex(indexName, indexName, indexConfig);
          });
        }
      }
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Generic method to get all records from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Generic method to get a record by key
   */
  async get<T>(storeName: string, key: string | number): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Generic method to add a record
   */
  async add<T extends Record<string, any>>(storeName: string, record: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Generic method to update a record
   */
  async put<T extends Record<string, any>>(storeName: string, record: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Generic method to delete a record
   */
  async delete(storeName: string, key: string | number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Query records using an index
   */
  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Clear all records from a store
   */
  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * Report-specific IndexedDB operations
 */
export class ReportIndexedDB extends IndexedDBManager {
  /**
   * Get all reports
   */
  async getAllReports(): Promise<Report[]> {
    return this.getAll<Report>('reports');
  }

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<Report | null> {
    return this.get<Report>('reports', id);
  }

  /**
   * Add a new report
   */
  async addReport(report: Report): Promise<void> {
    await this.add('reports', report);
  }

  /**
   * Update a report
   */
  async updateReport(report: Report): Promise<void> {
    await this.put('reports', report);
  }

  /**
   * Delete a report
   */
  async deleteReport(id: string): Promise<void> {
    await this.delete('reports', id);
  }

  /**
   * Get reports by category
   */
  async getReportsByCategory(categoryId: string): Promise<Report[]> {
    return this.queryByIndex<Report>('reports', 'categoryId', categoryId);
  }

  /**
   * Search reports by name
   */
  async searchReports(query: string): Promise<Report[]> {
    const allReports = await this.getAllReports();
    const searchTerm = query.toLowerCase();

    return allReports.filter(report =>
      report.name.toLowerCase().includes(searchTerm) ||
      report.metadata?.title?.toLowerCase().includes(searchTerm) ||
      report.metadata?.description?.toLowerCase().includes(searchTerm)
    );
  }
}

/**
 * Category-specific IndexedDB operations
 */
export class CategoryIndexedDB extends IndexedDBManager {
  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    return this.getAll<Category>('categories');
  }

  /**
   * Get category by ID
   */
  async getCategory(id: string): Promise<Category | null> {
    return this.get<Category>('categories', id);
  }

  /**
   * Add a new category
   */
  async addCategory(category: Category): Promise<void> {
    await this.add('categories', category);
  }

  /**
   * Update a category
   */
  async updateCategory(category: Category): Promise<void> {
    await this.put('categories', category);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    await this.delete('categories', id);
  }

  /**
   * Check if category name exists
   */
  async categoryNameExists(name: string, excludeId?: string): Promise<boolean> {
    const categories = await this.getAllCategories();
    return categories.some(cat =>
      cat.name.toLowerCase() === name.toLowerCase() &&
      cat.id !== excludeId
    );
  }
}

/**
 * Reading Progress-specific IndexedDB operations
 */
export class ReadingProgressIndexedDB extends IndexedDBManager {
  /**
   * Get reading progress for a report
   */
  async getReadingProgress(reportId: string): Promise<ReadingProgress | null> {
    return this.get<ReadingProgress>('reading-progress', reportId);
  }

  /**
   * Save reading progress
   */
  async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    await this.put('reading-progress', progress);
  }

  /**
   * Delete reading progress
   */
  async deleteReadingProgress(reportId: string): Promise<void> {
    await this.delete('reading-progress', reportId);
  }

  /**
   * Get recently read reports
   */
  async getRecentlyRead(limit: number = 10): Promise<ReadingProgress[]> {
    const allProgress = await this.getAll<ReadingProgress>('reading-progress');
    return allProgress
      .sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
      .slice(0, limit);
  }
}

/**
 * Metadata operations
 */
export class MetadataIndexedDB extends IndexedDBManager {
  /**
   * Get metadata value
   */
  async getMetadata<T>(key: string): Promise<T | null> {
    const result = await this.get<{ key: string; value: T }>('metadata', key);
    return result ? result.value : null;
  }

  /**
   * Set metadata value
   */
  async setMetadata<T>(key: string, value: T): Promise<void> {
    await this.put('metadata', { key, value, timestamp: Date.now() });
  }

  /**
   * Delete metadata
   */
  async deleteMetadata(key: string): Promise<void> {
    await this.delete('metadata', key);
  }

  /**
   * Get all metadata
   */
  async getAllMetadata(): Promise<Record<string, any>> {
    const items = await this.getAll<{ key: string; value: any }>('metadata');
    return items.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, any>);
  }
}

/**
 * Database utilities
 */
export class IndexedDBUtils {
  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.indexedDB;
  }

  /**
   * Get database usage estimate
   */
  static async getStorageEstimate(): Promise<{
    available: number;
    used: number;
    quota: number;
  }> {
    if (!navigator.storage?.estimate) {
      return { available: 0, used: 0, quota: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        available: estimate.quota ? estimate.quota - (estimate.usage || 0) : 0,
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch {
      return { available: 0, used: 0, quota: 0 };
    }
  }

  /**
   * Clear all data from IndexedDB
   */
  static async clearDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Export database data
   */
  static async exportDatabase(manager: IndexedDBManager): Promise<{
    reports: Report[];
    categories: Category[];
    readingProgress: ReadingProgress[];
    metadata: Record<string, any>;
  }> {
    if (!manager.isInitialized()) {
      throw new Error('Database not initialized');
    }

    const [reports, categories, readingProgress, metadata] = await Promise.all([
      (manager as any).getAll('reports'),
      (manager as any).getAll('categories'),
      (manager as any).getAll('reading-progress'),
      (new MetadataIndexedDB()).getAllMetadata(),
    ]);

    return {
      reports,
      categories,
      readingProgress,
      metadata,
    };
  }
}

// Export singleton instances
export const reportDB = new ReportIndexedDB();
export const categoryDB = new CategoryIndexedDB();
export const readingProgressDB = new ReadingProgressIndexedDB();
export const metadataDB = new MetadataIndexedDB();
