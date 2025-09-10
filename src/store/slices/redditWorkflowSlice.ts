/**
 * Reddit工作流Redux状态管理
 * 管理Reddit热门内容抓取工作流的状态、数据和配置
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  RedditPost,
  WorkflowLog,
  RedditWorkflowConfig,
  RedditWorkflowStats,
  RedditDataFilter,
  RedditDataSort,
  // RedditWorkflowPageState,
  // RedditApiResponse,
  WorkflowAction,
  WorkflowEvent,
} from '@/types';

// 定义工作流状态类型
type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'completed'
  | 'failed';
import { workflowService } from '@/services/workflowService';
import { informationService } from '@/services/informationService';

// Redux状态接口
interface RedditWorkflowState {
  // 工作流状态
  workflow: {
    status: WorkflowStatus | null;
    config: RedditWorkflowConfig | null;
    stats: RedditWorkflowStats | null;
    logs: WorkflowLog[];
    loading: boolean;
    error: string | null;
  };

  // Reddit数据
  data: {
    posts: RedditPost[];
    loading: boolean;
    error: string | null;
    pagination: {
      current: number;
      pageSize: number;
      total: number;
    };
    filters: RedditDataFilter;
    sort: RedditDataSort;
  };

  // UI状态
  ui: {
    activeTab: 'overview' | 'data' | 'config' | 'logs';
    selectedPost: string | null;
    sidebarCollapsed: boolean;
    refreshing: boolean;
    autoRefresh: boolean;
    autoRefreshInterval: number; // 秒
  };

  // 实时事件
  events: {
    list: WorkflowEvent[];
    listening: boolean;
  };
}

// 初始状态
const initialState: RedditWorkflowState = {
  workflow: {
    status: null,
    config: null,
    stats: null,
    logs: [],
    loading: false,
    error: null,
  },
  data: {
    posts: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 20,
      total: 0,
    },
    filters: {
      subreddits: [],
      // dateRange: undefined, // 移除不存在的属性
      // minScore: undefined, // 移除不存在的属性
      // maxScore: undefined, // 移除不存在的属性
      includeNsfw: false,
      // includeStickied: false, // 移除不存在的属性
      searchKeyword: '', // 使用正确的属性名
      authors: [],
      // domains: [], // 移除不存在的属性
    },
    sort: {
      field: 'score',
      direction: 'desc',
    },
  },
  ui: {
    activeTab: 'overview',
    selectedPost: null,
    sidebarCollapsed: false,
    refreshing: false,
    autoRefresh: false,
    autoRefreshInterval: 30,
  },
  events: {
    list: [],
    listening: false,
  },
};

// 异步Thunk Actions

/**
 * 获取Reddit工作流状态
 */
export const fetchWorkflowStatus = createAsyncThunk(
  'redditWorkflow/fetchWorkflowStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workflowService.getRedditWorkflowStatus();
      if (!response.success) {
        throw new Error(response.error || '获取工作流状态失败');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取工作流状态失败'
      );
    }
  }
);

/**
 * 获取Reddit工作流统计
 */
export const fetchWorkflowStats = createAsyncThunk(
  'redditWorkflow/fetchWorkflowStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workflowService.getRedditWorkflowStats();
      if (!response.success) {
        throw new Error(response.error || '获取工作流统计失败');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取工作流统计失败'
      );
    }
  }
);

/**
 * 执行Reddit工作流操作
 */
export const executeWorkflowAction = createAsyncThunk(
  'redditWorkflow/executeWorkflowAction',
  async (
    params: {
      action: WorkflowAction;
      executionId?: string;
      config?: RedditWorkflowConfig;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await workflowService.executeRedditWorkflowAction(
        params.action,
        params.executionId,
        params.config
      );
      if (!response.success) {
        throw new Error(response.error || '执行工作流操作失败');
      }
      return { action: params.action, result: response.data };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '执行工作流操作失败'
      );
    }
  }
);

/**
 * 获取Reddit帖子数据
 */
