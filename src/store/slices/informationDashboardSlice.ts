/**
 * 信息展示模块Redux状态管理
 * 管理工作流、信息数据和仪表盘相关状态
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  WorkflowInfo,
  WorkflowExecution,
  InformationItem,
  DashboardData,
  InformationQueryParams,
  TriggerWorkflowRequest,
  TriggerWorkflowResponse,
  InformationDashboardReduxState,
} from '@/pages/InformationDashboard/types';

// 初始状态
const initialState: InformationDashboardReduxState = {
  workflows: {
    list: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
    },
  },
  executions: {
    list: [],
    loading: false,
    error: null,
    activeExecution: null,
  },
  information: {
    list: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 20,
      total: 0,
    },
    filters: {
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  },
  dashboard: {
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  },
  ui: {
    activeTab: 'overview',
    selectedWorkflow: null,
    selectedInformation: null,
    sidebarCollapsed: false,
    refreshing: false,
  },
};

// 异步Thunk Actions

/**
 * 获取工作流列表
 */
export const fetchWorkflows = createAsyncThunk(
  'informationDashboard/fetchWorkflows',
  async (
    params: { page?: number; pageSize?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      // TODO: 实现实际的API调用
      // const response = await workflowService.getWorkflows(params);
      // return response.data;

      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        data: [
          {
            id: '1',
            name: '数据同步工作流',
            description: '定期同步外部数据源',
            type: 'scheduled' as const,
            status: 'active' as const,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
            executionCount: 150,
            successRate: 95.5,
            author: {
              id: 'user1',
              name: '张三',
              avatar: '',
            },
          },
        ],
        pagination: {
          current: 1,
          pageSize: 10,
          total: 1,
        },
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取工作流列表失败'
      );
    }
  }
);

/**
 * 触发工作流执行
 */
export const triggerWorkflow = createAsyncThunk(
  'informationDashboard/triggerWorkflow',
  async (request: TriggerWorkflowRequest, { rejectWithValue }) => {
    try {
      // TODO: 实现实际的API调用
      // const response = await workflowService.triggerWorkflow(request);
      // return response.data;

      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        executionId: `exec_${Date.now()}`,
        status: 'running' as const,
        message: '工作流已成功触发',
      } as TriggerWorkflowResponse;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '触发工作流失败'
      );
    }
  }
);

/**
 * 获取工作流执行记录
 */
export const fetchWorkflowExecutions = createAsyncThunk(
  'informationDashboard/fetchWorkflowExecutions',
  async (workflowId?: string, { rejectWithValue }) => {
    try {
      // TODO: 实现实际的API调用
      // const response = await workflowService.getExecutions(workflowId);
      // return response.data;

      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 800));
      return [
        {
          id: 'exec_1',
          workflowId: '1',
          status: 'success' as const,
          startedAt: '2024-01-15T14:30:00Z',
          finishedAt: '2024-01-15T14:32:00Z',
          duration: 120000,
        },
      ] as WorkflowExecution[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取执行记录失败'
      );
    }
  }
);

/**
 * 获取信息数据列表
 */
export const fetchInformationList = createAsyncThunk(
  'informationDashboard/fetchInformationList',
  async (params: InformationQueryParams, { rejectWithValue }) => {
    try {
      // TODO: 实现实际的API调用
      // const response = await informationService.getInformationList(params);
      // return response.data;

      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        data: [
          {
            id: '1',
            title: '系统状态报告',
            content: '系统运行正常，所有服务可用',
            type: 'text' as const,
            category: '系统监控',
            source: '监控系统',
            priority: 'medium' as const,
            status: 'active' as const,
            createdAt: '2024-01-15T15:00:00Z',
            updatedAt: '2024-01-15T15:00:00Z',
            createdBy: {
              id: 'user1',
              name: '系统',
            },
          },
        ],
        pagination: {
          current: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 1,
        },
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取信息列表失败'
      );
    }
  }
);

/**
 * 获取仪表盘数据
 */
