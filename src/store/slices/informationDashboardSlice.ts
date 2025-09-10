/**
 * Information Dashboard Redux State Management
 * Manages workflow, information data and dashboard related states
 */

import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  // WorkflowInfo,
  WorkflowExecution,
  // InformationItem,
  DashboardData,
  InformationQueryParams,
  TriggerWorkflowRequest,
  TriggerWorkflowResponse,
  InformationDashboardReduxState,
} from '@/pages/InformationDashboard/types';

// Initial state
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

// Async Thunk Actions

/**
 * Fetch workflow list
 */
export const fetchWorkflows = createAsyncThunk(
  'informationDashboard/fetchWorkflows',
  async (
    _params: { page?: number; pageSize?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      // TODO: Implement actual API call
      // const response = await workflowService.getWorkflows(params);
      // return response.data;

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        data: [
          {
            id: '1',
            name: 'Data Sync Workflow',
            description: 'Periodically sync external data sources',
            type: 'scheduled' as const,
            status: 'active' as const,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
            executionCount: 150,
            successRate: 95.5,
            author: {
              id: 'user1',
              name: 'John Doe',
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
        error instanceof Error ? error.message : 'Failed to fetch workflow list'
      );
    }
  }
);

/**
 * Trigger workflow execution
 */
export const triggerWorkflow = createAsyncThunk(
  'informationDashboard/triggerWorkflow',
  async (_request: TriggerWorkflowRequest, { rejectWithValue }) => {
    try {
      // TODO: Implement actual API call
      // const response = await workflowService.triggerWorkflow(request);
      // return response.data;

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        executionId: `exec_${Date.now()}`,
        status: 'running' as const,
        message: 'Workflow triggered successfully',
      } as TriggerWorkflowResponse;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to trigger workflow'
      );
    }
  }
);

/**
 * Fetch workflow execution records
 */
export const fetchWorkflowExecutions = createAsyncThunk(
  'informationDashboard/fetchWorkflowExecutions',
  async (_workflowId: string | undefined, { rejectWithValue }) => {
    try {
      // TODO: Implement actual API call
      // const response = await workflowService.getExecutions(workflowId);
      // return response.data;

      // Mock data
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
        error instanceof Error
          ? error.message
          : 'Failed to fetch execution records'
      );
    }
  }
);

/**
 * Fetch information data list
 */
export const fetchInformationList = createAsyncThunk(
  'informationDashboard/fetchInformationList',
  async (params: InformationQueryParams, { rejectWithValue }) => {
    try {
      // TODO: Implement actual API call
      // const response = await informationService.getInformationList(params);
      // return response.data;

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        data: [
          {
            id: '1',
            title: 'System Status Report',
            content: 'System running normally, all services available',
            type: 'text' as const,
            category: 'System Monitoring',
            source: 'Monitoring System',
            priority: 'medium' as const,
            status: 'active' as const,
            createdAt: '2024-01-15T15:00:00Z',
            updatedAt: '2024-01-15T15:00:00Z',
            createdBy: {
              id: 'user1',
              name: 'System',
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
        error instanceof Error
          ? error.message
          : 'Failed to fetch information list'
      );
    }
  }
);

/**
 * Fetch dashboard data
 */
export const fetchDashboardData = createAsyncThunk(
  'informationDashboard/fetchDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implement actual API call
      // const response = await dashboardService.getDashboardData();
      // return response.data;

      // Mock data
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
            'System Monitoring': 450,
            'Business Data': 380,
            'User Feedback': 220,
            Other: 200,
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
        error instanceof Error
          ? error.message
          : 'Failed to fetch dashboard data'
      );
    }
  }
);

// Redux Slice
const informationDashboardSlice = createSlice({
  name: 'informationDashboard',
  initialState,
  reducers: {
    // UI state management
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

    // Information data filters
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

    // Pagination management
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

    // Error handling
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

    // Reset state
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
    // Workflow list
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

      // Trigger workflow
      .addCase(triggerWorkflow.pending, state => {
        state.executions.loading = true;
        state.executions.error = null;
      })
      .addCase(triggerWorkflow.fulfilled, (state, _action) => {
        state.executions.loading = false;
        // Can add new execution record to list here
      })
      .addCase(triggerWorkflow.rejected, (state, action) => {
        state.executions.loading = false;
        state.executions.error = action.payload as string;
      })

      // Workflow execution records
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

      // Information data list
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

      // Dashboard data
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

// Export actions
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

// Export reducer
export default informationDashboardSlice.reducer;

// Export selectors
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

// Specialized selectors
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

// Error selectors
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

// Pagination selectors
export const selectWorkflowsPagination = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.workflows.pagination;

export const selectInformationPagination = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.pagination;

// Filter selectors
export const selectInformationFilters = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information.filters;

// Alias selectors used in components
export const selectInformationData = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.information;

export const selectLoading = (state: {
  informationDashboard: InformationDashboardReduxState;
}) =>
  state.informationDashboard.dashboard.loading ||
  state.informationDashboard.workflows.loading ||
  state.informationDashboard.information.loading;

// Statistics data selectors
/**
 * Memoized selector for information statistics
 * Uses createSelector to prevent unnecessary re-renders when dashboard data hasn't changed
 */
export const selectInformationStats = createSelector(
  [
    (state: { informationDashboard: InformationDashboardReduxState }) =>
      state.informationDashboard.dashboard.data,
  ],
  dashboard => {
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
  }
);

/**
 * Memoized selector for workflow statistics
 * Uses createSelector to prevent unnecessary re-renders when dashboard data hasn't changed
 */
export const selectWorkflowStats = createSelector(
  [
    (state: { informationDashboard: InformationDashboardReduxState }) =>
      state.informationDashboard.dashboard.data,
  ],
  dashboard => {
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
  }
);

// Refresh state selector
export const selectRefreshing = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.refreshing;

// Sidebar state selector
export const selectSidebarCollapsed = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.ui.sidebarCollapsed;

// Active execution selector
export const selectActiveExecution = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.executions.activeExecution;

// Last updated time selector
export const selectDashboardLastUpdated = (state: {
  informationDashboard: InformationDashboardReduxState;
}) => state.informationDashboard.dashboard.lastUpdated;
