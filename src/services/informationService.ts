/**
 * 信息数据服务
 * 提供信息数据的获取、创建、更新、删除和统计功能
 */

import { api } from './api';
import type {
  InformationItem,
  InformationQueryParams,
  InformationStats,
  InformationListResponse,
  ApiResponse,
  // PaginatedResponse,
} from '@/pages/InformationDashboard/types';
import type {
  RedditPost,
  RedditDataFilter,
  RedditDataSort,
  RedditApiResponse,
  // WorkflowStatus,
} from '@/types';

/**
 * 信息数据服务类
 */
class InformationService {
  private readonly baseUrl = '/api/information';

  /**
   * 获取信息数据列表
   * @param params 查询参数
   * @returns 信息数据列表响应
   */
  async getInformationList(
    params: InformationQueryParams = {}
  ): Promise<InformationListResponse> {
    try {
      const response = await api.get<InformationListResponse>(this.baseUrl, {
        params: this.formatQueryParams(params),
      });
      return response.data;
    } catch (error) {
      console.error('获取信息列表失败:', error);
      // 返回模拟数据作为降级方案
      return this.getMockInformationList(params);
    }
  }

  /**
   * 格式化查询参数
   * @param params 原始查询参数
   * @returns 格式化后的查询参数
   */
  private formatQueryParams(
    params: InformationQueryParams
  ): Record<string, any> {
    const formattedParams: Record<string, any> = {};

    if (params.page) formattedParams.page = params.page;
    if (params.pageSize) formattedParams.pageSize = params.pageSize;
    if (params.search) formattedParams.search = params.search;
    if (params.category) formattedParams.category = params.category;
    if (params.type) formattedParams.type = params.type;
    if (params.priority) formattedParams.priority = params.priority;
    if (params.status) formattedParams.status = params.status;
    if (params.tags && params.tags.length > 0)
      formattedParams.tags = params.tags.join(',');
    if (params.dateRange) {
      formattedParams.startDate = params.dateRange.start;
      formattedParams.endDate = params.dateRange.end;
    }
    if (params.sortBy) formattedParams.sortBy = params.sortBy;
    if (params.sortOrder) formattedParams.sortOrder = params.sortOrder;

    return formattedParams;
  }

  /**
   * 获取模拟信息数据列表（降级方案）
   * @param params 查询参数
   * @returns 模拟数据响应
   */
  private getMockInformationList(
    params: InformationQueryParams
  ): InformationListResponse {
    const mockData: InformationItem[] = [
      {
        id: '1',
        title: '系统状态报告',
        content:
          '系统运行正常，所有服务可用。CPU使用率: 45%, 内存使用率: 62%, 磁盘使用率: 78%',
        type: 'text',
        category: '系统监控',
        source: '监控系统',
        priority: 'medium',
        status: 'active',
        tags: ['系统', '监控', '状态'],
        metadata: {
          cpu: 45,
          memory: 62,
          disk: 78,
        },
        createdAt: '2024-01-15T15:00:00Z',
        updatedAt: '2024-01-15T15:00:00Z',
        createdBy: {
          id: 'system',
          name: '系统',
        },
      },
      {
        id: '2',
        title: '用户注册数量',
        content: '1250',
        type: 'number',
        category: '业务数据',
        source: '用户管理系统',
        priority: 'high',
        status: 'active',
        tags: ['用户', '注册', '统计'],
        metadata: {
          trend: 'up',
          change: '+15%',
        },
        createdAt: '2024-01-15T14:30:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        createdBy: {
          id: 'user1',
          name: '张三',
          avatar: '',
        },
      },
      {
        id: '3',
        title: '最新产品发布',
        content: 'https://example.com/product/new-release',
        type: 'url',
        category: '产品信息',
        source: '产品管理系统',
        priority: 'urgent',
        status: 'active',
        tags: ['产品', '发布', '链接'],
        createdAt: '2024-01-15T13:00:00Z',
        updatedAt: '2024-01-15T13:00:00Z',
        createdBy: {
          id: 'user2',
          name: '李四',
          avatar: '',
        },
      },
      {
        id: '4',
        title: '数据备份完成时间',
        content: '2024-01-15T12:00:00Z',
        type: 'date',
        category: '系统维护',
        source: '备份系统',
        priority: 'low',
        status: 'active',
        tags: ['备份', '维护'],
        createdAt: '2024-01-15T12:05:00Z',
        updatedAt: '2024-01-15T12:05:00Z',
        createdBy: {
          id: 'system',
          name: '系统',
        },
      },
      {
        id: '5',
        title: '用户反馈数据',
        content:
          '{"satisfaction": 4.5, "total_reviews": 320, "categories": {"ui": 4.2, "performance": 4.8, "features": 4.3}}',
        type: 'json',
        category: '用户反馈',
        source: '反馈系统',
        priority: 'medium',
        status: 'active',
        tags: ['反馈', 'JSON', '统计'],
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        createdBy: {
          id: 'user3',
          name: '王五',
          avatar: '',
        },
      },
    ];

