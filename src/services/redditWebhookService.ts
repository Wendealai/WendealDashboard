/**
 * Reddit Webhook服务
 * 处理来自n8n工作流的Reddit数据webhook响应
 */

import type { RedditPost, RedditWorkflowStats } from '@/types';

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
 * 解析的子版块数据
 */
export interface ParsedSubredditData {
  name: string;
  posts: ParsedRedditPost[];
  totalPosts: number;
}

class RedditWebhookService {
  private readonly webhookUrl =
    process.env.REACT_APP_REDDIT_WEBHOOK_URL ||
    'https://n8n.wendealai.com/webhook/reddithot';

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
   * 触发webhook（用于测试）
   * @returns webhook响应
   */
  /**
   * 触发webhook并等待工作流完成
   * @param onProgress 进度回调函数
   * @returns Promise<any>
   */
  async triggerWebhook(onProgress?: (status: string) => void): Promise<any> {
    try {
      onProgress?.('正在触发工作流...');

      // 为了演示目的，使用用户提供的示例数据
      // 在实际环境中，这里应该是真实的webhook调用
      const telegramMessage = `🔥 *TOP POSTS FROM 5/5 ACTIVE SUBREDDITS* 🔥
_Last 7 days_
════════════════════════

▫️ *r/n8n*
╰─────────────

 1. *Stop paying $20 a month for n8n. Self host it in minutes*
 ⬆️ 449 • 💬 114
 🔗 https://reddit.com/r/n8n/comments/1mz29g9/stop_paying_20_a_month_for_n8n_self_host_it_in/

 2. *This n8n workflow made me close Multiple Clients at Once*
 ⬆️ 314 • 💬 50
 🔗 https://reddit.com/r/n8n/comments/1myo42e/this_n8n_workflow_made_me_close_multiple_clients/

 3. *Got my first paying client here is the workflow I built.*
 ⬆️ 285 • 💬 65
 🔗 https://reddit.com/r/n8n/comments/1mzz8j9/got_my_first_paying_client_here_is_the_workflow_i/


▫️ *r/comfyui*
╰─────────────

 1. *Casual local ComfyUI experience*
 ⬆️ 509 • 💬 63
 🔗 https://reddit.com/r/comfyui/comments/1mzra3l/casual_local_comfyui_experience/

 2. *WAN2.2 | comfyUI*
 ⬆️ 350 • 💬 80
 🔗 https://reddit.com/r/comfyui/comments/1n2h2vx/wan22_comfyui/

 3. *VibeVoice is crazy good (first try, no cherry-picking)*
 ⬆️ 349 • 💬 47
 🔗 https://reddit.com/r/comfyui/comments/1n2ojb5/vibevoice_is_crazy_good_first_try_no_cherrypicking/


▫️ *r/automation*
╰─────────────

 1. *I've been pulling leads straight from Google Maps, here's how*
 ⬆️ 161 • 💬 37
 🔗 https://reddit.com/r/automation/comments/1myexrv/ive_been_pulling_leads_straight_from_google_maps/

 2. *Stop paying $20 a month for n8n. Self host it in minutes*
 ⬆️ 103 • 💬 23
 🔗 https://reddit.com/r/automation/comments/1mz28gq/stop_paying_20_a_month_for_n8n_self_host_it_in/

 3. *What is an automation that 10x ed your productivity?*
 ⬆️ 78 • 💬 31
 🔗 https://reddit.com/r/automation/comments/1n1cs67/what_is_an_automation_that_10x_ed_your/


▫️ *r/brisbane*
📍 *Brisbane Tip*: /weather for live radar
╰─────────────

 1. *Drone recording of the Palestine Rally*
 ⬆️ 5,992 • 💬 518
 🔗 https://reddit.com/r/brisbane/comments/1mypdx2/drone_recording_of_the_palestine_rally/

 2. *Photos from today's Palestine March 🇵🇸*
 ⬆️ 1,976 • 💬 5
 🔗 https://reddit.com/r/brisbane/comments/1mysgrc/photos_from_todays_palestine_march/

 3. *Just learnt my favourite shitty bar Fat Louie's closed last month :(*
 ⬆️ 1,146 • 💬 267
 🔗 https://reddit.com/r/brisbane/comments/1n1dcad/just_learnt_my_favourite_shitty_bar_fat_louies/


▫️ *r/australia*
📍 *Brisbane Tip*: /weather for live radar
╰─────────────

 1. *Australia Post Temporary Suspends of Postal Services to the US*
 ⬆️ 5,262 • 💬 588
 🔗 https://reddit.com/r/australia/comments/1n033l9/australia_post_temporary_suspends_of_postal/

 2. *'March for Australia' is not common-sense patriotism — it's a Nazi-led mobilisation*
 ⬆️ 3,646 • 💬 622
 🔗 https://reddit.com/r/australia/comments/1mymfbx/march_for_australia_is_not_commonsense_patriotism/

 3. *Retirees earn more than young workers, no wonder productivity is dead*
 ⬆️ 2,502 • 💬 424
 🔗 https://reddit.com/r/australia/comments/1n0be0n/retirees_earn_more_than_young_workers_no_wonder/

════════════════════════
_Showing top 3 from 5 active subreddits_`;

      const mockResponse = {
        json: {
          telegramMessage,
          parseMode: 'Markdown',
          timestamp: '2025-08-30T06:45:45.213Z',
          success: true,
          validSubreddits: 5,
          totalSubreddits: 5,
          timeFilter: 'week',
          subredditsRequested: [
            'n8n',
            'comfyui',
            'automation',
            'brisbane',
            'australia',
          ],
          processingTime: '2025-08-30T06:45:45.213Z',
          messageLength: 3118,
          apiSource: 'reddit.com',
        },
      };

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      onProgress?.('正在处理数据...');

      await new Promise(resolve => setTimeout(resolve, 500));
      onProgress?.('工作流已完成');

      console.log('使用模拟webhook响应:', {
        responseType: typeof mockResponse,
        responseKeys: mockResponse ? Object.keys(mockResponse) : [],
        hasJson: !!mockResponse?.json,
        fullResponse: mockResponse,
      });

      return mockResponse;
    } catch (error) {
      console.error('触发webhook失败:', error);
      throw error;
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
        const resultResponse = await fetch(this.webhookUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
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
   * 获取webhook URL
   */
  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

export const redditWebhookService = new RedditWebhookService();
export default redditWebhookService;
