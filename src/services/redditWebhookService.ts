/**
 * Reddit Webhook服务
 * 处理来自n8n工作流的Reddit数据webhook响应
 */

import type { RedditPost, RedditWorkflowStats } from '@/types';

// Reddit数据存储管理器 - 全局单例
class RedditDataManager {
  private static instance: RedditDataManager;
  private readonly STORAGE_KEY = 'wendeal_reddit_data';
  private readonly TIMESTAMP_KEY = 'wendeal_reddit_data_timestamp';

  private constructor() {}

  static getInstance(): RedditDataManager {
    if (!RedditDataManager.instance) {
      RedditDataManager.instance = new RedditDataManager();
    }
    return RedditDataManager.instance;
  }

  /**
   * 保存Reddit数据
   */
  saveData(data: any[]): boolean {
    try {
      console.log('RedditDataManager: Saving data to localStorage:', data.length, 'items');
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
      console.log('RedditDataManager: Data saved successfully');
      return true;
    } catch (error) {
      console.error('RedditDataManager: Failed to save data:', error);
      return false;
    }
  }

  /**
   * 加载Reddit数据
   */
  loadData(): any[] | null {
    try {
      console.log('RedditDataManager: Loading data from localStorage');
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) {
        console.log('RedditDataManager: No data found in localStorage');
        return null;
      }

      const data = JSON.parse(dataStr);
      console.log('RedditDataManager: Data loaded successfully:', data?.length || 0, 'items');
      return data;
    } catch (error) {
      console.error('RedditDataManager: Failed to load data:', error);
      return null;
    }
  }

  /**
   * 清除Reddit数据
   */
  clearData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.TIMESTAMP_KEY);
      console.log('RedditDataManager: Data cleared');
    } catch (error) {
      console.error('RedditDataManager: Failed to clear data:', error);
    }
  }

  /**
   * 检查是否有数据
   */
  hasData(): boolean {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    const hasData = !!dataStr;
    console.log('RedditDataManager: Has data:', hasData);
    return hasData;
  }
}

// 导出全局实例
export const redditDataManager = RedditDataManager.getInstance();

/**
 * Reddit Webhook响应数据结构
 */
export interface RedditWebhookResponse {
  telegramMessage: string;
  parseMode: string;
  timestamp: string;
  success: boolean;
  validSubreddits: number;
  totalSubreddits: number;
  timeFilter: string;
  subredditsRequested: string[];
  processingTime: string;
  messageLength: number;
  apiSource: string;
}

/**
 * 解析的Reddit帖子数据
 */
export interface ParsedRedditPost {
  title: string;
  upvotes: number;
  comments: number;
  url: string;
  subreddit: string;
  rank: number;
}

/**
 * Reddit 工作流返回的帖子数据
 */
export interface RedditWorkflowPost {
  id: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  url: string | null;
  redditUrl: string | null;
  content: string | null;
  isVideo: boolean;
  rank: number;
  scoreFormatted: string;
  commentsFormatted: string;
}

/**
 * Reddit 工作流返回的社区统计数据
 */
export interface RedditWorkflowSubredditStats {
  totalPosts: number;
  totalScore: number;
  totalComments: number;
  averageScore: number;
  topPost: RedditWorkflowPost | null;
}

/**
 * Reddit 工作流返回的社区数据
 */
export interface RedditWorkflowSubreddit {
  name: string;
  displayName: string;
  category: string;
  icon: string;
  description: string;
  color: string;
  stats: RedditWorkflowSubredditStats;
  posts: RedditWorkflowPost[];
}

/**
 * Reddit 工作流返回的标题信息
 */
export interface RedditWorkflowHeaderInfo {
  title: string;
  subtitle: string;
  timeRange: string;
  timestamp: string;
  totalPosts: number;
}

/**
 * Reddit 工作流返回的汇总统计
 */
export interface RedditWorkflowSummary {
  totalSubreddits: number;
  totalPosts: number;
  totalScore: number;
  totalComments: number;
  topSubreddit: string | null;
  categories: string[];
  averagePostsPerSub: number;
  dataFreshness: string;
}

/**
 * Reddit 工作流返回的元数据
 */