    // 应用过滤器
    let filteredData = mockData;

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = filteredData.filter(
        item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
      );
    }

    if (params.category) {
      filteredData = filteredData.filter(
        item => item.category === params.category
      );
    }

    if (params.type) {
      filteredData = filteredData.filter(item => item.type === params.type);
    }

    if (params.priority) {
      filteredData = filteredData.filter(
        item => item.priority === params.priority
      );
    }

    if (params.status) {
      filteredData = filteredData.filter(item => item.status === params.status);
    }

    if (params.tags && params.tags.length > 0) {
      filteredData = filteredData.filter(item =>
        params.tags!.some(tag => item.tags?.includes(tag))
      );
    }

    // 应用排序
    if (params.sortBy) {
      filteredData.sort((a, b) => {
        let aValue: any = a[params.sortBy as keyof InformationItem];
        let bValue: any = b[params.sortBy as keyof InformationItem];

        if (params.sortBy === 'createdAt' || params.sortBy === 'updatedAt') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (params.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    // 应用分页
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        items: paginatedData,
        total: filteredData.length,
        page,
        pageSize,
      },
      message: '获取信息列表成功',
    };
  }

  /**
   * 获取单个信息详情
   * @param id 信息ID
   * @returns 信息详情
   */
  async getInformation(id: string): Promise<ApiResponse<InformationItem>> {
    try {
      const response = await api.get<ApiResponse<InformationItem>>(
        `${this.baseUrl}/${id}`
      );
      return response.data;
    } catch (error) {
      console.error('获取信息详情失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取信息详情失败'
      );
    }
  }

  /**
   * 创建新信息
   * @param data 信息数据
   * @returns 创建结果
   */
  async createInformation(
    data: Omit<InformationItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<InformationItem>> {
    try {
      const response = await api.post<ApiResponse<InformationItem>>(
        this.baseUrl,
        data
      );
      return response.data;
    } catch (error) {
      console.error('创建信息失败:', error);
      throw new Error(error instanceof Error ? error.message : '创建信息失败');
    }
  }

  /**
   * 更新信息
   * @param id 信息ID
   * @param data 更新数据
   * @returns 更新结果
   */
  async updateInformation(
    id: string,
    data: Partial<InformationItem>
  ): Promise<ApiResponse<InformationItem>> {
    try {
      const response = await api.put<ApiResponse<InformationItem>>(
        `${this.baseUrl}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('更新信息失败:', error);
      throw new Error(error instanceof Error ? error.message : '更新信息失败');
    }
  }

  /**
   * 删除信息
   * @param id 信息ID
   * @returns 删除结果
   */
  async deleteInformation(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<ApiResponse<void>>(
        `${this.baseUrl}/${id}`
      );
      return response.data;
    } catch (error) {
      console.error('删除信息失败:', error);
      throw new Error(error instanceof Error ? error.message : '删除信息失败');
    }
  }

  /**
   * 批量删除信息
   * @param ids 信息ID列表
   * @returns 删除结果
   */
  async batchDeleteInformation(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await api.post<ApiResponse<void>>(
        `${this.baseUrl}/batch-delete`,
        { ids }
      );
      return response.data;
    } catch (error) {
      console.error('批量删除信息失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '批量删除信息失败'
      );
    }
  }

  /**
   * 获取信息统计数据
   * @param dateRange 日期范围（可选）
   * @returns 统计数据
   */
  async getInformationStats(dateRange?: {
    start: string;
    end: string;
  }): Promise<ApiResponse<InformationStats>> {
    try {
      const params = dateRange
        ? {
            startDate: dateRange.start,
            endDate: dateRange.end,
          }
        : {};

      const response = await api.get<ApiResponse<InformationStats>>(
        `${this.baseUrl}/stats`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 返回模拟统计数据
      return this.getMockInformationStats();
    }
  }

  /**
   * 获取模拟统计数据（降级方案）
   * @returns 模拟统计数据
   */
  private getMockInformationStats(): ApiResponse<InformationStats> {
    return {
      success: true,
      data: {
        total: 1250,
        byCategory: {
          系统监控: 450,
          业务数据: 380,
          用户反馈: 220,
          产品信息: 120,
          系统维护: 80,
        },
        byType: {
          text: 800,
          number: 200,
          date: 150,
          url: 70,
          json: 20,
          image: 10,
        },
        byPriority: {
          urgent: 50,
          high: 200,
          medium: 600,
          low: 400,
        },
        byStatus: {
          active: 1000,
          archived: 200,
          draft: 50,
        },
        recentCount: 25,
        trendData: [
          { date: '2024-01-08', count: 12 },
          { date: '2024-01-09', count: 18 },
          { date: '2024-01-10', count: 15 },
          { date: '2024-01-11', count: 22 },
          { date: '2024-01-12', count: 18 },
          { date: '2024-01-13', count: 25 },
          { date: '2024-01-14', count: 20 },
          { date: '2024-01-15', count: 28 },
        ],
      },
      message: '获取统计数据成功',
    };
  }

  /**
   * 获取分类列表
   * @returns 分类列表
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    try {
      const response = await api.get<ApiResponse<string[]>>(
        `${this.baseUrl}/categories`
      );
      return response.data;
    } catch (error) {
      console.error('获取分类列表失败:', error);
      // 返回默认分类
      return {
        success: true,
        data: [
          '系统监控',
          '业务数据',
          '用户反馈',
          '产品信息',
          '系统维护',
          '其他',
        ],
        message: '获取分类列表成功',
      };
    }
  }

  /**
   * 获取标签列表
   * @returns 标签列表
   */
  async getTags(): Promise<ApiResponse<string[]>> {
    try {
      const response = await api.get<ApiResponse<string[]>>(
        `${this.baseUrl}/tags`
      );
      return response.data;
    } catch (error) {
      console.error('获取标签列表失败:', error);
      // 返回默认标签
      return {
        success: true,
        data: [
          '系统',
          '监控',
          '状态',
          '用户',
          '注册',
          '统计',
          '产品',
          '发布',
          '链接',
          '备份',
          '维护',
          '反馈',
          'JSON',
          '数据',
          '报告',
          '性能',
          '安全',
          '更新',
        ],
        message: '获取标签列表成功',
      };
    }
  }

  /**
   * 搜索信息
   * @param query 搜索关键词
   * @param filters 过滤条件
   * @returns 搜索结果
   */
  async searchInformation(
    query: string,
    filters?: Partial<InformationQueryParams>
  ): Promise<InformationListResponse> {
    const params: InformationQueryParams = {
      search: query,
      ...filters,
    };

    return this.getInformationList(params);
  }

  /**
   * 导出信息数据
   * @param params 查询参数
   * @param format 导出格式
   * @returns 导出结果
   */
  async exportInformation(
    params: InformationQueryParams,
    format: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseUrl}/export`, {
        params: {
          ...this.formatQueryParams(params),
          format,
        },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('导出信息数据失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '导出信息数据失败'
      );
    }
  }

  /**
   * 导入信息数据
   * @param file 导入文件
   * @param options 导入选项
   * @returns 导入结果
   */
  async importInformation(
    file: File,
    options?: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    }
  ): Promise<
    ApiResponse<{ imported: number; skipped: number; errors: string[] }>
  > {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (options) {
        formData.append('options', JSON.stringify(options));
      }

      const response = await api.post<
        ApiResponse<{ imported: number; skipped: number; errors: string[] }>
      >(`${this.baseUrl}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('导入信息数据失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '导入信息数据失败'
      );
    }
  }

  // ==================== Reddit数据特定方法 ====================

  /**
   * 获取Reddit帖子数据
   * @param filter 过滤条件
   * @param sort 排序条件
   * @returns Reddit帖子列表
   */
  async getRedditPosts(
    filter?: RedditDataFilter,
    sort?: RedditDataSort
  ): Promise<RedditApiResponse<{ posts: RedditPost[]; total: number }>> {
    try {
      const params: Record<string, any> = {};

      // 应用过滤条件
      if (filter) {
        if (filter.subreddits && filter.subreddits.length > 0) {
          params.subreddits = filter.subreddits.join(',');
        }
        if (filter.minScore !== undefined) params.minScore = filter.minScore;
        if (filter.maxScore !== undefined) params.maxScore = filter.maxScore;
        if (filter.dateRange) {
          params.startDate = filter.dateRange.start;
          params.endDate = filter.dateRange.end;
        }
        if (filter.includeNsfw !== undefined)
          params.includeNsfw = filter.includeNsfw;
        if (filter.includeStickied !== undefined)
          params.includeStickied = filter.includeStickied;
        if (filter.keywords && filter.keywords.length > 0) {
          params.keywords = filter.keywords.join(',');
        }
        if (filter.authors && filter.authors.length > 0) {
          params.authors = filter.authors.join(',');
        }
        if (filter.domains && filter.domains.length > 0) {
          params.domains = filter.domains.join(',');
        }
      }

      // 应用排序条件
      if (sort) {
        params.sortBy = sort.field;
        params.sortOrder = sort.order;
        if (sort.timeRange) params.timeRange = sort.timeRange;
      }

      const response = await api.get<
        RedditApiResponse<{ posts: RedditPost[]; total: number }>
      >('/api/reddit/posts', { params });

      return response.data;
    } catch (error) {
      console.error('获取Reddit帖子失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取Reddit帖子失败',
        errorCode: 'REDDIT_POSTS_FETCH_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取Reddit帖子详情
   * @param postId 帖子ID
   * @returns Reddit帖子详情
   */
  async getRedditPost(postId: string): Promise<RedditApiResponse<RedditPost>> {
    try {
      const response = await api.get<RedditApiResponse<RedditPost>>(
        `/api/reddit/posts/${postId}`
      );
      return response.data;
    } catch (error) {
      console.error('获取Reddit帖子详情失败:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '获取Reddit帖子详情失败',
        errorCode: 'REDDIT_POST_FETCH_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 搜索Reddit帖子
   * @param query 搜索关键词
   * @param filter 过滤条件
   * @param sort 排序条件
   * @returns 搜索结果
   */
  async searchRedditPosts(
    query: string,
    filter?: RedditDataFilter,
    sort?: RedditDataSort
  ): Promise<RedditApiResponse<{ posts: RedditPost[]; total: number }>> {
    try {
      const params: Record<string, any> = {
        q: query,
      };

      // 应用过滤条件
      if (filter) {
        if (filter.subreddits && filter.subreddits.length > 0) {
          params.subreddits = filter.subreddits.join(',');
        }
        if (filter.minScore !== undefined) params.minScore = filter.minScore;
        if (filter.maxScore !== undefined) params.maxScore = filter.maxScore;
        if (filter.dateRange) {
          params.startDate = filter.dateRange.start;
          params.endDate = filter.dateRange.end;
        }
        if (filter.includeNsfw !== undefined)
          params.includeNsfw = filter.includeNsfw;
        if (filter.includeStickied !== undefined)
          params.includeStickied = filter.includeStickied;
      }

      // 应用排序条件
      if (sort) {
        params.sortBy = sort.field;
        params.sortOrder = sort.order;
        if (sort.timeRange) params.timeRange = sort.timeRange;
      }

      const response = await api.get<
        RedditApiResponse<{ posts: RedditPost[]; total: number }>
      >('/api/reddit/search', { params });

      return response.data;
    } catch (error) {
      console.error('搜索Reddit帖子失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '搜索Reddit帖子失败',
        errorCode: 'REDDIT_SEARCH_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取Reddit数据统计
   * @param dateRange 日期范围（可选）
   * @returns Reddit数据统计
   */
  async getRedditStats(dateRange?: { start: string; end: string }): Promise<
    RedditApiResponse<{
      totalPosts: number;
      totalSubreddits: number;
      averageScore: number;
      topSubreddits: Array<{ name: string; count: number }>;
      scoreDistribution: Array<{ range: string; count: number }>;
      timeDistribution: Array<{ date: string; count: number }>;
    }>
  > {
    try {
      const params = dateRange
        ? {
            startDate: dateRange.start,
            endDate: dateRange.end,
          }
        : {};

      const response = await api.get<
        RedditApiResponse<{
          totalPosts: number;
          totalSubreddits: number;
          averageScore: number;
          topSubreddits: Array<{ name: string; count: number }>;
          scoreDistribution: Array<{ range: string; count: number }>;
          timeDistribution: Array<{ date: string; count: number }>;
        }>
      >('/api/reddit/stats', { params });

      return response.data;
    } catch (error) {
      console.error('获取Reddit统计失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取Reddit统计失败',
        errorCode: 'REDDIT_STATS_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取可用的subreddit列表
   * @returns subreddit列表
   */
  async getAvailableSubreddits(): Promise<RedditApiResponse<string[]>> {
    try {
      const response = await api.get<RedditApiResponse<string[]>>(
        '/api/reddit/subreddits'
      );
      return response.data;
    } catch (error) {
      console.error('获取subreddit列表失败:', error);
      // 返回默认的热门subreddit列表
      return {
        success: true,
        data: [
          'programming',
          'technology',
          'javascript',
          'reactjs',
          'webdev',
          'frontend',
          'backend',
          'devops',
          'machinelearning',
          'artificial',
          'datascience',
          'cybersecurity',
          'startups',
          'entrepreneur',
          'business',
        ],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 清理Reddit数据缓存
   * @returns 清理结果
   */
  async clearRedditCache(): Promise<RedditApiResponse<{ cleared: boolean }>> {
    try {
      const response = await api.post<RedditApiResponse<{ cleared: boolean }>>(
        '/api/reddit/cache/clear'
      );
      return response.data;
    } catch (error) {
      console.error('清理Reddit缓存失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '清理Reddit缓存失败',
        errorCode: 'REDDIT_CACHE_CLEAR_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 导出Reddit数据
   * @param filter 过滤条件
   * @param format 导出格式
   * @returns 导出的文件数据
   */
  async exportRedditData(
    filter?: RedditDataFilter,
    format: 'csv' | 'json' | 'excel' = 'csv'
  ): Promise<Blob> {
    try {
      const params: Record<string, any> = { format };

      if (filter) {
        if (filter.subreddits && filter.subreddits.length > 0) {
          params.subreddits = filter.subreddits.join(',');
        }
        if (filter.minScore !== undefined) params.minScore = filter.minScore;
        if (filter.maxScore !== undefined) params.maxScore = filter.maxScore;
        if (filter.dateRange) {
          params.startDate = filter.dateRange.start;
          params.endDate = filter.dateRange.end;
        }
        if (filter.includeNsfw !== undefined)
          params.includeNsfw = filter.includeNsfw;
        if (filter.includeStickied !== undefined)
          params.includeStickied = filter.includeStickied;
      }

      const response = await api.get('/api/reddit/export', {
        params,
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('导出Reddit数据失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '导出Reddit数据失败'
      );
    }
  }

  /**
   * 验证Reddit数据
   * @param posts Reddit帖子数组
   * @returns 验证结果
   */
  validateRedditData(posts: RedditPost[]): {
    valid: RedditPost[];
    invalid: Array<{ post: Partial<RedditPost>; errors: string[] }>;
  } {
    const valid: RedditPost[] = [];
    const invalid: Array<{ post: Partial<RedditPost>; errors: string[] }> = [];

    posts.forEach(post => {
      const errors: string[] = [];

      // 验证必需字段
      if (!post.id) errors.push('缺少帖子ID');
      if (!post.title) errors.push('缺少帖子标题');
      if (!post.subreddit) errors.push('缺少subreddit');
      if (!post.author) errors.push('缺少作者');
      if (!post.url) errors.push('缺少帖子URL');
      if (post.score === undefined || post.score === null)
        errors.push('缺少评分');
      if (!post.createdUtc) errors.push('缺少创建时间');

      // 验证数据类型
      if (post.score !== undefined && typeof post.score !== 'number') {
        errors.push('评分必须是数字');
      }
      if (
        post.numComments !== undefined &&
        typeof post.numComments !== 'number'
      ) {
        errors.push('评论数必须是数字');
      }
      if (
        post.upvoteRatio !== undefined &&
        (typeof post.upvoteRatio !== 'number' ||
          post.upvoteRatio < 0 ||
          post.upvoteRatio > 1)
      ) {
        errors.push('点赞比例必须是0-1之间的数字');
      }

      // 验证URL格式
      if (post.url) {
        try {
          new URL(post.url);
        } catch {
          errors.push('URL格式无效');
        }
      }

      if (errors.length === 0) {
        valid.push(post);
      } else {
        invalid.push({ post, errors });
      }
    });

    return { valid, invalid };
  }

  /**
   * 格式化Reddit数据用于显示
   * @param posts Reddit帖子数组
   * @returns 格式化后的数据
   */
  formatRedditDataForDisplay(posts: RedditPost[]): Array<{
    id: string;
    title: string;
    subreddit: string;
    author: string;
    score: number;
    comments: number;
    created: string;
    url: string;
    thumbnail?: string;
    flair?: string;
    isNsfw: boolean;
    isStickied: boolean;
  }> {
    return posts.map(post => {
      const result: {
        id: string;
        title: string;
        subreddit: string;
        author: string;
        score: number;
        comments: number;
        created: string;
        url: string;
        thumbnail?: string;
        flair?: string;
        isNsfw: boolean;
        isStickied: boolean;
      } = {
        id: post.id,
        title: post.title,
        subreddit: post.subreddit,
        author: post.author,
        score: post.score,
        comments: post.numComments || 0,
        created: new Date(post.createdUtc * 1000).toLocaleString('zh-CN'),
        url: post.url,
        isNsfw: post.over18 || false,
        isStickied: post.stickied || false,
      };

      if (
        post.thumbnail &&
        post.thumbnail !== 'self' &&
        post.thumbnail !== 'default' &&
        typeof post.thumbnail === 'string'
      ) {
        result.thumbnail = post.thumbnail;
      }

      if (post.linkFlairText && typeof post.linkFlairText === 'string') {
        result.flair = post.linkFlairText;
      }

      return result;
    });
  }
}

// 导出服务实例
export const informationService = new InformationService();
export default informationService;
