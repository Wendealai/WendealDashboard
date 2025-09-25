import {
  redditWebhookService,
  redditDataManager,
} from '../redditWebhookService';

// Mock fetch globally
global.fetch = jest.fn();

describe('RedditWebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Data Manager', () => {
    describe('saveData', () => {
      it('should save valid data to localStorage', () => {
        const mockData = [
          {
            name: 'r/programming',
            posts: [
              {
                title: 'Test Post',
                upvotes: 100,
                comments: 50,
                url: 'https://reddit.com/test',
                rank: 1,
                subreddit: 'programming',
              },
            ],
          },
        ];

        const result = redditDataManager.saveData(mockData);
        expect(result).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalled();
      });

      it('should reject invalid data', () => {
        const invalidData = [
          { name: '', posts: [] }, // Invalid subreddit
          { posts: [] }, // Missing name
        ];

        const result = redditDataManager.saveData(invalidData);
        expect(result).toBe(false);
      });

      it('should handle localStorage errors', () => {
        const mockData = [{ name: 'r/test', posts: [] }];
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = jest.fn(() => {
          throw new Error('Storage quota exceeded');
        });

        const result = redditDataManager.saveData(mockData);
        expect(result).toBe(false);

        Storage.prototype.setItem = originalSetItem;
      });
    });

    describe('loadData', () => {
      it('should load and validate data from localStorage', () => {
        const mockData = [{ name: 'r/test', posts: [] }];
        const dataPackage = {
          data: mockData,
          metadata: {
            savedAt: Date.now(),
            version: '1.0',
            totalItems: 1,
            dataSource: 'reddit_workflow',
            checksum: 'test_checksum',
          },
        };

        localStorage.getItem = jest.fn(() => JSON.stringify(dataPackage));

        const result = redditDataManager.loadData();
        expect(result).toEqual(mockData);
      });

      it('should return null when no data exists', () => {
        localStorage.getItem = jest.fn(() => null);

        const result = redditDataManager.loadData();
        expect(result).toBeNull();
      });

      it('should handle corrupted data', () => {
        const mockData = [{ name: 'r/test', posts: [] }];
        const dataPackage = {
          data: mockData,
          metadata: {
            savedAt: Date.now(),
            version: '1.0',
            totalItems: 1,
            dataSource: 'reddit_workflow',
            checksum: 'invalid_checksum',
          },
        };

        localStorage.getItem = jest.fn(() => JSON.stringify(dataPackage));

        const result = redditDataManager.loadData();
        expect(result).toBeNull();
      });
    });

    describe('isDataExpired', () => {
      it('should return true for expired data', () => {
        const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
        redditDataManager.getDataTimestamp = jest.fn(() => expiredTimestamp);

        const result = redditDataManager.isDataExpired(24);
        expect(result).toBe(true);
      });

      it('should return false for fresh data', () => {
        const freshTimestamp = Date.now() - 12 * 60 * 60 * 1000; // 12 hours ago
        redditDataManager.getDataTimestamp = jest.fn(() => freshTimestamp);

        const result = redditDataManager.isDataExpired(24);
        expect(result).toBe(false);
      });
    });
  });

  describe('parseTelegramMessage', () => {
    it('should parse valid telegram message', () => {
      const telegramMessage = `▫️ *r/programming*
1. *Test Post Title* ⬆️ 100 • 💬 50
🔗 https://reddit.com/test

▫️ *r/javascript*
1. *Another Post* ⬆️ 75 • 💬 25
🔗 https://reddit.com/another`;

      const result = redditWebhookService.parseTelegramMessage(telegramMessage);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('programming');
      expect(result[0].posts).toHaveLength(1);
      expect(result[0].posts[0].title).toBe('Test Post Title');
      expect(result[0].posts[0].upvotes).toBe(100);
      expect(result[0].posts[0].comments).toBe(50);
    });

    it('should handle empty message', () => {
      const result = redditWebhookService.parseTelegramMessage('');
      expect(result).toEqual([]);
    });

    it('should handle malformed message', () => {
      const malformedMessage = 'Invalid message format';
      const result =
        redditWebhookService.parseTelegramMessage(malformedMessage);
      expect(result).toEqual([]);
    });
  });

  describe('convertToRedditPosts', () => {
    it('should convert parsed data to RedditPost format', () => {
      const parsedData = [
        {
          name: 'programming',
          posts: [
            {
              title: 'Test Post',
              upvotes: 100,
              comments: 50,
              url: 'https://reddit.com/test',
              rank: 1,
            },
          ],
          totalPosts: 1,
        },
      ];

      const result = redditWebhookService.convertToRedditPosts(parsedData);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Post');
      expect(result[0].score).toBe(100);
      expect(result[0].numComments).toBe(50);
      expect(result[0].subreddit).toBe('programming');
    });

    it('should sort posts by score descending', () => {
      const parsedData = [
        {
          name: 'test',
          posts: [
            {
              title: 'Low Score',
              upvotes: 10,
              comments: 5,
              url: '',
              rank: 2,
              subreddit: 'test',
            },
            {
              title: 'High Score',
              upvotes: 100,
              comments: 20,
              url: '',
              rank: 1,
              subreddit: 'test',
            },
          ],
          totalPosts: 2,
        },
      ];

      const result = redditWebhookService.convertToRedditPosts(parsedData);

      expect(result[0].title).toBe('High Score');
      expect(result[1].title).toBe('Low Score');
    });
  });

  describe('testWebhookConnection', () => {
    it('should return success for valid connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      });

      const result = await service.testWebhookConnection();

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('reddithot'),
        expect.objectContaining({
          method: 'GET',
          mode: 'cors',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle connection failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      const result = await redditWebhookService.testWebhookConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('404错误');
      expect(result.statusCode).toBe(404);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to fetch')
      );

      const result = await redditWebhookService.testWebhookConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('NetworkError');
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('The operation was aborted')
      );

      const result = await redditWebhookService.testWebhookConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('TimeoutError');
    });
  });

  describe('validateWebhookUrl', () => {
    it('should validate correct HTTPS URL', () => {
      const result = service.validateWebhookUrl(
        'https://example.com/webhook/reddithot'
      );
      expect(result.valid).toBe(true);
    });

    it('should validate correct HTTP URL', () => {
      const result = service.validateWebhookUrl(
        'http://localhost:3000/webhook/reddithot'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject URL without webhook path', () => {
      const result = service.validateWebhookUrl('https://example.com/api/test');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('webhook');
    });

    it('should reject invalid URL format', () => {
      const result = service.validateWebhookUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('格式无效');
    });

    it('should reject empty URL', () => {
      const result = service.validateWebhookUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能为空');
    });
  });

  describe('triggerWebhook', () => {
    it('should successfully trigger webhook and process response', async () => {
      const mockResponse = {
        success: true,
        telegramMessage:
          '▫️ *r/test*\n1. *Test Post* ⬆️ 10 • 💬 5\n🔗 https://reddit.com/test',
        timestamp: new Date().toISOString(),
        validSubreddits: 1,
        totalSubreddits: 1,
        timeFilter: 'hot',
        subredditsRequested: ['test'],
        processingTime: '1.2s',
        messageLength: 100,
        apiSource: 'reddit',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse),
      });

      const onProgress = jest.fn();
      const result = await service.triggerWebhook(onProgress);

      expect(result).toBeDefined();
      expect(onProgress).toHaveBeenCalledWith('工作流已完成');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle webhook request failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const onProgress = jest.fn();

      await expect(service.triggerWebhook(onProgress)).rejects.toThrow(
        'Webhook请求失败: 500 Internal Server Error'
      );
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network Error')
      );

      const onProgress = jest.fn();

      // In development, should throw detailed error
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await expect(service.triggerWebhook(onProgress)).rejects.toThrow(
        'Reddit工作流执行失败：Network Error'
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('processWebhookResponse', () => {
    it('should process new Reddit workflow format', () => {
      const workflowResponse = {
        success: true,
        subreddits: [
          {
            name: 'programming',
            displayName: 'Programming',
            category: 'tech',
            icon: '💻',
            description: 'Programming discussions',
            color: '#ff6b6b',
            stats: {
              totalPosts: 2,
              totalScore: 150,
              totalComments: 30,
              averageScore: 75,
              topPost: null,
            },
            posts: [
              {
                id: 'post1',
                title: 'Test Post 1',
                author: 'user1',
                score: 100,
                comments: 20,
                url: 'https://reddit.com/post1',
                redditUrl: null,
                content: null,
                isVideo: false,
                rank: 1,
                scoreFormatted: '100',
                commentsFormatted: '20',
              },
            ],
          },
        ],
        headerInfo: {
          title: 'Reddit Hot Posts',
          subtitle: 'Latest trending posts',
          timeRange: '24h',
          timestamp: new Date().toISOString(),
          totalPosts: 2,
        },
        summary: {
          totalSubreddits: 1,
          totalPosts: 2,
          totalScore: 150,
          totalComments: 30,
          topSubreddit: 'programming',
          categories: ['tech'],
          averagePostsPerSub: 2,
          dataFreshness: 'fresh',
        },
        metadata: {
          requestedSubreddits: ['programming'],
          validSubreddits: 1,
          timeFilter: 'hot',
          processingTime: '1.5s',
          apiSource: 'reddit',
          version: '1.0',
        },
      };

      const result = service.processWebhookResponse(workflowResponse);

      expect(result.success).toBe(true);
      expect(result.data.subreddits).toHaveLength(1);
      expect(result.data.subreddits[0].name).toBe('programming');
      expect(result.data.subreddits[0].posts).toHaveLength(1);
    });

    it('should process legacy telegram message format', () => {
      const legacyResponse = {
        telegramMessage:
          '▫️ *r/test*\n1. *Legacy Post* ⬆️ 50 • 💬 10\n🔗 https://reddit.com/legacy',
        timestamp: new Date().toISOString(),
        success: true,
        validSubreddits: 1,
        totalSubreddits: 1,
        timeFilter: 'hot',
        subredditsRequested: ['test'],
        processingTime: '0.8s',
        messageLength: 80,
        apiSource: 'legacy',
      };

      const result = service.processWebhookResponse(legacyResponse);

      expect(result.posts).toBeDefined();
      expect(result.subreddits).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle invalid response', () => {
      expect(() => service.processWebhookResponse(null)).toThrow(
        '无效的响应数据'
      );
      expect(() => service.processWebhookResponse({})).toThrow(
        '响应中缺少telegramMessage字段'
      );
    });
  });

  describe('triggerRedditWorkflow', () => {
    it('should successfully execute Reddit workflow', async () => {
      const mockWebhookResponse = {
        success: true,
        subreddits: [
          {
            name: 'test',
            posts: [
              {
                title: 'Test Post',
                author: 'testuser',
                score: 25,
                comments: 5,
                url: 'https://reddit.com/test',
                rank: 1,
              },
            ],
            stats: {
              totalPosts: 1,
              totalScore: 25,
              totalComments: 5,
              averageScore: 25,
              topPost: null,
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockWebhookResponse),
      });

      const onProgress = jest.fn();
      const result = await service.triggerRedditWorkflow(['test'], onProgress);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('test');
      expect(onProgress).toHaveBeenCalledWith(
        '工作流执行完成，正在处理数据...'
      );
    });

    it('should handle workflow execution errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network failure')
      );

      const onProgress = jest.fn();
      const result = await service.triggerRedditWorkflow(['test'], onProgress);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network failure');
    });
  });

  describe('utility methods', () => {
    describe('getWebhookUrl', () => {
      it('should return the configured webhook URL', () => {
        const url = service.getWebhookUrl();
        expect(url).toContain('reddithot');
      });
    });

    describe('generateStats', () => {
      it('should generate correct statistics', () => {
        const mockResponse = {
          success: true,
          timestamp: new Date().toISOString(),
          validSubreddits: 2,
          totalSubreddits: 2,
          timeFilter: 'hot',
          subredditsRequested: ['test1', 'test2'],
          processingTime: '1.5s',
          messageLength: 200,
          apiSource: 'reddit',
        };

        const mockParsedData = [
          {
            name: 'test1',
            posts: [
              { title: 'Post 1', upvotes: 100, comments: 20, url: '', rank: 1 },
              { title: 'Post 2', upvotes: 50, comments: 10, url: '', rank: 2 },
            ],
            totalPosts: 2,
          },
          {
            name: 'test2',
            posts: [
              { title: 'Post 3', upvotes: 75, comments: 15, url: '', rank: 1 },
            ],
            totalPosts: 1,
          },
        ];

        const stats = service.generateStats(mockResponse, mockParsedData);

        expect(stats.totalExecutions).toBe(1);
        expect(stats.successfulExecutions).toBe(1);
        expect(stats.totalPostsFetched).toBe(3);
        expect(stats.totalUpvotes).toBe(225);
        expect(stats.totalComments).toBe(45);
        expect(stats.validSubreddits).toBe(2);
      });
    });
  });

  describe('environment handling', () => {
    it('should handle development environment webhook URL', () => {
      // Mock development environment
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'localhost',
          port: '5173',
          protocol: 'http:',
          href: 'http://localhost:5173/',
        },
        writable: true,
      });

      const url = service.getEnvironmentWebhookUrl();
      expect(url).toContain('reddithot');

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });
  });
});
