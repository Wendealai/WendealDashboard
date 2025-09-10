import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import userSlice from '../../store/slices/userSlice';
import uiSlice from '../../store/slices/uiSlice';
import dashboardSlice from '../../store/slices/dashboardSlice';
import Home from '../../pages/Home';

// Mock services
jest.mock('../../services/dashboardService', () => ({
  getStatistics: jest.fn().mockResolvedValue({
    success: true,
    data: {
      totalUsers: 1000,
      totalOrders: 500,
      totalRevenue: 50000,
      activeUsers: 200,
    },
  }),
  getRecentActivities: jest.fn().mockResolvedValue({
    success: true,
    data: [
      {
        id: 1,
        type: 'login',
        user: 'user1',
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        type: 'order',
        user: 'user2',
        timestamp: new Date().toISOString(),
      },
    ],
  }),
}));

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
  },
}));

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      user: userSlice,
      ui: uiSlice,
      dashboard: dashboardSlice,
    },
    preloadedState: {
      user: {
        currentUser: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        ...(initialState as any).user,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        ...(initialState as any).ui,
      },
      dashboard: {
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
        ...(initialState as any).dashboard,
      },
      ...initialState,
    },
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  store = createMockStore()
) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider locale={zhCN}>{component}</ConfigProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('User Interaction Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Home页面正确渲染', async () => {
    const store = createMockStore();
    renderWithProviders(<Home />, store);

    // 应该显示Home页面内容
    await waitFor(() => {
      expect(
        screen.getByText(/欢迎/i) ||
          screen.getByText(/首页/i) ||
          screen.getByText(/主页/i)
      ).toBeInTheDocument();
    });
  });

  test('Redux状态正确初始化', async () => {
    const store = createMockStore({
      user: {
        currentUser: { id: 1, username: 'testuser', email: 'test@example.com' },
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    });

    renderWithProviders(<Home />, store);

    // 验证Redux状态
    expect(store.getState().user.isAuthenticated).toBe(true);
    expect((store.getState().user.currentUser as any)?.username).toBe(
      'testuser'
    );
  });

  test('UI状态管理正常工作', async () => {
    const store = createMockStore({
      ui: {
        theme: 'dark',
        sidebarCollapsed: true,
        loading: false,
      },
    });

    renderWithProviders(<Home />, store);

    // 验证UI状态
    expect(store.getState().ui.theme).toBe('dark');
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  test('Dashboard状态管理正常工作', async () => {
    const mockStatistics = {
      totalUsers: 1000,
      totalOrders: 500,
      totalRevenue: 50000,
      activeUsers: 200,
    };

    const store = createMockStore({
      dashboard: {
        stats: mockStatistics,
        activities: [],
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
      },
    });

    renderWithProviders(<Home />, store);

    // 验证Dashboard状态
    expect(store.getState().dashboard.stats).toEqual(mockStatistics);
    expect(store.getState().dashboard.loading.stats).toBe(false);
  });

  test('错误状态正确处理', async () => {
    const store = createMockStore({
      user: {
        currentUser: null,
        isAuthenticated: false,
        loading: false,
        error: '网络错误',
      },
    });

    renderWithProviders(<Home />, store);

    // 验证错误状态
    expect(store.getState().user.error).toBe('网络错误');
  });

  test('加载状态正确处理', async () => {
    const store = createMockStore({
      dashboard: {
        stats: null,
        activities: [],
        systemStatus: null,
        loading: {
          stats: true,
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
      },
    });

    renderWithProviders(<Home />, store);

    // 验证加载状态
    expect(store.getState().dashboard.loading.stats).toBe(true);
  });
});
