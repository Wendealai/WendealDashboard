import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from '@/store';
import type { RootState } from '@/store';
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/store/slices/userSlice';
import uiReducer from '@/store/slices/uiSlice';

// 创建测试用的store
export function createTestStore(initialState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      user: userReducer,
      ui: uiReducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
}

// 自定义渲染函数
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Partial<RootState>;
  store?: ReturnType<typeof createTestStore>;
  route?: string;
}

function AllTheProviders({ children, testStore, route = '/' }: {
  children: React.ReactNode;
  testStore: ReturnType<typeof createTestStore>;
  route?: string;
}) {
  // 设置初始路由
  window.history.pushState({}, 'Test page', route);
  
  return (
    <Provider store={testStore}>
      <BrowserRouter>
        <ConfigProvider locale={zhCN}>
          {children}
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialState,
    store = createTestStore(initialState),
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AllTheProviders testStore={store} route={route}>
        {children}
      </AllTheProviders>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// 模拟用户数据
export const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user' as const,
  permissions: ['read', 'write'],
  profile: {
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    address: 'Test Address',
  },
};

// 模拟仪表板数据
export const mockDashboardData = {
  statistics: {
    totalUsers: 1234,
    totalOrders: 5678,
    totalRevenue: 123456.78,
    growthRate: 12.5,
  },
  chartData: [
    { date: '2024-01', value: 100 },
    { date: '2024-02', value: 120 },
    { date: '2024-03', value: 150 },
  ],
  recentActivities: [
    {
      id: '1',
      type: 'login',
      user: 'John Doe',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      description: 'User logged in',
    },
  ],
};

// 模拟通知数据
export const mockNotifications = [
  {
    id: '1',
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info' as const,
    priority: 'medium' as const,
    status: 'unread' as const,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  },
];

// 模拟API响应函数
function mockApiResponse<T>(data: T, delay = 100): Promise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

// 测试工具函数
export const testUtils = {
  // 等待异步操作完成
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 模拟API响应
  mockApiResponse,
  
  // 模拟API错误
  mockApiError: (message = 'API Error', delay = 100) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), delay);
    });
  },
  
  // 创建模拟事件
  createMockEvent: (type: string, data: any = {}) => {
    return new CustomEvent(type, { detail: data });
  },
  
  // 模拟文件
  createMockFile: (name = 'test.txt', content = 'test content', type = 'text/plain') => {
    return new File([content], name, { type });
  },
};

// 常用的测试断言
export const assertions = {
  // 检查元素是否可见
  toBeVisible: (element: HTMLElement) => {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  },
  
  // 检查加载状态
  toBeLoading: (container: HTMLElement) => {
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  },
  
  // 检查错误状态
  toShowError: (container: HTMLElement, message?: string) => {
    const errorElement = container.querySelector('.ant-alert-error, .error-message');
    expect(errorElement).toBeInTheDocument();
    if (message) {
      expect(errorElement).toHaveTextContent(message);
    }
  },
  
  // 检查成功状态
  toShowSuccess: (container: HTMLElement, message?: string) => {
    const successElement = container.querySelector('.ant-alert-success, .success-message');
    expect(successElement).toBeInTheDocument();
    if (message) {
      expect(successElement).toHaveTextContent(message);
    }
  },
};

// 重新导出常用的测试库函数
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { renderWithProviders as render };