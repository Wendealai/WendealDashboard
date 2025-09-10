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

// Create test store
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

// Custom render function
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
  // Set initial route
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

// Mock user data
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

// Mock dashboard data
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

// Mock notification data
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

// Mock API response function
function mockApiResponse<T>(data: T, delay = 100): Promise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

// Test utility functions
export const testUtils = {
  // Wait for async operations to complete
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock API response
  mockApiResponse,
  
  // Mock API error
  mockApiError: (message = 'API Error', delay = 100) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), delay);
    });
  },
  
  // Create mock event
  createMockEvent: (type: string, data: any = {}) => {
    return new CustomEvent(type, { detail: data });
  },
  
  // Mock file
  createMockFile: (name = 'test.txt', content = 'test content', type = 'text/plain') => {
    return new File([content], name, { type });
  },
};

// Common test assertions
export const assertions = {
  // Check if element is visible
  toBeVisible: (element: HTMLElement) => {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  },
  
  // Check loading state
  toBeLoading: (container: HTMLElement) => {
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  },
  
  // Check error state
  toShowError: (container: HTMLElement, message?: string) => {
    const errorElement = container.querySelector('.ant-alert-error, .error-message');
    expect(errorElement).toBeInTheDocument();
    if (message) {
      expect(errorElement).toHaveTextContent(message);
    }
  },
  
  // Check success state
  toShowSuccess: (container: HTMLElement, message?: string) => {
    const successElement = container.querySelector('.ant-alert-success, .success-message');
    expect(successElement).toBeInTheDocument();
    if (message) {
      expect(successElement).toHaveTextContent(message);
    }
  },
};

// Re-export common testing library functions
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { renderWithProviders as render };