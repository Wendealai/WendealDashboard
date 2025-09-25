// R&D Report Service Interface
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
} from '../types/rndReport';

/**
 * R&D Report 服务抽象接口
 * 为R&D Report模块提供统一的服务接口契约
 */
export interface IRNDReportService {
  /**
   * 初始化R&D Report服务
   * @param config 服务配置
   */
  initialize(config: RNDReportConfig): Promise<void>;

  // ==================== 文件操作方法 ====================

  /**
   * 验证文件
   * @param file 要验证的文件
   * @returns 文件验证结果
   */
  validateFile(file: File): Promise<FileValidationResult>;

  /**
   * 上传和处理文件
   * @param file 要上传的文件
   * @param categoryId 可选的分类ID
   * @returns 文件处理结果
   */
  uploadFile(file: File, categoryId?: string): Promise<FileProcessingResult>;

  /**
   * 删除报告
   * @param reportId 报告ID
   */
  deleteReport(reportId: string): Promise<void>;

  /**
   * 获取报告文件内容
   * @param reportId 报告ID
   * @returns 文件内容
   */
  getReportContent(reportId: string): Promise<string>;

  // ==================== 报告管理方法 ====================

  /**
   * 获取报告列表
   * @param filters 搜索过滤器
   * @param sortOptions 排序选项
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 报告列表响应
   */
  getReports(
    filters?: ReportSearchFilters,
    sortOptions?: ReportSortOptions,
    page?: number,
    pageSize?: number
  ): Promise<ReportListResponse>;

  /**
   * 获取单个报告
   * @param reportId 报告ID
   * @returns 报告信息
   */
  getReport(reportId: string): Promise<Report>;

  /**
   * 更新报告信息
   * @param reportId 报告ID
   * @param updates 更新数据
   * @returns 更新后的报告
   */
  updateReport(reportId: string, updates: Partial<Report>): Promise<Report>;

  /**
   * 搜索报告
   * @param query 搜索查询
   * @param filters 额外的过滤器
   * @returns 搜索结果
   */
  searchReports(
    query: string,
    filters?: ReportSearchFilters
  ): Promise<ReportListResponse>;

  // ==================== 分类管理方法 ====================

  /**
   * 获取分类列表
   * @returns 分类列表响应
   */
  getCategories(): Promise<CategoryListResponse>;

  /**
   * 获取单个分类
   * @param categoryId 分类ID
   * @returns 分类信息
   */
  getCategory(categoryId: string): Promise<Category>;

  /**
   * 创建新分类
   * @param category 分类数据
   * @returns 创建的分类
   */
  createCategory(
    category: Omit<Category, 'id' | 'createdDate' | 'reportCount'>
  ): Promise<Category>;

  /**
   * 更新分类
   * @param categoryId 分类ID
   * @param updates 更新数据
   * @returns 更新后的分类
   */
  updateCategory(
    categoryId: string,
    updates: Partial<Category>
  ): Promise<Category>;

  /**
   * 删除分类
   * @param categoryId 分类ID
   */
  deleteCategory(categoryId: string): Promise<void>;

  // ==================== 阅读进度管理方法 ====================

  /**
   * 获取阅读进度
   * @param reportId 报告ID
   * @returns 阅读进度信息
   */
  getReadingProgress(reportId: string): Promise<ReadingProgress>;

  /**
   * 更新阅读进度
   * @param reportId 报告ID
   * @param progress 阅读进度数据
   * @returns 更新后的阅读进度
   */
  updateReadingProgress(
    reportId: string,
    progress: Partial<ReadingProgress>
  ): Promise<ReadingProgress>;

  /**
   * 添加书签
   * @param reportId 报告ID
   * @param bookmark 书签数据
   * @returns 添加的书签
   */
  addBookmark(
    reportId: string,
    bookmark: Omit<ReadingProgress['bookmarks'][0], 'id' | 'createdAt'>
  ): Promise<ReadingProgress['bookmarks'][0]>;

  /**
   * 删除书签
   * @param reportId 报告ID
   * @param bookmarkId 书签ID
   */
  removeBookmark(reportId: string, bookmarkId: string): Promise<void>;

  // ==================== 存储管理方法 ====================

  /**
   * 获取存储信息
   * @returns 存储使用情况
   */
  getStorageInfo(): Promise<StorageInfo>;

  /**
   * 清理存储空间
   * @param olderThanDays 删除超过指定天数的文件
   * @returns 清理结果
   */
  cleanupStorage(
    olderThanDays?: number
  ): Promise<{ deletedCount: number; freedSpace: number }>;

  /**
   * 导出报告数据
   * @param reportIds 要导出的报告ID列表
   * @param format 导出格式
   * @returns 导出文件路径
   */
  exportReports(reportIds: string[], format: 'json' | 'csv'): Promise<string>;

  // ==================== 配置管理方法 ====================

  /**
   * 获取服务配置
   * @returns 当前配置
   */
  getConfig(): RNDReportConfig;

  /**
   * 更新服务配置
   * @param config 新配置
   */
  updateConfig(config: Partial<RNDReportConfig>): Promise<void>;

  /**
   * 重置为默认配置
   */
  resetConfig(): Promise<void>;

  // ==================== 系统方法 ====================

  /**
   * 验证服务健康状态
   * @returns 服务是否正常运行
   */
  healthCheck(): Promise<boolean>;

  /**
   * 获取服务统计信息
   * @returns 统计数据
   */
  getStats(): Promise<{
    totalReports: number;
    totalCategories: number;
    totalStorageUsed: number;
    lastSyncDate?: Date;
  }>;

  /**
   * 同步数据（如果适用）
   */
  syncData(): Promise<void>;

  /**
   * 关闭服务并清理资源
   */
  dispose(): Promise<void>;
}

/**
 * RNDReport服务工厂接口
 * 用于创建不同类型的RNDReport服务实例
 */
export interface IRNDReportServiceFactory {
  /**
   * 创建RNDReport服务实例
   * @param config 服务配置
   * @returns RNDReport服务实例
   */
  createRNDReportService(config: RNDReportConfig): IRNDReportService;
}

/**
 * RNDReport服务提供者接口
 * 用于依赖注入和服务管理
 */
export interface IRNDReportServiceProvider {
  /**
   * 获取当前RNDReport服务实例
   * @returns RNDReport服务实例
   */
  getRNDReportService(): IRNDReportService;

  /**
   * 设置RNDReport服务实例
   * @param service RNDReport服务实例
   */
  setRNDReportService(service: IRNDReportService): void;

  /**
   * 重新配置服务
   * @param config 新配置
   */
  reconfigureService(config: Partial<RNDReportConfig>): Promise<void>;
}
