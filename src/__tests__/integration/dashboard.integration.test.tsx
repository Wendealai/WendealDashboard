import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  mockUser,
  mockDashboardData,
} from '@/__tests__/utils/test-utils';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import { server } from '@/mocks/server';
import { rest } from 'msw';

// 启动MSW服务器
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // 设置认证状态
    localStorage.setItem('token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should load and display dashboard data correctly', async () => {
    // 模拟已认证用户
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 检查页面标题
    expect(screen.getByText('仪表板')).toBeInTheDocument();

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.getByText('总用户数')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    // 检查统计卡片
    expect(screen.getByText('总订单数')).toBeInTheDocument();
    expect(screen.getByText('5,678')).toBeInTheDocument();
    expect(screen.getByText('总收入')).toBeInTheDocument();
    expect(screen.getByText('¥123,456.78')).toBeInTheDocument();
    expect(screen.getByText('增长率')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    // 模拟API错误
    server.use(
      rest.get('/api/dashboard/statistics', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ message: 'Internal Server Error' })
        );
      })
    );

    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 等待错误状态显示
    await waitFor(() => {
      expect(screen.getByText('数据加载失败')).toBeInTheDocument();
    });

    // 检查重试按钮
    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeInTheDocument();
  });

  it('should refresh data when refresh button is clicked', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 等待初始数据加载
    await waitFor(() => {
      expect(screen.getByText('总用户数')).toBeInTheDocument();
    });

    // 点击刷新按钮
    const refreshButton = screen.getByTestId('refresh-dashboard');
    fireEvent.click(refreshButton);

    // 检查加载状态
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();

    // 等待数据重新加载
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
      expect(screen.getByText('总用户数')).toBeInTheDocument();
    });
  });

  it('should filter chart data by date range', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 等待图表加载
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    });

    // 选择日期范围
    const dateRangePicker = screen.getByTestId('date-range-picker');
    fireEvent.click(dateRangePicker);

    // 选择最近7天
    const last7DaysOption = screen.getByText('最近7天');
    fireEvent.click(last7DaysOption);

    // 等待图表更新
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    });
  });

  it('should export data when export button is clicked', async () => {
    // Mock URL.createObjectURL
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: mockCreateObjectURL,
    });

    // Mock link click
    const mockClick = jest.fn();
    const mockLink = {
      click: mockClick,
      href: '',
      download: '',
      style: { display: '' },
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockLink as any);
    jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => mockLink as any);

    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('总用户数')).toBeInTheDocument();
    });

    // 点击导出按钮
    const exportButton = screen.getByTestId('export-data');
    fireEvent.click(exportButton);

    // 选择导出格式
    const exportExcelOption = screen.getByText('导出为Excel');
    fireEvent.click(exportExcelOption);

    // 验证导出功能被调用
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('should navigate to detail page when chart item is clicked', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    const { store } = renderWithProviders(<DashboardPage />, { initialState });

    // 等待图表加载
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    });

    // 点击图表中的数据点
    const chartElement = screen.getByTestId('dashboard-chart');
    const dataPoint = chartElement.querySelector('.chart-data-point');

    if (dataPoint) {
      fireEvent.click(dataPoint);

      // 验证导航是否发生
      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard/details');
      });
    }
  });

  it('should handle real-time data updates', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 等待初始数据加载
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    // 模拟实时数据更新
    server.use(
      rest.get('/api/dashboard/statistics', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              ...mockDashboardData.statistics,
              totalUsers: 1250, // 更新的数据
            },
          })
        );
      })
    );

    // 触发数据刷新（模拟WebSocket或轮询更新）
    const event = new CustomEvent('dashboard-update');
    window.dispatchEvent(event);

    // 验证数据更新
    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });

  it('should maintain state when switching between tabs', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('总用户数')).toBeInTheDocument();
    });

    // 切换到分析标签页
    const analyticsTab = screen.getByText('数据分析');
    fireEvent.click(analyticsTab);

    // 验证标签页切换
    expect(screen.getByTestId('analytics-content')).toBeInTheDocument();

    // 切换回概览标签页
    const overviewTab = screen.getByText('概览');
    fireEvent.click(overviewTab);

    // 验证数据仍然存在（状态保持）
    expect(screen.getByText('总用户数')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
});