export interface RedditWorkflowMetadata {
  requestedSubreddits: string[];
  validSubreddits: number;
  timeFilter: string;
  processingTime: string;
  apiSource: string;
  version: string;
}

/**
 * Reddit 工作流完整返回数据结构
 */
export interface RedditWorkflowResponse {
  success: boolean;
  headerInfo: RedditWorkflowHeaderInfo;
  summary: RedditWorkflowSummary;
  subreddits: RedditWorkflowSubreddit[];
  metadata: RedditWorkflowMetadata;
  error?: string;
  debugInfo?: {
    subredditsAttempted: string[];
    commonIssues: string[];
    suggestions: string[];
  };
}

/**
 * 解析的子版块数据（向后兼容）
 */
export interface ParsedSubredditData {
  name: string;
  posts: ParsedRedditPost[];
  totalPosts: number;
}

class RedditWebhookService {
  private readonly webhookUrl =
    process.env.REACT_APP_REDDIT_WEBHOOK_URL ||
    'https://n8n.wendealai.com/webhook/reddithot'; // 用户提供的正确默认webhook URL

  /**
   * 获取适合当前环境的webhook URL
   * 开发环境使用代理路径，生产环境使用直接URL
   */
  private getEnvironmentWebhookUrl(customUrl?: string): string {
    const targetUrl = customUrl || this.webhookUrl;

    // 更准确的环境检测 - 强制使用生产环境URL
    const isDevelopment =
      // 检查是否在本地开发服务器
      (typeof window !== 'undefined' &&
       (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('.local'))) ||
      // 检查Vite开发服务器端口
      (typeof window !== 'undefined' &&
       (window.location.port === '5173' || window.location.port === '3000')) ||
      // 检查NODE_ENV
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

    console.log('🔍 环境检测详情:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      port: typeof window !== 'undefined' ? window.location.port : 'N/A',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
      href: typeof window !== 'undefined' ? window.location.href : 'N/A',
      nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'N/A',
      isDevelopment,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A',
    });

    // 临时强制使用生产环境URL来解决代理问题
    console.log('🔧 强制使用生产环境URL模式');
    console.log('🌐 生产环境：使用完整URL', targetUrl);
    return targetUrl;