export const fetchDashboardData = createAsyncThunk(
  'informationDashboard/fetchDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: 实现实际的API调用
      // const response = await dashboardService.getDashboardData();
      // return response.data;

      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        workflowStats: {
          total: 5,
          active: 3,
          inactive: 1,
          error: 1,
          totalExecutions: 1250,
          successfulExecutions: 1180,
          failedExecutions: 70,
          averageExecutionTime: 45000,
          executionTrend: [
            { date: '2024-01-10', count: 45, successCount: 42, failedCount: 3 },
            { date: '2024-01-11', count: 52, successCount: 50, failedCount: 2 },
            { date: '2024-01-12', count: 38, successCount: 36, failedCount: 2 },
          ],
        },
        informationStats: {
          total: 1250,
          byCategory: {
            系统监控: 450,
            业务数据: 380,
            用户反馈: 220,
            其他: 200,
          },
          byType: {
            text: 800,
            number: 200,
            date: 150,
            url: 100,
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
            { date: '2024-01-10', count: 15 },
            { date: '2024-01-11', count: 22 },
            { date: '2024-01-12', count: 18 },
          ],
        },
        recentExecutions: [],
        recentInformation: [],
        systemHealth: {
          status: 'healthy' as const,
          uptime: 99.8,
          lastCheck: '2024-01-15T16:00:00Z',
        },
      } as DashboardData;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取仪表盘数据失败'
      );
    }
  }
);

// Redux Slice
const informationDashboardSlice = createSlice({
  name: 'informationDashboard',
  initialState,
  reducers: {
    // UI状态管理
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.ui.activeTab = action.payload;
    },
    setSelectedWorkflow: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedWorkflow = action.payload;
    },
    setSelectedInformation: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedInformation = action.payload;
    },
    toggleSidebar: state => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.ui.sidebarCollapsed = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.ui.refreshing = action.payload;
    },

    // 信息数据过滤器
    setInformationFilters: (
      state,
      action: PayloadAction<InformationQueryParams>
    ) => {
      state.information.filters = {
        ...state.information.filters,
        ...action.payload,
      };
    },
    resetInformationFilters: state => {
      state.information.filters = {
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
    },

    // 分页管理
    setWorkflowPagination: (
      state,
      action: PayloadAction<{ current: number; pageSize: number }>
    ) => {
      state.workflows.pagination = {
        ...state.workflows.pagination,
        ...action.payload,
      };
    },
    setInformationPagination: (
      state,
      action: PayloadAction<{ current: number; pageSize: number }>
    ) => {
      state.information.pagination = {
        ...state.information.pagination,
        ...action.payload,
      };
    },

    // 错误处理
    clearWorkflowError: state => {
      state.workflows.error = null;
    },
    clearExecutionError: state => {
      state.executions.error = null;
    },
    clearInformationError: state => {
      state.information.error = null;
    },
    clearDashboardError: state => {
      state.dashboard.error = null;
    },
    clearAllErrors: state => {
      state.workflows.error = null;
      state.executions.error = null;
      state.information.error = null;
      state.dashboard.error = null;
    },

    // 重置状态
    resetWorkflowState: state => {
      state.workflows = initialState.workflows;
    },
    resetInformationState: state => {
      state.information = initialState.information;
    },
    resetDashboardState: state => {
      state.dashboard = initialState.dashboard;
    },
    resetAllState: () => initialState,
  },
  extraReducers: builder => {
    // 工作流列表
    builder
      .addCase(fetchWorkflows.pending, state => {
        state.workflows.loading = true;
        state.workflows.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.workflows.loading = false;
        state.workflows.list = action.payload.data;
        state.workflows.pagination = action.payload.pagination;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.workflows.loading = false;
        state.workflows.error = action.payload as string;
      })

      // 触发工作流
      .addCase(triggerWorkflow.pending, state => {
        state.executions.loading = true;
        state.executions.error = null;
      })
      .addCase(triggerWorkflow.fulfilled, (state, action) => {
        state.executions.loading = false;
        // 可以在这里添加新的执行记录到列表中
      })
      .addCase(triggerWorkflow.rejected, (state, action) => {
        state.executions.loading = false;
        state.executions.error = action.payload as string;
      })

      // 工作流执行记录
      .addCase(fetchWorkflowExecutions.pending, state => {
        state.executions.loading = true;
        state.executions.error = null;
      })
      .addCase(fetchWorkflowExecutions.fulfilled, (state, action) => {
        state.executions.loading = false;
        state.executions.list = action.payload;
      })
      .addCase(fetchWorkflowExecutions.rejected, (state, action) => {
        state.executions.loading = false;
        state.executions.error = action.payload as string;
      })

      // 信息数据列表
      .addCase(fetchInformationList.pending, state => {
        state.information.loading = true;
        state.information.error = null;
      })
      .addCase(fetchInformationList.fulfilled, (state, action) => {
        state.information.loading = false;
        state.information.list = action.payload.data;
        state.information.pagination = action.payload.pagination;
      })
      .addCase(fetchInformationList.rejected, (state, action) => {
        state.information.loading = false;
        state.information.error = action.payload as string;
      })

      // 仪表盘数据
      .addCase(fetchDashboardData.pending, state => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.data = action.payload;
        state.dashboard.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.error = action.payload as string;
      });
  },
});

