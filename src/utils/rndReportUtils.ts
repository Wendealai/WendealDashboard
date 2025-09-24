// R&D Report Utility Functions
import type {
  FileValidationResult,
  ReportMetadata,
  RNDReportConfig,
  FileProcessingOptions,
  Report,
  Category,
} from '../types/rndReport';
import { DEFAULT_RND_REPORT_CONFIG } from '../types/rndReport';

/**
 * 文件处理工具类
 * 提供HTML文件验证、元数据提取等功能
 */
export class FileProcessingUtils {
  /**
   * 验证HTML文件
   * @param file 要验证的文件
   * @param config RNDReport配置
   * @returns 验证结果
   */
  static async validateHtmlFile(
    file: File,
    config: RNDReportConfig = DEFAULT_RND_REPORT_CONFIG
  ): Promise<FileValidationResult> {
    try {
      // 检查文件类型
      const allowedExtensions = ['.html', '.htm'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext =>
        fileName.endsWith(ext)
      );

      if (
        !hasValidExtension &&
        !config.allowedFileTypes.some(type => file.type === type)
      ) {
        return {
          isValid: false,
          error:
            'Invalid file type. Only HTML files (.html, .htm) are allowed.',
        };
      }

      // 检查文件大小
      if (file.size > config.maxFileSize) {
        const maxSizeMB = config.maxFileSize / (1024 * 1024);
        return {
          isValid: false,
          error: `File size exceeds limit of ${maxSizeMB}MB`,
        };
      }

      // 检查文件内容
      const content = await file.text();
      if (!content.trim()) {
        return {
          isValid: false,
          error: 'File is empty',
        };
      }

      // 验证HTML结构
      if (!this.isValidHtml(content)) {
        return {
          isValid: false,
          error: 'Invalid HTML structure',
        };
      }

      return {
        isValid: true,
        fileType: file.type || 'text/html',
        fileSize: file.size,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * 验证HTML内容结构
   * @param content HTML内容
   * @returns 是否为有效HTML
   */
  private static isValidHtml(content: string): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // 检查是否有解析错误
      const parseErrors = doc.querySelectorAll('parsererror');
      if (parseErrors.length > 0) {
        return false;
      }

      // 检查是否有基本的HTML结构
      return doc.body !== null || doc.head !== null;
    } catch {
      return false;
    }
  }

  /**
   * 从HTML内容中提取元数据
   * @param content HTML内容
   * @returns 提取的元数据
   */
  static async extractHtmlMetadata(content: string): Promise<ReportMetadata> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // 提取标题
      const title = this.extractTitle(doc);

      // 提取描述
      const description = this.extractDescription(doc);

      // 提取作者
      const author = this.extractAuthor(doc);

      // 提取关键词
      const keywords = this.extractKeywords(doc);

      // 提取创建日期
      const createdDate = this.extractCreatedDate(doc);

      // 提取版本
      const version = this.extractVersion(doc);

      return {
        title: title || '',
        description: description || '',
        author: author || '',
        keywords: keywords || [],
        createdDate: createdDate || new Date(),
        version: version || '1.0',
      };
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
      return {};
    }
  }

  /**
   * 提取文档标题
   */
  private static extractTitle(doc: Document): string | undefined {
    // 优先级：title标签 > h1标签 > og:title > twitter:title
    const titleTag = doc.querySelector('title');
    if (titleTag?.textContent?.trim()) {
      return titleTag.textContent.trim();
    }

    const h1Tag = doc.querySelector('h1');
    if (h1Tag?.textContent?.trim()) {
      return h1Tag.textContent.trim();
    }

    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle?.getAttribute('content')?.trim()) {
      return ogTitle.getAttribute('content')!.trim();
    }

    const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
    if (twitterTitle?.getAttribute('content')?.trim()) {
      return twitterTitle.getAttribute('content')!.trim();
    }

    return undefined;
  }

  /**
   * 提取文档描述
   */
  private static extractDescription(doc: Document): string | undefined {
    // 优先级：description meta > og:description > twitter:description
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc?.getAttribute('content')?.trim()) {
      return metaDesc.getAttribute('content')!.trim();
    }

    const ogDesc = doc.querySelector('meta[property="og:description"]');
    if (ogDesc?.getAttribute('content')?.trim()) {
      return ogDesc.getAttribute('content')!.trim();
    }

    const twitterDesc = doc.querySelector('meta[name="twitter:description"]');
    if (twitterDesc?.getAttribute('content')?.trim()) {
      return twitterDesc.getAttribute('content')!.trim();
    }

    return undefined;
  }

  /**
   * 提取作者信息
   */
  private static extractAuthor(doc: Document): string | undefined {
    // 优先级：author meta > dc:creator > article author
    const metaAuthor = doc.querySelector('meta[name="author"]');
    if (metaAuthor?.getAttribute('content')?.trim()) {
      return metaAuthor.getAttribute('content')!.trim();
    }

    const dcCreator = doc.querySelector('meta[name="dc:creator"]');
    if (dcCreator?.getAttribute('content')?.trim()) {
      return dcCreator.getAttribute('content')!.trim();
    }

    const articleAuthor = doc.querySelector('article [itemprop="author"]');
    if (articleAuthor?.textContent?.trim()) {
      return articleAuthor.textContent.trim();
    }

    return undefined;
  }

  /**
   * 提取关键词
   */
  private static extractKeywords(doc: Document): string[] | undefined {
    const keywordsMeta = doc.querySelector('meta[name="keywords"]');
    if (keywordsMeta?.getAttribute('content')) {
      const keywords = keywordsMeta
        .getAttribute('content')!
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      return keywords.length > 0 ? keywords : undefined;
    }
    return undefined;
  }

  /**
   * 提取创建日期
   */
  private static extractCreatedDate(doc: Document): Date | undefined {
    // 尝试多种日期格式
    const dateSelectors = [
      'meta[name="created"]',
      'meta[name="date"]',
      'meta[name="publish-date"]',
      'meta[property="article:published_time"]',
      'time[datetime]',
      '[itemprop="datePublished"]',
    ];

    for (const selector of dateSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const dateValue =
          element.getAttribute('content') ||
          element.getAttribute('datetime') ||
          element.getAttribute('value') ||
          element.textContent;

        if (dateValue) {
          const date = new Date(dateValue.trim());
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 提取版本信息
   */
  private static extractVersion(doc: Document): string | undefined {
    const versionMeta = doc.querySelector('meta[name="version"]');
    if (versionMeta?.getAttribute('content')?.trim()) {
      return versionMeta.getAttribute('content')!.trim();
    }

    const generatorMeta = doc.querySelector('meta[name="generator"]');
    if (generatorMeta?.getAttribute('content')?.trim()) {
      return generatorMeta.getAttribute('content')!.trim();
    }

    return undefined;
  }

  /**
   * 计算文件大小的可读格式
   * @param bytes 文件大小（字节）
   * @returns 可读的文件大小字符串
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证文件名的安全性
   * @param fileName 文件名
   * @returns 是否安全
   */
  static isSafeFileName(fileName: string): boolean {
    // 检查是否包含危险字符
    const dangerousChars = /[<>:"\/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return false;
    }

    // 检查是否是保留名称
    const reservedNames = [
      'CON',
      'PRN',
      'AUX',
      'NUL',
      'COM1',
      'COM2',
      'COM3',
      'COM4',
      'COM5',
      'COM6',
      'COM7',
      'COM8',
      'COM9',
      'LPT1',
      'LPT2',
      'LPT3',
      'LPT4',
      'LPT5',
      'LPT6',
      'LPT7',
      'LPT8',
      'LPT9',
    ];

    const nameWithoutExt = fileName.split('.')[0]?.toUpperCase();
    if (nameWithoutExt && reservedNames.includes(nameWithoutExt as string)) {
      return false;
    }

    // 检查长度
    if (fileName.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * 生成安全的文件名
   * @param originalName 原始文件名
   * @returns 安全的文件名
   */
  static generateSafeFileName(originalName: string): string {
    // 移除或替换危险字符
    let safeName = originalName.replace(/[<>:"\/\\|?*\x00-\x1f]/g, '_');

    // 移除开头的点或空格
    safeName = safeName.replace(/^[\s.]+/, '');

    // 确保不为空
    if (!safeName) {
      safeName = 'unnamed_file';
    }

    // 限制长度
    if (safeName.length > 255) {
      const extIndex = safeName.lastIndexOf('.');
      if (extIndex > 0) {
        const ext = safeName.substring(extIndex);
        const nameWithoutExt = safeName.substring(0, extIndex);
        safeName = nameWithoutExt.substring(0, 255 - ext.length) + ext;
      } else {
        safeName = safeName.substring(0, 255);
      }
    }

    return safeName;
  }

  /**
   * 计算阅读进度百分比
   * @param scrollTop 当前滚动位置
   * @param scrollHeight 总滚动高度
   * @param clientHeight 可见区域高度
   * @returns 阅读进度百分比 (0-100)
   */
  static calculateReadingProgress(
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number
  ): number {
    if (scrollHeight <= clientHeight) {
      return 100; // 内容完全可见
    }

    const maxScrollTop = scrollHeight - clientHeight;
    const progress = (scrollTop / maxScrollTop) * 100;

    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  /**
   * 生成报告ID
   * @param prefix ID前缀
   * @returns 唯一的报告ID
   */
  static generateReportId(prefix = 'report'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 生成分类ID
   * @param prefix ID前缀
   * @returns 唯一的分类ID
   */
  static generateCategoryId(prefix = 'category'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 格式化日期为可读字符串
   * @param date 日期对象
   * @returns 格式化的日期字符串
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 验证URL格式
   * @param url URL字符串
   * @returns 是否为有效URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 提取URL中的域名
   * @param url URL字符串
   * @returns 域名
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * 检查浏览器是否支持所需的功能
   * @returns 支持情况报告
   */
  static checkBrowserSupport(): {
    indexedDB: boolean;
    fileReader: boolean;
    localStorage: boolean;
    fileSystemAPI: boolean;
  } {
    return {
      indexedDB: typeof indexedDB !== 'undefined',
      fileReader: typeof FileReader !== 'undefined',
      localStorage: typeof localStorage !== 'undefined',
      fileSystemAPI:
        typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    };
  }

  /**
   * 清理HTML内容中的潜在安全风险
   * @param htmlContent HTML内容
   * @returns 清理后的HTML内容
   */
  static sanitizeHtmlContent(htmlContent: string): string {
    // 移除script标签
    let sanitized = htmlContent.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );

    // 移除javascript: URLs
    sanitized = sanitized.replace(/javascript:[^"']*/gi, '#');

    // 移除on*事件处理器
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');

    // 移除form标签（防止意外提交）
    sanitized = sanitized.replace(
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
      ''
    );

    return sanitized;
  }

  /**
   * 压缩HTML内容（移除不必要的空白）
   * @param htmlContent HTML内容
   * @returns 压缩后的HTML内容
   */
  static compressHtmlContent(htmlContent: string): string {
    return htmlContent
      .replace(/\s+/g, ' ') // 将多个空白字符替换为单个空格
      .replace(/>\s+</g, '><') // 移除标签间的空白
      .trim();
  }

  /**
   * 估算HTML文档的阅读时间
   * @param htmlContent HTML内容
   * @param wordsPerMinute 阅读速度（词/分钟）
   * @returns 估算的阅读时间（分钟）
   */
  static estimateReadingTime(
    htmlContent: string,
    wordsPerMinute = 200
  ): number {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // 提取主要文本内容
      const textContent = doc.body?.textContent || '';

      // 计算词数（简单估算）
      const words = textContent.trim().split(/\s+/).length;

      // 估算阅读时间
      const readingTime = Math.ceil(words / wordsPerMinute);

      return Math.max(1, readingTime); // 最少1分钟
    } catch {
      return 1; // 默认1分钟
    }
  }
}

/**
 * 数组和集合工具函数
 */
export class CollectionUtils {
  /**
   * 从数组中移除重复项
   * @param array 原始数组
   * @param keySelector 用于比较的键选择器
   * @returns 去重后的数组
   */
  static distinctBy<T, K>(array: T[], keySelector: (item: T) => K): T[] {
    const seen = new Set<K>();
    return array.filter(item => {
      const key = keySelector(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 分组数组元素
   * @param array 原始数组
   * @param keySelector 分组键选择器
   * @returns 分组后的对象
   */
  static groupBy<T, K extends string | number | symbol>(
    array: T[],
    keySelector: (item: T) => K
  ): Record<K, T[]> {
    return array.reduce(
      (groups, item) => {
        const key = keySelector(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      },
      {} as Record<K, T[]>
    );
  }

  /**
   * 排序数组
   * @param array 原始数组
   * @param keySelector 排序键选择器
   * @param direction 排序方向
   * @returns 排序后的数组
   */
  static sortBy<T>(
    array: T[],
    keySelector: (item: T) => any,
    direction: 'asc' | 'desc' = 'asc'
  ): T[] {
    return [...array].sort((a, b) => {
      const aValue = keySelector(a);
      const bValue = keySelector(b);

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

/**
 * 日期和时间工具函数
 */
export class DateUtils {
  /**
   * 获取相对时间字符串
   * @param date 日期对象
   * @returns 相对时间字符串
   */
  static getRelativeTimeString(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  }

  /**
   * 检查日期是否在范围内
   * @param date 要检查的日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 是否在范围内
   */
  static isDateInRange(date: Date, startDate?: Date, endDate?: Date): boolean {
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  }

  /**
   * 获取日期范围
   * @param days 天数
   * @returns 日期范围对象
   */
  static getDateRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return { start, end };
  }
}

/**
 * 存储工具函数
 */
export class StorageUtils {
  /**
   * 检查存储配额
   * @returns 存储配额信息
   */
  static async checkStorageQuota(): Promise<{
    available: number;
    used: number;
    quota: number;
  }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          available: estimate.quota
            ? estimate.quota - (estimate.usage || 0)
            : 0,
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
    } catch (error) {
      console.warn('Failed to check storage quota:', error);
    }

    return {
      available: 0,
      used: 0,
      quota: 0,
    };
  }

  /**
   * 清理过期的存储项
   * @param keyPrefix 键前缀
   * @param maxAge 最大年龄（毫秒）
   */
  static cleanupExpiredItems(keyPrefix: string, maxAge: number): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (key.startsWith(keyPrefix)) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            if (item.timestamp && now - item.timestamp > maxAge) {
              localStorage.removeItem(key);
            }
          } catch {
            // 忽略解析错误的项目
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup expired items:', error);
    }
  }
}