export const fetchRedditPosts = createAsyncThunk(
  'redditWorkflow/fetchRedditPosts',
  async (
    params: {
      filter?: RedditDataFilter;
      sort?: RedditDataSort;
      page?: number;
      pageSize?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await informationService.getRedditPosts(
        params.filter,
        params.sort
      );
      if (!response.success) {
        throw new Error(response.error || '获取Reddit帖子失败');
      }
      return {
        posts: response.data?.posts || [],
        total: response.data?.total || 0,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取Reddit帖子失败'
      );
    }
  }
);

/**
 * 搜索Reddit帖子
 */
export const searchRedditPosts = createAsyncThunk(
  'redditWorkflow/searchRedditPosts',
  async (
    params: { query: string; filter?: RedditDataFilter; sort?: RedditDataSort },
    { rejectWithValue }
  ) => {
    try {
      const response = await informationService.searchRedditPosts(
        params.query,
        params.filter,
        params.sort
      );
      if (!response.success) {
        throw new Error(response.error || '搜索Reddit帖子失败');
      }
      return {
        posts: response.data?.posts || [],
        total: response.data?.total || 0,
        query: params.query,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '搜索Reddit帖子失败'
      );
    }
  }
);

/**
 * 获取Reddit统计数据
 */
export const fetchRedditStats = createAsyncThunk(
  'redditWorkflow/fetchRedditStats',
  async (
    dateRange: { start: string; end: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const response = await informationService.getRedditStats(dateRange);
      if (!response.success) {
        throw new Error(response.error || '获取Reddit统计失败');
      }

      // 将 RedditApiResponse 数据转换为 RedditWorkflowStats 格式
      const apiData = response.data;

      if (!apiData) {
        return rejectWithValue('No data received from API');
      }

      const workflowStats: RedditWorkflowStats = {
        totalExecutions: 0, // 默认值，因为API不提供此数据
        successfulExecutions: 0, // 默认值
        failedExecutions: 0, // 默认值
        totalPostsFetched: apiData.totalPosts || 0,
        averageExecutionTime: 0, // 默认值
        lastExecutionTime: 0, // 默认值
        lastSuccessTime: 0, // 默认值
        errorRate: 0, // 默认值
        successRate: 100, // 默认值
        totalUpvotes: 0, // 默认值，API不提供此数据
        totalComments: 0, // 默认值，API不提供此数据
        validSubreddits: apiData.totalSubreddits || 0,
        totalSubreddits: apiData.totalSubreddits || 0,
        messageLength: 0, // 默认值
      };

      return workflowStats;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取Reddit统计失败'
      );
    }
  }
);

/**
 * 获取可用的subreddit列表
 */
export const fetchAvailableSubreddits = createAsyncThunk(
  'redditWorkflow/fetchAvailableSubreddits',
  async (_, { rejectWithValue }) => {
    try {
      const response = await informationService.getAvailableSubreddits();
      if (!response.success) {
        throw new Error(response.error || '获取subreddit列表失败');
      }
      return response.data || [];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取subreddit列表失败'
      );
    }
  }
);

/**
 * 清理Reddit缓存
 */
export const clearRedditCache = createAsyncThunk(
  'redditWorkflow/clearRedditCache',
  async (_, { rejectWithValue }) => {
    try {
      const response = await informationService.clearRedditCache();
      if (!response.success) {
        throw new Error(response.error || '清理缓存失败');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '清理缓存失败'
      );
    }
  }
);

