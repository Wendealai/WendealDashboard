/**
 * File System utilities for R&D Report module
 * Provides local file storage operations with fallback to localStorage
 */

import type { FileSystemEntry } from '../types/rndReport';

/**
 * File System Manager
 * Handles file operations with support for File System Access API and localStorage fallback
 */
export class FileSystemManager {
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private basePath: string;

  constructor(basePath: string = 'rnd-reports') {
    this.basePath = basePath;
  }

  /**
   * Check if File System Access API is supported
   */
  static isFileSystemAPISupported(): boolean {
    return typeof window !== 'undefined' &&
           'showDirectoryPicker' in window &&
           'getAsFileSystemHandle' in DataTransferItem.prototype;
  }

  /**
   * Request directory access
   */
  async requestDirectoryAccess(): Promise<boolean> {
    if (!FileSystemManager.isFileSystemAPISupported()) {
      console.warn('File System Access API not supported, using localStorage fallback');
      return false;
    }

    try {
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Verify we can create the base directory
      await this.ensureBaseDirectory();
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to get directory access:', error);
      }
      return false;
    }
  }

  /**
   * Ensure base directory exists
   */
  private async ensureBaseDirectory(): Promise<void> {
    if (!this.directoryHandle) return;

    try {
      await this.directoryHandle.getDirectoryHandle(this.basePath, { create: true });
    } catch (error) {
      console.error('Failed to create base directory:', error);
    }
  }

  /**
   * Get base directory handle
   */
  private async getBaseDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.directoryHandle) return null;

    try {
      return await this.directoryHandle.getDirectoryHandle(this.basePath, { create: true });
    } catch (error) {
      console.error('Failed to get base directory:', error);
      return null;
    }
  }

  /**
   * Save file content
   */
  async saveFile(fileName: string, content: string): Promise<string> {
    const fileId = this.generateFileId(fileName);

    // Try File System Access API first
    if (this.directoryHandle) {
      try {
        const baseDir = await this.getBaseDirectory();
        if (baseDir) {
          const fileHandle = await baseDir.getFileHandle(fileId, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
          return fileId;
        }
      } catch (error) {
        console.warn('File System API save failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(`rnd-report-file-${fileId}`, content);
      return fileId;
    } catch (error) {
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load file content
   */
  async loadFile(fileId: string): Promise<string> {
    // Try File System Access API first
    if (this.directoryHandle) {
      try {
        const baseDir = await this.getBaseDirectory();
        if (baseDir) {
          const fileHandle = await baseDir.getFileHandle(fileId);
          const file = await fileHandle.getFile();
          return await file.text();
        }
      } catch (error) {
        console.warn('File System API load failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    try {
      const content = localStorage.getItem(`rnd-report-file-${fileId}`);
      if (!content) {
        throw new Error('File not found');
      }
      return content;
    } catch (error) {
      throw new Error(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    // Try File System Access API first
    if (this.directoryHandle) {
      try {
        const baseDir = await this.getBaseDirectory();
        if (baseDir) {
          await baseDir.removeEntry(fileId);
          return;
        }
      } catch (error) {
        console.warn('File System API delete failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.removeItem(`rnd-report-file-${fileId}`);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileId: string): Promise<boolean> {
    try {
      await this.loadFile(fileId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<{
    size: number;
    lastModified: Date;
    exists: boolean;
  }> {
    // Try File System Access API first
    if (this.directoryHandle) {
      try {
        const baseDir = await this.getBaseDirectory();
        if (baseDir) {
          const fileHandle = await baseDir.getFileHandle(fileId);
          const file = await fileHandle.getFile();
          return {
            size: file.size,
            lastModified: new Date(file.lastModified),
            exists: true,
          };
        }
      } catch (error) {
        console.warn('File System API metadata failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    try {
      const content = localStorage.getItem(`rnd-report-file-${fileId}`);
      return {
        size: content ? new Blob([content]).size : 0,
        lastModified: new Date(), // localStorage doesn't track modification time
        exists: !!content,
      };
    } catch {
      return {
        size: 0,
        lastModified: new Date(),
        exists: false,
      };
    }
  }

  /**
   * List files in directory
   */
  async listFiles(): Promise<FileSystemEntry[]> {
    const files: FileSystemEntry[] = [];

    // Try File System Access API first
    if (this.directoryHandle) {
      try {
        const baseDir = await this.getBaseDirectory();
        if (baseDir) {
          for await (const [name, handle] of baseDir.entries()) {
            if (handle.kind === 'file') {
              const file = await handle.getFile();
              files.push({
                name,
                path: `${this.basePath}/${name}`,
                type: file.type,
                size: file.size,
                modifiedAt: new Date(file.lastModified),
                isDirectory: false,
              });
            }
          }
          return files;
        }
      } catch (error) {
        console.warn('File System API list failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('rnd-report-file-')) {
          const fileId = key.replace('rnd-report-file-', '');
          const content = localStorage.getItem(key);
          if (content) {
              files.push({
                name: fileId,
                path: `${this.basePath}/${fileId}`,
                type: 'file',
                size: new Blob([content]).size,
                modifiedAt: new Date(), // localStorage doesn't track modification time
                isDirectory: false,
              });
          }
        }
      }
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    used: number;
    available: number;
    files: number;
  }> {
    try {
      const files = await this.listFiles();
      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

      // Estimate available space (rough approximation)
      const available = this.directoryHandle ? 500 * 1024 * 1024 : 5 * 1024 * 1024; // 500MB or 5MB

      return {
        used: totalSize,
        available,
        files: files.length,
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        used: 0,
        available: 0,
        files: 0,
      };
    }
  }

  /**
   * Clear all files
   */
  async clearAll(): Promise<void> {
    // Try File System Access API first
    if (this.directoryHandle) {
      try {
        const baseDir = await this.getBaseDirectory();
        if (baseDir) {
          for await (const [name, handle] of baseDir.entries()) {
            if (handle.kind === 'file') {
              await baseDir.removeEntry(name);
            }
          }
          return;
        }
      } catch (error) {
        console.warn('File System API clear failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('rnd-report-file-')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      throw new Error(`Failed to clear files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = originalName.split('.').pop() || 'html';
    return `${timestamp}_${random}.${extension}`;
  }

  /**
   * Check if directory access is granted
   */
  hasDirectoryAccess(): boolean {
    return this.directoryHandle !== null;
  }

  /**
   * Revoke directory access
   */
  revokeAccess(): void {
    this.directoryHandle = null;
  }
}

/**
 * File Storage Manager with caching
 * Provides efficient file operations with memory caching
 */
export class CachedFileStorage extends FileSystemManager {
  private cache: Map<string, { content: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(basePath: string = 'rnd-reports') {
    super(basePath);
  }

  /**
   * Load file with caching
   */
  async loadFile(fileId: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(fileId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.content;
    }

    // Load from storage
    const content = await super.loadFile(fileId);

    // Cache the result
    this.cache.set(fileId, { content, timestamp: Date.now() });

    return content;
  }

  /**
   * Save file and update cache
   */
  async saveFile(fileName: string, content: string): Promise<string> {
    const fileId = await super.saveFile(fileName, content);

    // Update cache
    this.cache.set(fileId, { content, timestamp: Date.now() });

    return fileId;
  }

  /**
   * Delete file and remove from cache
   */
  async deleteFile(fileId: string): Promise<void> {
    await super.deleteFile(fileId);

    // Remove from cache
    this.cache.delete(fileId);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

/**
 * File System Utilities
 * Static utility functions for file operations
 */
export class FileSystemUtils {
  /**
   * Validate file size
   */
  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * Get file extension
   */
  static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';
  }

  /**
   * Check if file is HTML
   */
  static isHtmlFile(file: File): boolean {
    const htmlTypes = ['text/html', 'application/xhtml+xml'];
    const htmlExtensions = ['html', 'htm', 'xhtml'];

    return htmlTypes.includes(file.type) ||
           htmlExtensions.includes(this.getFileExtension(file.name));
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Generate file hash for integrity checking
   */
  static async generateFileHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Compress HTML content
   */
  static compressHtml(html: string): string {
    return html
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/>\s+</g, '><')  // Remove whitespace between tags
      .trim();
  }

  /**
   * Estimate file read time
   */
  static estimateReadTime(content: string, wordsPerMinute: number = 200): number {
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Create data URL from file
   */
  static async createDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Download file from URL
   */
  static async downloadFile(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Storage quota utilities
 */
export class StorageQuotaUtils {
  /**
   * Get storage quota information
   */
  static async getQuota(): Promise<{
    available: number;
    used: number;
    quota: number;
  }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          available: estimate.quota ? estimate.quota - (estimate.usage || 0) : 0,
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }

      // Fallback estimation
      return {
        available: 10 * 1024 * 1024, // 10MB estimate
        used: 0,
        quota: 10 * 1024 * 1024,
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      return {
        available: 0,
        used: 0,
        quota: 0,
      };
    }
  }

  /**
   * Check if storage quota is exceeded
   */
  static async isQuotaExceeded(requiredSpace: number): Promise<boolean> {
    const quota = await this.getQuota();
    return requiredSpace > quota.available;
  }

  /**
   * Get storage usage percentage
   */
  static async getUsagePercentage(): Promise<number> {
    const quota = await this.getQuota();
    if (quota.quota === 0) return 0;
    return (quota.used / quota.quota) * 100;
  }
}

// Export singleton instances
export const fileSystemManager = new CachedFileStorage('rnd-reports');