    // 注释掉原有的条件判断逻辑
    /*
    if (isDevelopment) {
      // 开发环境：使用代理路径避免CORS问题
      const url = new URL(targetUrl);
      const proxyPath = url.pathname; // 返回 '/webhook/reddithot'
      console.log('开发环境：使用代理路径', proxyPath);
      return proxyPath;
    } else {
      // 生产环境：使用完整URL
      console.log('生产环境：使用完整URL', targetUrl);
      return targetUrl;
    }
    */
  }

  /**
   * 解析Telegram消息中的Reddit数据
   * @param telegramMessage Telegram格式的消息
   * @returns 解析后的子版块数据
   */
  parseTelegramMessage(telegramMessage: string): ParsedSubredditData[] {
    const subreddits: ParsedSubredditData[] = [];

    // 检查输入参数
    if (!telegramMessage || typeof telegramMessage !== 'string') {
      console.warn('Invalid telegramMessage:', telegramMessage);
      return subreddits;
    }

    console.log('开始解析Telegram消息:', {
      messageType: typeof telegramMessage,
      messageLength: telegramMessage.length,
      messagePreview: telegramMessage.substring(0, 200),
    });

    // 按子版块分割消息
    const subredditSections = telegramMessage.split(/▫️\s*\*r\//g).slice(1);

    console.log('子版块分割结果:', {
      sectionsCount: subredditSections.length,
      sections: subredditSections.map((section, i) => ({
        index: i,
        length: section.length,
        preview: section.substring(0, 100),
      })),
    });

    subredditSections.forEach((section, index) => {
      if (!section || typeof section !== 'string') {
        console.warn(`跳过无效的section ${index}:`, section);
        return;
      }

      const lines = section.split('\n');
      if (lines.length === 0) {
        console.warn(`Section ${index} 没有有效行`);
        return;
      }

      const subredditName = lines[0].replace(/\*.*$/, '').trim();

      const posts: ParsedRedditPost[] = [];
      let currentPost: Partial<ParsedRedditPost> = {};
      let rank = 0;

      lines.forEach((line, lineIndex) => {
        if (!line || typeof line !== 'string') {
          console.warn(`跳过无效的line ${lineIndex}:`, line);
          return;
        }

        const trimmedLine = line.trim();

        // 检测帖子标题行（以数字开头）
        const titleMatch = trimmedLine.match(/^(\d+)\. \*(.+)\*$/);
        if (titleMatch) {
          // 保存上一个帖子
          if (currentPost.title) {
            posts.push(currentPost as ParsedRedditPost);
          }

          rank = parseInt(titleMatch[1]);
          currentPost = {
            title: titleMatch[2],
            rank,
            subreddit: subredditName,
            upvotes: 0,
            comments: 0,
            url: '',
          };
        }

        // 检测投票和评论行
        const statsMatch = trimmedLine.match(/⬆️\s*(\d+)\s*•\s*💬\s*(\d+)/);
        if (statsMatch && currentPost.title) {
          if (!statsMatch[1] || !statsMatch[2]) {
            console.warn('statsMatch数据无效:', statsMatch);
            return;
          }
          currentPost.upvotes = parseInt(statsMatch[1]);
          currentPost.comments = parseInt(statsMatch[2]);
        }

        // 检测URL行
        const urlMatch = trimmedLine.match(/🔗\s*(.+)/);
        if (urlMatch && currentPost.title) {
          currentPost.url = urlMatch[1].replace(/`/g, '').trim();
        }
      });

      // 添加最后一个帖子
      if (currentPost.title) {
        posts.push(currentPost as ParsedRedditPost);
      }

      if (posts.length > 0) {
        subreddits.push({
          name: subredditName,
          posts,
          totalPosts: posts.length,
        });
      }
    });

    return subreddits;
  }

  /**
   * 将解析的数据转换为RedditPost格式
   * @param parsedData 解析的子版块数据
   * @returns RedditPost数组
   */
  convertToRedditPosts(parsedData: ParsedSubredditData[]): RedditPost[] {
    const posts: RedditPost[] = [];
    const now = Date.now();

    parsedData.forEach(subreddit => {
      subreddit.posts.forEach(post => {
        const redditPost: RedditPost = {
          id: `${subreddit.name}_${post.rank}_${now}`,
          title: post.title,
          content: '',
          author: 'unknown',
          subreddit: subreddit.name,
          url: post.url,
          permalink: post.url,
          createdUtc: now - post.rank * 3600000, // 模拟创建时间
          score: post.upvotes,
          upvotes: post.upvotes,
          downvotes: 0,
          numComments: post.comments,
          postType: 'link',
          stickied: false,
          nsfw: false,
          fetchedAt: now,
        };
        posts.push(redditPost);
      });
    });

    return posts.sort((a, b) => b.score - a.score); // 按分数降序排列
  }

  /**
   * 从webhook响应生成统计数据
   * @param response webhook响应
   * @param parsedData 解析的数据
   * @returns Reddit工作流统计
   */
  generateStats(
    response: RedditWebhookResponse,
    parsedData: ParsedSubredditData[]
  ): RedditWorkflowStats {
    const totalPosts = parsedData.reduce(
      (sum, subreddit) => sum + subreddit.totalPosts,
      0
    );
    const totalUpvotes = parsedData.reduce(
      (sum, subreddit) =>
        sum +
        subreddit.posts.reduce((postSum, post) => postSum + post.upvotes, 0),
      0
    );
    const totalComments = parsedData.reduce(
      (sum, subreddit) =>
        sum +
        subreddit.posts.reduce((postSum, post) => postSum + post.comments, 0),
      0
    );

    return {
      totalExecutions: 1,
      successfulExecutions: response.success ? 1 : 0,
      failedExecutions: response.success ? 0 : 1,
      totalPostsFetched: totalPosts,
      averageExecutionTime: 30, // 估算值
      lastExecutionTime: new Date(response.timestamp).getTime(),
      lastSuccessTime: response.success
        ? new Date(response.timestamp).getTime()
        : undefined,
      errorRate: response.success ? 0 : 100,
      successRate: response.success ? 100 : 0,
      // 扩展统计信息
      totalUpvotes,
      totalComments,
      validSubreddits: response.validSubreddits,
      totalSubreddits: response.totalSubreddits,
      messageLength: response.messageLength,
    };
  }

  /**
   * 处理完整的webhook响应
   * @param response webhook响应数据
   * @returns 处理后的数据
   */
  processWebhookResponse(response: any) {
    console.log('处理webhook响应:', {
      responseType: typeof response,
      responseKeys: response ? Object.keys(response) : [],
      hasJson: !!response?.json,
      fullResponse: response,
    });

    // 验证响应数据
    if (!response) {
      console.error('Response is null or undefined');
      throw new Error('无效的响应数据');
    }

    // 处理嵌套的json结构
    let actualData = response;
    if (response.json && typeof response.json === 'object') {
      console.log('检测到嵌套json结构，提取实际数据');
      actualData = response.json;
    }

    console.log('实际数据结构:', {
      dataType: typeof actualData,
      dataKeys: actualData ? Object.keys(actualData) : [],
      hasTelegramMessage: !!actualData?.telegramMessage,
      telegramMessageLength: actualData?.telegramMessage?.length || 0,
    });

    // 检查是否是新的 Reddit 工作流数据格式
    if (actualData.success !== undefined && actualData.subreddits) {
      console.log('检测到新的 Reddit 工作流数据格式，直接处理...');
      // 新的数据格式已经包含处理好的数据，直接转换格式
      const parsedData = this.convertNewRedditWorkflowToParsedData(actualData);
      return {
        success: true,
        data: parsedData,
        message: '成功处理新的 Reddit 工作流数据',
        timestamp: new Date().toISOString(),
        validSubreddits: actualData.subreddits.length,
        totalSubreddits: actualData.subreddits.length,
        messageLength: JSON.stringify(actualData).length,
      };
    }

    // 旧的 Telegram 消息格式处理
    if (!actualData.telegramMessage) {
      console.error('telegramMessage is missing from actualData:', actualData);
      throw new Error('响应中缺少telegramMessage字段');
    }

    console.log('开始解析telegramMessage...');
    const parsedData = this.parseTelegramMessage(actualData.telegramMessage);
    console.log('解析结果:', {
      subredditsCount: parsedData.length,
      subreddits: parsedData.map(s => ({
        name: s.name,
        postsCount: s.posts.length,
      })),
    });

    console.log('开始转换为RedditPost格式...');
    const posts = this.convertToRedditPosts(parsedData);
    console.log('转换结果:', {
      postsCount: posts.length,
      firstPost: posts[0]
        ? {
            title: posts[0].title,
            subreddit: posts[0].subreddit,
            upvotes: posts[0].upvotes,
          }
        : null,
    });

    const stats = this.generateStats(actualData, parsedData);

    const result = {
      posts,
      stats,
      subreddits: parsedData,
      metadata: {
        timestamp: actualData.timestamp,
        success: actualData.success,
        validSubreddits: actualData.validSubreddits,
        totalSubreddits: actualData.totalSubreddits,
        timeFilter: actualData.timeFilter,
        subredditsRequested: actualData.subredditsRequested,
        processingTime: actualData.processingTime,
        messageLength: actualData.messageLength,
        apiSource: actualData.apiSource,
      },
    };

    console.log('processWebhookResponse最终结果:', {
      postsCount: result.posts.length,
      subredditsCount: result.subreddits.length,
      hasStats: !!result.stats,
      hasMetadata: !!result.metadata,
    });

    return result;
  }

  /**
   * 测试webhook连接
   * @param webhookUrl - 要测试的webhook URL（可选，默认使用当前配置的URL）
   * @returns Promise<{success: boolean, error?: string, statusCode?: number}>
   */
  async testWebhookConnection(
    webhookUrl?: string
  ): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    const testUrl = this.getEnvironmentWebhookUrl(webhookUrl);

    console.log('🔍 测试webhook连接:', {
      originalUrl: webhookUrl || this.webhookUrl,
      resolvedUrl: testUrl,
      isDevelopment: (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
                    (typeof process !== 'undefined' && process.env.NODE_ENV === 'development'),
    });

    try {
      const response = await fetch(testUrl, {
        method: 'GET', // 使用GET请求测试连接，n8n webhook通常支持GET
        mode: 'cors', // 明确指定CORS模式
        credentials: 'omit', // 不发送凭据以避免CORS问题
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10秒超时
      });

      console.log('📡 Webhook响应信息:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: testUrl,
      });

      if (response.ok) {
        console.log('✅ Webhook连接测试成功');
        return { success: true, statusCode: response.status };
      } else {
        console.error('❌ Webhook连接测试失败:', {
          status: response.status,
          statusText: response.statusText,
        });

        let detailedError = `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 404) {
          detailedError = '404错误: Webhook端点不存在，请检查n8n工作流配置';
        } else if (response.status === 403) {
          detailedError = '403错误: 访问被拒绝，请检查CORS配置或认证设置';
        } else if (response.status === 500) {
          detailedError = '500错误: 服务器内部错误，请检查n8n服务状态';
        } else if (response.status >= 400 && response.status < 500) {
          detailedError = `${response.status}错误: 客户端错误，请检查请求配置`;
        } else if (response.status >= 500) {
          detailedError = `${response.status}错误: 服务器错误，请联系管理员`;
        }

        return {
          success: false,
          error: detailedError,
          statusCode: response.status,
        };
      }
    } catch (error) {
      console.error('🔥 Webhook连接测试异常:', error);

      let errorMessage = 'Unknown error';
      let errorType = 'UNKNOWN_ERROR';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorType = error.name;

        // 提供更具体的网络错误信息
        if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ERR_NETWORK')
        ) {
          errorMessage = 'NetworkError: 无法连接到服务器，可能是网络连接、CORS或服务器问题';
          errorType = 'NETWORK_ERROR';
        } else if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('AbortError')
        ) {
          errorMessage = 'TimeoutError: 连接超时，服务器响应时间过长';
          errorType = 'TIMEOUT_ERROR';
        } else if (errorMessage.includes('TypeError')) {
          errorMessage = 'TypeError: URL格式错误或网络配置问题';
          errorType = 'CONFIG_ERROR';
        } else if (errorMessage.includes('CORS')) {
          errorMessage = 'CORS错误: 跨域请求被阻止，请检查服务器CORS配置';
          errorType = 'CORS_ERROR';
        }
      }

      return {
        success: false,
        error: errorMessage,
        errorType,
      };
    }
  }

  /**
   * 验证webhook URL格式
   * @param url - 要验证的URL
   * @returns {valid: boolean, error?: string}
   */
  validateWebhookUrl(url: string): { valid: boolean; error?: string } {
    if (!url || url.trim() === '') {
      return { valid: false, error: 'URL不能为空' };
    }

    try {
      const urlObj = new URL(url);

      // 检查协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL必须使用HTTP或HTTPS协议' };
      }

      // 检查是否包含webhook路径
      if (!urlObj.pathname.includes('webhook')) {
        return { valid: false, error: 'URL路径应包含"webhook"' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'URL格式无效' };
    }
  }

  /**
   * 触发webhook并等待工作流完成
   * @param onProgress 进度回调函数
   * @param customWebhookUrl 自定义webhook URL，如果提供则使用此URL而不是默认URL
   * @returns Promise<any>
   */
  async triggerWebhook(
    onProgress?: (status: string) => void,
    customWebhookUrl?: string
  ): Promise<any> {
    try {
      onProgress?.(''); // 移除触发提示文字，只显示loading状态

      const targetUrl = this.getEnvironmentWebhookUrl(customWebhookUrl);
      console.log('发送webhook请求到:', targetUrl);

      console.log('🚀 发送实际的webhook请求:', {
        method: 'GET',
        url: targetUrl,
        mode: 'cors',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
        }
      });

      // 发送实际的webhook请求 - n8n webhook使用GET方法
      const response = await fetch(targetUrl, {
        method: 'GET',
        mode: 'cors', // 明确指定CORS模式
        credentials: 'omit', // 不发送凭据以避免CORS问题
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
        },
      });

      console.log('📡 收到webhook响应:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook请求失败: ${response.status} ${response.statusText}`
        );
      }

      onProgress?.('正在等待工作流响应...');

      // 尝试解析响应
      let webhookResponse;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        webhookResponse = await response.json();
      } else {
        // 如果不是JSON响应，可能是异步webhook，需要等待完成
        onProgress?.('工作流已启动，等待完成...');
        webhookResponse = await this.waitForWorkflowCompletion(onProgress);
      }

      console.log('收到webhook响应:', {
        responseType: typeof webhookResponse,
        responseKeys: webhookResponse ? Object.keys(webhookResponse) : [],
        hasJson: !!webhookResponse?.json,
        fullResponse: webhookResponse,
      });

      onProgress?.('工作流已完成');
      return webhookResponse;
    } catch (error) {
      console.error('触发webhook失败:', error);

      // 提供详细的错误信息
      let errorMessage = 'Unknown error';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;

        // 根据错误类型提供具体的解决建议
        if (errorMessage.includes('404')) {
          errorDetails = `\n\n🔍 错误分析：\n• Webhook URL返回404错误\n• 可能原因：n8n工作流未正确配置或URL路径错误\n\n💡 解决建议：\n1. 检查n8n工作流是否已创建并激活\n2. 确认webhook URL路径是否正确\n3. 联系管理员检查n8n服务状态\n\n📋 当前URL: ${this.webhookUrl}`;
        } else if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('Network') ||
          errorMessage.includes('TypeError: Failed to fetch')
        ) {
          errorDetails = `\n\n🔍 错误分析：\n• 网络连接失败 (NetworkError)\n• 可能原因：CORS策略阻止、网络不稳定、服务器无法访问或URL配置错误\n\n💡 解决建议：\n1. 检查网络连接状态\n2. 确认webhook URL是否正确: ${this.webhookUrl}\n3. 检查服务器CORS配置\n4. 尝试使用测试连接按钮验证连接\n5. 稍后重试`;
        } else if (errorMessage.includes('timeout')) {
          errorDetails = `\n\n🔍 错误分析：\n• 请求超时\n• 可能原因：工作流执行时间过长\n\n💡 解决建议：\n1. 稍后重试\n2. 检查n8n工作流执行状态\n3. 联系管理员优化工作流性能`;
        }
      }

      // 在生产环境中提供用户友好的fallback响应
      if (process.env.NODE_ENV === 'production') {
        const fallbackResponse = {
          success: false,
          telegramMessage: '🔧 Reddit服务暂时不可用，请稍后重试',
          parseMode: 'Markdown',
          timestamp: new Date().toISOString(),
          validSubreddits: 0,
          totalSubreddits: 0,
          timeFilter: 'hot',
          subredditsRequested: [],
          processingTime: '0ms',
          messageLength: 0,
          apiSource: 'fallback',
          error: true,
          errorMessage: `Reddit工作流暂时不可用：${errorMessage}`,
          userMessage: '服务正在维护中，请稍后重试或联系技术支持。',
        };

        return fallbackResponse;
      } else {
        // 在开发环境中提供详细的错误信息
        const detailedError = new Error(
          `Reddit工作流执行失败：${errorMessage}${errorDetails}`
        );
        detailedError.name = 'WebhookError';

        throw detailedError;
      }
    }
  }

  /**
   * 等待工作流完成的轮询机制
   * @param onProgress 进度回调函数
   * @returns Promise<RedditWebhookResponse>
   */
  private async waitForWorkflowCompletion(
    onProgress?: (status: string) => void
  ): Promise<RedditWebhookResponse> {
    const maxAttempts = 30; // 最多等待5分钟 (30次 * 10秒)
    const pollInterval = 10000; // 10秒轮询一次

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        onProgress?.(`正在检查工作流状态... (${attempt}/${maxAttempts})`);

        // 等待指定时间后再次检查
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        // 尝试获取工作流结果
        const resultResponse = await fetch(this.getEnvironmentWebhookUrl(), {
          method: 'GET',
          mode: 'cors', // 明确指定CORS模式
          credentials: 'omit', // 不发送凭据以避免CORS问题
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        if (resultResponse.ok) {
          const data = await resultResponse.json();

          // 检查是否有有效的工作流结果
          if (data && data.json && data.json.telegramMessage) {
            onProgress?.('工作流执行完成！');
            return Array.isArray(data) ? data[0] : data;
          }
        }
      } catch (error) {
        console.warn(`轮询第${attempt}次失败:`, error);
        // 继续轮询，不抛出错误
      }
    }

    // 超时处理
    throw new Error(
      `工作流执行超时: 等待${(maxAttempts * pollInterval) / 1000}秒后仍未完成。\n\n可能的原因:\n1. 工作流执行时间过长\n2. 工作流执行失败\n3. 网络连接不稳定\n\n建议:\n1. 检查n8n工作流执行日志\n2. 稍后重试\n3. 联系管理员检查工作流状态`
    );
  }

  /**
   * 将新的 Reddit 工作流数据格式转换为旧的 ParsedSubredditData 格式
   * @param workflowData 新的 Reddit 工作流数据
   * @returns 包含 subreddits 属性的对象
   */
  convertNewRedditWorkflowToParsedData(workflowData: any): { subreddits: ParsedSubredditData[] } {
    if (!workflowData.subreddits || !Array.isArray(workflowData.subreddits)) {
      console.warn('Invalid workflow data structure:', workflowData);
      return { subreddits: [] };
    }

    const subreddits = workflowData.subreddits.map((subreddit: any) => ({
      name: subreddit.name,
      posts: subreddit.posts.map((post: any) => ({
        title: post.title,
        author: post.author,
        upvotes: post.score,
        comments: post.comments,
        url: post.url,
        subreddit: subreddit.name,
        rank: post.rank,
      })),
      totalPosts: subreddit.stats.totalPosts,
    }));

    return { subreddits };
  }

  /**
   * 触发Reddit工作流（Social Media页面专用）
   * @param subreddits 要抓取的子版块列表
   * @param onProgress 进度回调函数
   * @returns Promise<any>
   */
  async triggerRedditWorkflow(
    subreddits: string[],
    onProgress?: (status: string) => void
  ): Promise<any> {
    try {
      onProgress?.('正在准备Reddit工作流...');

      console.log('触发Reddit工作流，subreddits:', subreddits);

      const response = await this.triggerWebhook(onProgress);

      console.log('工作流响应:', response);

      // 处理webhook响应
      const processedData = this.processWebhookResponse(response);

      console.log('处理后的数据:', processedData);

      // 根据不同的响应格式提取数据
      let subredditsData: ParsedSubredditData[] = [];

      if (processedData.data && processedData.data.subreddits) {
        // 新工作流响应格式
        subredditsData = processedData.data.subreddits;
      } else if (processedData.subreddits) {
        // 旧格式
        subredditsData = processedData.subreddits;
      } else if (processedData.posts) {
        // 兼容旧的posts格式
        console.warn('检测到旧的posts格式，正在转换为subreddits格式');
        subredditsData = this.convertPostsToSubreddits(processedData.posts);
      } else {
        console.error('无法识别的响应格式:', processedData);
        throw new Error('Reddit工作流响应格式不正确');
      }

      onProgress?.('工作流执行完成，正在处理数据...');

      return {
        success: true,
        data: subredditsData,
        message: 'Reddit工作流执行成功',
      };

    } catch (error) {
      console.error('Reddit工作流执行失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 将posts数组转换为subreddits格式（兼容性处理）
   * @param posts RedditPost数组
   * @returns ParsedSubredditData数组
   */
  private convertPostsToSubreddits(posts: any[]): ParsedSubredditData[] {
    const subredditMap = new Map<string, ParsedRedditPost[]>();

    posts.forEach(post => {
      const subredditName = post.subreddit || 'unknown';
      if (!subredditMap.has(subredditName)) {
        subredditMap.set(subredditName, []);
      }

      subredditMap.get(subredditName)!.push({
        title: post.title || '',
        upvotes: post.upvotes || post.score || 0,
        comments: post.numComments || 0,
        url: post.url || post.permalink || '',
        subreddit: subredditName,
        rank: subredditMap.get(subredditName)!.length + 1,
      });
    });

    return Array.from(subredditMap.entries()).map(([name, posts]) => ({
      name,
      posts,
      totalPosts: posts.length,
    }));
  }

  /**
   * 获取webhook URL
   */
  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

export const redditWebhookService = new RedditWebhookService();
export default redditWebhookService;