// Redux Slice
const redditWorkflowSlice = createSlice({
  name: 'redditWorkflow',
  initialState,
  reducers: {
    // UI状态管理
    setActiveTab: (
      state,
      action: PayloadAction<'overview' | 'data' | 'config' | 'logs'>
    ) => {
      state.ui.activeTab = action.payload;
    },

    setSelectedPost: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedPost = action.payload;
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.ui.sidebarCollapsed = action.payload;
    },

    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.ui.autoRefresh = action.payload;
    },

    setAutoRefreshInterval: (state, action: PayloadAction<number>) => {
      state.ui.autoRefreshInterval = action.payload;
    },

    // 数据过滤和排序
    setDataFilters: (
      state,
      action: PayloadAction<Partial<RedditDataFilter>>
    ) => {
      state.data.filters = { ...state.data.filters, ...action.payload };
    },

    setDataSort: (state, action: PayloadAction<Partial<RedditDataSort>>) => {
      state.data.sort = { ...state.data.sort, ...action.payload };
    },

    resetDataFilters: state => {
      state.data.filters = initialState.data.filters;
    },

    // 分页管理
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.data.pagination.current = action.payload;
    },

    setPageSize: (state, action: PayloadAction<number>) => {
      state.data.pagination.pageSize = action.payload;
      state.data.pagination.current = 1; // 重置到第一页
    },

    // 工作流配置
    updateWorkflowConfig: (
      state,
      action: PayloadAction<Partial<RedditWorkflowConfig>>
    ) => {
      if (state.workflow.config) {
        state.workflow.config = { ...state.workflow.config, ...action.payload };
      }
    },

    setWorkflowConfig: (state, action: PayloadAction<RedditWorkflowConfig>) => {
      state.workflow.config = action.payload;
    },

    // 事件管理
    addWorkflowEvent: (state, action: PayloadAction<WorkflowEvent>) => {
      state.events.list.unshift(action.payload);
      // 保持最新的100个事件
      if (state.events.list.length > 100) {
        state.events.list = state.events.list.slice(0, 100);
      }
    },

    setEventListening: (state, action: PayloadAction<boolean>) => {
      state.events.listening = action.payload;
    },

    clearEvents: state => {
      state.events.list = [];
    },

    // 错误处理
    clearWorkflowError: state => {
      state.workflow.error = null;
    },

    clearDataError: state => {
      state.data.error = null;
    },

    clearError: state => {
      state.workflow.error = null;
      state.data.error = null;
    },

    // 刷新状态
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.ui.refreshing = action.payload;
    },
  },
  extraReducers: builder => {
    // 获取工作流状态
    builder
      .addCase(fetchWorkflowStatus.pending, state => {
        state.workflow.loading = true;
        state.workflow.error = null;
      })
      .addCase(fetchWorkflowStatus.fulfilled, (state, action) => {
        state.workflow.loading = false;
        if (action.payload) {
          state.workflow.status = action.payload.status;
          state.workflow.logs = action.payload.logs || [];
        }
      })
      .addCase(fetchWorkflowStatus.rejected, (state, action) => {
        state.workflow.loading = false;
        state.workflow.error = action.payload as string;
      });

    // 获取工作流统计
    builder
      .addCase(fetchWorkflowStats.pending, state => {
        state.workflow.loading = true;
      })
      .addCase(fetchWorkflowStats.fulfilled, (state, action) => {
        state.workflow.loading = false;
        state.workflow.stats = action.payload || null;
      })
      .addCase(fetchWorkflowStats.rejected, (state, action) => {
        state.workflow.loading = false;
        state.workflow.error = action.payload as string;
      });

    // 执行工作流操作
    builder
      .addCase(executeWorkflowAction.pending, state => {
        state.workflow.loading = true;
        state.workflow.error = null;
      })
      .addCase(executeWorkflowAction.fulfilled, (state, action) => {
        state.workflow.loading = false;
        // 根据操作类型更新状态
        const { action: workflowAction } = action.payload;
        switch (workflowAction) {
          case 'start':
            state.workflow.status = 'running';
            break;
          case 'stop':
            state.workflow.status = 'idle';
            break;
          case 'restart':
            state.workflow.status = 'running';
            break;
          case 'pause':
            state.workflow.status = 'paused';
            break;
          case 'resume':
            state.workflow.status = 'running';
            break;
        }
      })
      .addCase(executeWorkflowAction.rejected, (state, action) => {
        state.workflow.loading = false;
        state.workflow.error = action.payload as string;
      });

    // 获取Reddit帖子
    builder
      .addCase(fetchRedditPosts.pending, state => {
        state.data.loading = true;
        state.data.error = null;
      })
      .addCase(fetchRedditPosts.fulfilled, (state, action) => {
        state.data.loading = false;
        state.data.posts = action.payload.posts;
        state.data.pagination.total = action.payload.total;
        state.data.pagination.current = action.payload.page;
        state.data.pagination.pageSize = action.payload.pageSize;
      })
      .addCase(fetchRedditPosts.rejected, (state, action) => {
        state.data.loading = false;
        state.data.error = action.payload as string;
      });

    // 搜索Reddit帖子
    builder
      .addCase(searchRedditPosts.pending, state => {
        state.data.loading = true;
        state.data.error = null;
      })
      .addCase(searchRedditPosts.fulfilled, (state, action) => {
        state.data.loading = false;
        state.data.posts = action.payload.posts;
        state.data.pagination.total = action.payload.total;
        state.data.pagination.current = 1; // 搜索结果重置到第一页
      })
      .addCase(searchRedditPosts.rejected, (state, action) => {
        state.data.loading = false;
        state.data.error = action.payload as string;
      });

    // 获取Reddit统计信息
    builder
      .addCase(fetchRedditStats.pending, state => {
        state.workflow.loading = true;
        state.workflow.error = null;
      })
      .addCase(fetchRedditStats.fulfilled, (state, action) => {
        state.workflow.loading = false;
        state.workflow.stats = action.payload || null;
      })
      .addCase(fetchRedditStats.rejected, (state, action) => {
        state.workflow.loading = false;
        state.workflow.error = action.payload as string;
      });

    // 清理缓存
    builder.addCase(clearRedditCache.fulfilled, state => {
      // 清理缓存后可以选择重新加载数据
      state.data.posts = [];
      state.data.pagination.total = 0;
      state.data.pagination.current = 1;
    });
  },
});

