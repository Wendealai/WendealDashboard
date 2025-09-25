/**
 * Cache Manager Component
 * 缓存管理器
 */

import type { DiagnosticConfig } from '@/types/exportDiagnostic';

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  expiryTime: number;
  maxEntries: number;
  compress: boolean;
  memoryLimit: number;
}

/**
 * 缓存条目
 */
export interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
  size: number;
}

/**
 * 缓存管理器类
 */
export class CacheManager {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private memoryUsage = 0;

  constructor(config: DiagnosticConfig) {
    // Convert DiagnosticConfig to CacheConfig
    this.config = {
      enabled: config.enableCache || false,
      expiryTime: config.cacheExpiry || 5 * 60 * 1000,
      maxEntries: 1000,
      compress: false,
      memoryLimit: 50 * 1024 * 1024, // 50MB
    };
  }

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.memoryUsage -= entry.size;
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return;

    const expiry = Date.now() + (ttl || this.config.expiryTime);
    const size = this.estimateSize(data);

    // 检查内存限制
    if (this.memoryUsage + size > this.config.memoryLimit) {
      this.evictOldEntries(size);
    }

    // 检查条目数量限制
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldEntries();
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry,
      size,
    };

    this.cache.set(key, entry);
    this.memoryUsage += size;
  }

  /**
   * 删除缓存条目
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.memoryUsage -= entry.size;
      return true;
    }
    return false;
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.memoryUsage = 0;
  }

  /**
   * 清理过期条目
   */
  async clearExpired(): Promise<number> {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        this.memoryUsage -= entry.size;
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    entries: number;
    memoryUsage: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
  } {
    return {
      entries: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitRate: 0, // TODO: 实现命中率统计
      totalRequests: 0,
      totalHits: 0,
    };
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // 估算为UTF-16编码
    } catch {
      return 1024; // 默认1KB
    }
  }

  /**
   * 驱逐旧条目
   */
  private evictOldEntries(requiredSpace = 0): void {
    // 简单的LRU策略：删除最旧的条目
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    let freedSpace = 0;
    const toDelete: string[] = [];

    for (const [key, entry] of entries) {
      toDelete.push(key);
      freedSpace += entry.size;

      if (
        this.memoryUsage - freedSpace + requiredSpace <=
        this.config.memoryLimit
      ) {
        break;
      }
    }

    toDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.memoryUsage -= entry.size;
      }
    });
  }
}

/**
 * 默认缓存管理器实例
 */
export const cacheManager = new CacheManager({
  filePatterns: ['**/*.{ts,tsx,js,jsx}'],
  ignorePatterns: ['**/node_modules/**'],
  maxDepth: 10,
  timeout: 30000,
  enableCache: true,
  cacheExpiry: 5 * 60 * 1000,
  severityThreshold: 'info' as any,
});