// 导出actions
export const {
  setActiveTab,
  setSelectedWorkflow,
  setSelectedInformation,
  toggleSidebar,
  setSidebarCollapsed,
  setRefreshing,
  setInformationFilters,
  resetInformationFilters,
  setWorkflowPagination,
  setInformationPagination,
  clearWorkflowError,
  clearExecutionError,
  clearInformationError,
  clearDashboardError,
  clearAllErrors,
  resetWorkflowState,
  resetInformationState,
  resetDashboardState,
  resetAllState,
} = informationDashboardSlice.actions;

// 导出reducer
export default informationDashboardSlice.reducer;

// 导出选择器
export const selectWorkflows = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.workflows;

export const selectExecutions = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.executions;

export const selectInformation = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information;

export const selectDashboard = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.dashboard;

export const selectUI = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui;

// 专用选择器
export const selectWorkflowsLoading = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.workflows.loading;

export const selectExecutionsLoading = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.executions.loading;

export const selectInformationLoading = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.loading;

export const selectDashboardLoading = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.dashboard.loading;

export const selectWorkflowsList = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.workflows.list;

export const selectExecutionsList = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.executions.list;

export const selectInformationList = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.list;

export const selectDashboardData = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.dashboard.data;

export const selectActiveTab = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.activeTab;

export const selectSelectedWorkflow = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.selectedWorkflow;

export const selectSelectedInformation = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.selectedInformation;

// 错误选择器
export const selectWorkflowsError = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.workflows.error;

export const selectExecutionsError = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.executions.error;

export const selectInformationError = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.error;

export const selectDashboardError = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.dashboard.error;

// 分页选择器
export const selectWorkflowsPagination = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.workflows.pagination;

export const selectInformationPagination = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.pagination;

// 过滤器选择器
export const selectInformationFilters = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.filters;

// 组件中使用的别名选择器
export const selectInformationData = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information;

export const selectLoading = (state: {
  informationDashboard: InformationDashboardReduxState;
}) =>
  state.informationDashboard.dashboard.loading ||
  state.informationDashboard.workflows.loading ||
  state.informationDashboard.information.loading;

// 统计数据选择器
export const selectInformationStats = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => {
  const dashboard = state.informationDashboard.dashboard.data;
  return dashboard
    ? {
        total: dashboard.informationStats.total,
        active: dashboard.informationStats.active,
        archived: dashboard.informationStats.archived,
        categories: dashboard.informationStats.categories,
        recentCount: dashboard.informationStats.recentCount,
        lastUpdated: dashboard.informationStats.lastUpdated,
      }
    : {
        total: 0,
        active: 0,
        archived: 0,
        categories: {},
        recentCount: 0,
        lastUpdated: null,
      };
};

export const selectWorkflowStats = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => {
  const dashboard = state.informationDashboard.dashboard.data;
  return dashboard
    ? {
        total: dashboard.workflowStats.total,
        active: dashboard.workflowStats.active,
        inactive: dashboard.workflowStats.inactive,
        error: dashboard.workflowStats.error,
        totalExecutions: dashboard.workflowStats.totalExecutions,
        successfulExecutions: dashboard.workflowStats.successfulExecutions,
        failedExecutions: dashboard.workflowStats.failedExecutions,
        averageExecutionTime: dashboard.workflowStats.averageExecutionTime,
        lastExecution: dashboard.workflowStats.lastExecution,
      }
    : {
        total: 0,
        active: 0,
        inactive: 0,
        error: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecution: null,
      };
};

// 刷新状态选择器
export const selectRefreshing = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.refreshing;

// 侧边栏状态选择器
export const selectSidebarCollapsed = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.sidebarCollapsed;

// 活跃执行选择器
export const selectActiveExecution = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.executions.activeExecution;

// 最后更新时间选择器
export const selectDashboardLastUpdated = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.dashboard.lastUpdated;