// 导出actions
export const {
  setActiveTab,
  setSelectedPost,
  setSidebarCollapsed,
  setAutoRefresh,
  setAutoRefreshInterval,
  setDataFilters,
  setDataSort,
  resetDataFilters,
  setCurrentPage,
  setPageSize,
  updateWorkflowConfig,
  setWorkflowConfig,
  addWorkflowEvent,
  setEventListening,
  clearEvents,
  clearWorkflowError,
  clearDataError,
  clearError,
  setRefreshing,
} = redditWorkflowSlice.actions;

// 选择器
export const selectRedditWorkflow = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow;
export const selectWorkflowStatus = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.status;
export const selectWorkflowConfig = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.config;
export const selectWorkflowStats = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.stats;
export const selectWorkflowLogs = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.logs;
export const selectWorkflowLoading = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.loading;
export const selectWorkflowError = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.error;

export const selectRedditPosts = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.data.posts;
export const selectDataLoading = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.data.loading;
export const selectDataError = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.data.error;
export const selectDataPagination = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.data.pagination;
export const selectDataFilters = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.data.filters;
export const selectDataSort = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.data.sort;

export const selectUIState = (state: { redditWorkflow: RedditWorkflowState }) =>
  state.redditWorkflow.ui;
export const selectActiveTab = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.ui.activeTab;
export const selectSelectedPost = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.ui.selectedPost;
export const selectSidebarCollapsed = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.ui.sidebarCollapsed;
export const selectAutoRefresh = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.ui.autoRefresh;
export const selectAutoRefreshInterval = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.ui.autoRefreshInterval;
export const selectRefreshing = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.ui.refreshing;

export const selectWorkflowEvents = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.events.list;
export const selectEventListening = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.events.listening;

// 通用错误选择器 - 返回工作流错误或数据错误
export const selectError = (state: { redditWorkflow: RedditWorkflowState }) =>
  state.redditWorkflow.workflow.error || state.redditWorkflow.data.error;

// 通用加载状态选择器 - 返回工作流加载或数据加载状态
export const selectRedditLoading = (state: {
  redditWorkflow: RedditWorkflowState;
}) =>
  state.redditWorkflow.workflow.loading || state.redditWorkflow.data.loading;

// Reddit统计信息选择器 - 返回工作流统计数据
export const selectRedditStats = (state: {
  redditWorkflow: RedditWorkflowState;
}) => state.redditWorkflow.workflow.stats;

// 导出slice和reducer
export { redditWorkflowSlice };
export default redditWorkflowSlice.reducer;
