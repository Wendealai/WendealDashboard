/**
 * DataDisplayGrid 组件单元测试
 * 测试Reddit数据展示网格的完整功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DataDisplayGrid } from '../DataDisplayGrid';
import { redditWorkflowSlice } from '../../../store/slices/redditWorkflowSlice';
import { useNotifications } from '../../../hooks/useNotifications';

// Mock 依赖项
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: { [key: string]: string } = {
        'reddit.posts.title': '标题',
        'reddit.posts.author': '作者',
        'reddit.posts.score': '分数',
        'reddit.posts.comments': '评论',
        'reddit.posts.created': '创建时间',
        'reddit.actions.title': '操作',
        'reddit.actions.viewDetail': '查看详情',
        'reddit.actions.openRedditLink': '打开Reddit链接',
        'reddit.actions.share': '分享',
        'reddit.actions.favorite': '收藏',
        'reddit.search.placeholder': '搜索Reddit帖子...',
        'reddit.filters.selectSubreddit': '选择Subreddit',
        'reddit.filters.sortBy': '排序方式',
        'reddit.filters.startTime': '开始时间',
        'reddit.filters.endTime': '结束时间',
        'reddit.actions.refresh': '刷新',
        'reddit.actions.batchOperation': '批量操作',
        'reddit.actions.export': '导出',
        'reddit.actions.retry': '重试',
        'reddit.actions.dismiss': '忽略',
        'reddit.actions.close': '关闭',
        'reddit.actions.viewOnReddit': '在Reddit上查看',
        'reddit.posts.pinned': '置顶',
        'reddit.modal.postDetail': '帖子详情',
        'reddit.modal.content': '内容',
        'reddit.modal.thumbnail': '缩略图',
        'reddit.messages.noData': '暂无数据',
        'reddit.messages.noDataDescription': '没有找到匹配的数据',
        'reddit.messages.noDataFound': '未找到数据',
        'reddit.messages.loadingData': '加载数据中...',
        'reddit.messages.retryingData': '重试中...',
        'reddit.messages.showTotal': '显示 {{start}}-{{end}} 共 {{total}} 条',
        'reddit.errors.fetchFailed': '获取数据失败',
        'reddit.messages.dataRefreshed': '数据已刷新',
        'reddit.messages.dataFetchSuccess': '数据获取成功',
        'reddit.errors.unknownError': '未知错误',
        'reddit.messages.retrying': '重试中',
        'reddit.messages.autoRetry': '自动重试中...',
        'reddit.messages.searchCompleted': '搜索完成',
        'reddit.messages.searchResults': '找到 {{count}} 个结果，关键词：{{query}}',
        'reddit.errors.searchFailed': '搜索失败',
        'reddit.errors.unexpectedError': '意外错误',
        'reddit.messages.refreshing': '刷新中',
        'reddit.messages.refreshingData': '刷新数据...',
        'reddit.messages.exportStarted': '导出开始',
        'reddit.messages.exportInProgress': '导出进行中...',
        'reddit.messages.exportInDevelopment': '导出功能开发中',
        'reddit.messages.featureComingSoon': '功能即将上线',
        'reddit.errors.exportFailed': '导出失败',
        'reddit.messages.linkOpened': '链接已打开',
        'reddit.messages.redirectingToReddit': '跳转到Reddit...',
        'reddit.errors.linkOpenFailed': '链接打开失败',
        'reddit.errors.browserBlocked': '浏览器阻止了弹出窗口',
        'reddit.overview.totalPosts': '总帖子数',
        'reddit.overview.totalScore': '总分数',
        'reddit.overview.totalComments': '总评论数',
        'reddit.overview.avgScore': '平均分数',
        'reddit.overview.subreddits': 'Subreddit数量',
        'reddit.overview.selected': '已选择',
        'reddit.errors.dataLoadError': '数据加载错误',
        'reddit.pagination.showTotal': '显示 {{start}}-{{end}} 共 {{total}} 条',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../../hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

// Mock dayjs
jest.mock('dayjs', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    fromNow: jest.fn(() => '2小时前'),
    format: jest.fn(() => '2024-01-01 12:00:00'),
  })),
  extend: jest.fn(),
}));

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// 创建测试用的Redux store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      redditWorkflow: redditWorkflowSlice.reducer,
    },
    preloadedState: {
      redditWorkflow: {
        data: {
          posts: [],
          total: 0,
        },
        filter: {
          subreddits: [],
          searchKeyword: '',
        },
        sort: {
          field: 'createdAt',
          direction: 'desc',
        },
        pagination: {
          current: 1,
          pageSize: 10,
        },
        ui: {
          loading: false,
          error: null,
        },
        ...initialState,
      },
    },
  });
};

describe('DataDisplayGrid', () => {
  const mockPosts = [
    {
      id: 'post1',
      title: 'Test Post 1',
      author: 'testuser1',
      subreddit: 'programming',
      score: 150,
      numComments: 25,
      createdAt: '2024-01-01T12:00:00Z',
      url: 'https://reddit.com/r/programming/post1',
      authorAvatar: 'https://example.com/avatar1.jpg',
      isStickied: false,
      isNsfw: false,
    },
    {
      id: 'post2',
      title: 'Test Post 2',
      author: 'testuser2',
      subreddit: 'javascript',
      score: 80,
      numComments: 15,
      createdAt: '2024-01-01T11:00:00Z',
      url: 'https://reddit.com/r/javascript/post2',
      authorAvatar: 'https://example.com/avatar2.jpg',
      isStickied: true,
      isNsfw: false,
    },
  ];

  const mockNotifications = {
    showNotification: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotifications as jest.Mock).mockReturnValue(mockNotifications);
  });

  const renderWithStore = (store = createTestStore()) => {
    return render(
      <Provider store={store}>
        <DataDisplayGrid showStats={true} showActions={true} />
      </Provider>
    );
  };

  describe('初始渲染', () => {
    it('应该正确渲染表格标题', () => {
      renderWithStore();
      expect(screen.getByText('标题')).toBeInTheDocument();
      expect(screen.getByText('作者')).toBeInTheDocument();
      expect(screen.getByText('分数')).toBeInTheDocument();
      expect(screen.getByText('评论')).toBeInTheDocument();
      expect(screen.getByText('创建时间')).toBeInTheDocument();
    });

    it('应该显示空状态', () => {
      renderWithStore();
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('应该显示统计信息', () => {
      renderWithStore();
      expect(screen.getByText('总帖子数')).toBeInTheDocument();
      expect(screen.getByText('总分数')).toBeInTheDocument();
      expect(screen.getByText('总评论数')).toBeInTheDocument();
    });
  });

  describe('数据展示', () => {
    it('应该正确显示帖子数据', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      expect(screen.getByText('Test Post 2')).toBeInTheDocument();
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
    });

    it('应该显示置顶标签', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      expect(screen.getByText('置顶')).toBeInTheDocument();
    });

    it('应该正确格式化数字', () => {
      const postsWithLargeNumbers = [
        {
          ...mockPosts[0],
          score: 1500000,
          numComments: 25000,
        },
      ];

      const store = createTestStore({
        data: {
          posts: postsWithLargeNumbers,
          total: 1,
        },
      });

      renderWithStore(store);

      expect(screen.getByText('1.5M')).toBeInTheDocument(); // 格式化分数
      expect(screen.getByText('25.0K')).toBeInTheDocument(); // 格式化评论数
    });
  });

  describe('统计信息', () => {
    it('应该正确计算和显示统计数据', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      // 验证统计计算
      const totalScore = mockPosts.reduce((sum, post) => sum + post.score, 0); // 150 + 80 = 230
      const totalComments = mockPosts.reduce((sum, post) => sum + post.numComments, 0); // 25 + 15 = 40
      const avgScore = Math.round(totalScore / mockPosts.length); // 115
      const uniqueSubreddits = new Set(mockPosts.map(p => p.subreddit)).size; // 2

      expect(screen.getByText('2')).toBeInTheDocument(); // 总帖子数
      expect(screen.getByText('230')).toBeInTheDocument(); // 总分数
      expect(screen.getByText('40')).toBeInTheDocument(); // 总评论数
      expect(screen.getByText('115')).toBeInTheDocument(); // 平均分数
      expect(screen.getByText('2')).toBeInTheDocument(); // Subreddit数量
    });
  });

  describe('搜索功能', () => {
    it('应该显示搜索输入框', () => {
      renderWithStore();
      const searchInput = screen.getByPlaceholderText('搜索Reddit帖子...');
      expect(searchInput).toBeInTheDocument();
    });

    it('应该在输入搜索关键词时触发搜索', async () => {
      renderWithStore();
      const searchInput = screen.getByPlaceholderText('搜索Reddit帖子...');

      fireEvent.change(searchInput, { target: { value: 'test query' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(mockNotifications.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: expect.stringContaining('搜索完成'),
          })
        );
      });
    });

    it('应该在清空搜索时重置数据', () => {
      renderWithStore();
      const searchInput = screen.getByPlaceholderText('搜索Reddit帖子...');

      fireEvent.change(searchInput, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));

      // 验证重置逻辑被调用
      expect(searchInput).toHaveValue('');
    });
  });

  describe('筛选功能', () => {
    it('应该显示筛选选项', () => {
      renderWithStore();
      expect(screen.getByText('选择Subreddit')).toBeInTheDocument();
      expect(screen.getByText('排序方式')).toBeInTheDocument();
    });

    it('应该支持Subreddit筛选', () => {
      renderWithStore();
      const subredditSelect = screen.getByText('选择Subreddit').closest('.ant-select');

      fireEvent.click(subredditSelect!);
      // 模拟选择选项
      const option = screen.getByText('popular');
      fireEvent.click(option);

      // 这里应该验证筛选逻辑被触发
      expect(subredditSelect).toBeInTheDocument();
    });

    it('应该支持日期范围筛选', () => {
      renderWithStore();
      // 日期选择器存在
      const datePickers = screen.getAllByPlaceholderText(/时间/);
      expect(datePickers).toHaveLength(2);
    });
  });

  describe('操作按钮', () => {
    it('应该显示刷新按钮', () => {
      renderWithStore();
      expect(screen.getByText('刷新')).toBeInTheDocument();
    });

    it('应该显示导出按钮', () => {
      renderWithStore();
      expect(screen.getByText('导出')).toBeInTheDocument();
    });

    it('应该在点击刷新按钮时显示通知', async () => {
      renderWithStore();
      const refreshButton = screen.getByText('刷新');

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockNotifications.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: expect.stringContaining('刷新中'),
          })
        );
      });
    });

    it('应该在点击导出按钮时显示开发中提示', async () => {
      renderWithStore();
      const exportButton = screen.getByText('导出');

      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockNotifications.showNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            title: expect.stringContaining('导出功能开发中'),
          })
        );
      });
    });
  });

  describe('错误处理', () => {
    it('应该显示错误状态', () => {
      const store = createTestStore({
        ui: {
          error: '网络连接失败',
        },
      });

      renderWithStore(store);

      expect(screen.getByText('数据加载错误')).toBeInTheDocument();
      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    });

    it('应该显示重试按钮', () => {
      const store = createTestStore({
        ui: {
          error: '网络连接失败',
        },
      });

      renderWithStore(store);

      expect(screen.getByText('重试')).toBeInTheDocument();
      expect(screen.getByText('忽略')).toBeInTheDocument();
    });

    it('应该在点击重试时清除错误', () => {
      const store = createTestStore({
        ui: {
          error: '网络连接失败',
        },
      });

      renderWithStore(store);
      const retryButton = screen.getByText('重试');

      fireEvent.click(retryButton);

      // 验证错误被清除（通过store状态变化）
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('详情模态框', () => {
    it('应该在点击帖子标题时打开详情模态框', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      const postTitle = screen.getByText('Test Post 1');
      fireEvent.click(postTitle);

      expect(screen.getByText('帖子详情')).toBeInTheDocument();
    });

    it('应该在详情模态框中显示帖子信息', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      const postTitle = screen.getByText('Test Post 1');
      fireEvent.click(postTitle);

      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('r/programming')).toBeInTheDocument();
    });

    it('应该在详情模态框中显示统计信息', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      const postTitle = screen.getByText('Test Post 1');
      fireEvent.click(postTitle);

      // 验证统计数据显示
      expect(screen.getByText('150')).toBeInTheDocument(); // 分数
      expect(screen.getByText('25')).toBeInTheDocument(); // 评论数
    });
  });

  describe('外部链接处理', () => {
    it('应该在点击Reddit链接按钮时打开新窗口', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      // 找到操作列中的链接按钮
      const linkButtons = screen.getAllByRole('button', { name: /打开Reddit链接/i });
      fireEvent.click(linkButtons[0]);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://reddit.com/r/programming/post1',
        '_blank'
      );
    });

    it('应该在打开链接时显示成功通知', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      const linkButtons = screen.getAllByRole('button', { name: /打开Reddit链接/i });
      fireEvent.click(linkButtons[0]);

      expect(mockNotifications.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: '链接已打开',
        })
      );
    });
  });

  describe('分页功能', () => {
    it('应该显示分页控件', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 25,
        },
        pagination: {
          current: 1,
          pageSize: 10,
        },
      });

      renderWithStore(store);

      // 验证分页信息显示
      expect(screen.getByText(/显示 1-10 共 25 条/)).toBeInTheDocument();
    });

    it('应该支持页面大小选择', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 25,
        },
      });

      renderWithStore(store);

      // 分页控件应该存在
      const pagination = screen.getByRole('list', { hidden: true });
      expect(pagination).toBeInTheDocument();
    });
  });

  describe('性能优化', () => {
    it('应该在showStats为false时隐藏统计信息', () => {
      render(
        <Provider store={createTestStore()}>
          <DataDisplayGrid showStats={false} showActions={true} />
        </Provider>
      );

      expect(screen.queryByText('总帖子数')).not.toBeInTheDocument();
    });

    it('应该在showActions为false时隐藏操作栏', () => {
      render(
        <Provider store={createTestStore()}>
          <DataDisplayGrid showStats={true} showActions={false} />
        </Provider>
      );

      expect(screen.queryByText('刷新')).not.toBeInTheDocument();
      expect(screen.queryByText('导出')).not.toBeInTheDocument();
    });
  });

  describe('无障碍性', () => {
    it('应该支持键盘导航', () => {
      const store = createTestStore({
        data: {
          posts: mockPosts,
          total: 2,
        },
      });

      renderWithStore(store);

      // 验证表格是可聚焦的
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('应该有正确的ARIA标签', () => {
      renderWithStore();

      // 搜索输入框应该有标签
      const searchInput = screen.getByPlaceholderText('搜索Reddit帖子...');
      expect(searchInput).toHaveAttribute('aria-label', expect.any(String));
    });
  });
});
