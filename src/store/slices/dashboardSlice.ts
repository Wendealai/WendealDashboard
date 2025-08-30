import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchDashboardStats,
  fetchRecentActivities,
  fetchSystemStatus,
  refreshDashboardData,
} from '@/services/dashboardService';
import type {
  DashboardStats,
  ActivityItem,
  SystemStatus,
} from '@/services/dashboardService';

interface DashboardState {
  stats: DashboardStats | null;
  activities: ActivityItem[];
  systemStatus: SystemStatus | null;
  loading: {
    stats: boolean;
    activities: boolean;
    systemStatus: boolean;
    refresh: boolean;
  };
  error: {
    stats: string | null;
    activities: string | null;
    systemStatus: string | null;
    refresh: string | null;
  };
  dateRange: string;
  lastUpdated: number | null;
}

const initialState: DashboardState = {
  stats: null,
  activities: [],
  systemStatus: null,
  loading: {
    stats: false,
    activities: false,
    systemStatus: false,
    refresh: false,
  },
  error: {
    stats: null,
    activities: null,
    systemStatus: null,
    refresh: null,
  },
  dateRange: '7d',
  lastUpdated: null,
};

// 异步thunk actions
export const loadDashboardStats = createAsyncThunk(
  'dashboard/loadStats',
  async (dateRange: string, { rejectWithValue }) => {
    try {
      const stats = await fetchDashboardStats(dateRange);
      return stats;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取统计数据失败'
      );
    }
  }
);

export const loadRecentActivities = createAsyncThunk(
  'dashboard/loadActivities',
  async (_, { rejectWithValue }) => {
    try {
      const activities = await fetchRecentActivities();
      return activities;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取活动数据失败'
      );
    }
  }
);

export const loadSystemStatus = createAsyncThunk(
  'dashboard/loadSystemStatus',
  async (_, { rejectWithValue }) => {
    try {
      const systemStatus = await fetchSystemStatus();
      return systemStatus;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取系统状态失败'
      );
    }
  }
);

export const refreshAllDashboardData = createAsyncThunk(
  'dashboard/refreshAll',
  async (dateRange: string, { rejectWithValue }) => {
    try {
      const data = await refreshDashboardData(dateRange);
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '刷新数据失败'
      );
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDateRange: (state, action: PayloadAction<string>) => {
      state.dateRange = action.payload;
    },
    clearErrors: state => {
      state.error = {
        stats: null,
        activities: null,
        systemStatus: null,
        refresh: null,
      };
    },
    resetDashboard: state => {
      return { ...initialState, dateRange: state.dateRange };
    },
  },
  extraReducers: builder => {
    // 统计数据
    builder
      .addCase(loadDashboardStats.pending, state => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(loadDashboardStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(loadDashboardStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload as string;
      });

    // 活动数据
    builder
      .addCase(loadRecentActivities.pending, state => {
        state.loading.activities = true;
        state.error.activities = null;
      })
      .addCase(loadRecentActivities.fulfilled, (state, action) => {
        state.loading.activities = false;
        state.activities = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(loadRecentActivities.rejected, (state, action) => {
        state.loading.activities = false;
        state.error.activities = action.payload as string;
      });

    // 系统状态
    builder
      .addCase(loadSystemStatus.pending, state => {
        state.loading.systemStatus = true;
        state.error.systemStatus = null;
      })
      .addCase(loadSystemStatus.fulfilled, (state, action) => {
        state.loading.systemStatus = false;
        state.systemStatus = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(loadSystemStatus.rejected, (state, action) => {
        state.loading.systemStatus = false;
        state.error.systemStatus = action.payload as string;
      });

    // 刷新所有数据
    builder
      .addCase(refreshAllDashboardData.pending, state => {
        state.loading.refresh = true;
        state.error.refresh = null;
      })
      .addCase(refreshAllDashboardData.fulfilled, (state, action) => {
        state.loading.refresh = false;
        state.stats = action.payload.stats;
        state.activities = action.payload.activities;
        state.systemStatus = action.payload.systemStatus;
        state.lastUpdated = Date.now();
      })
      .addCase(refreshAllDashboardData.rejected, (state, action) => {
        state.loading.refresh = false;
        state.error.refresh = action.payload as string;
      });
  },
});

export const { setDateRange, clearErrors, resetDashboard } =
  dashboardSlice.actions;
export default dashboardSlice.reducer;
