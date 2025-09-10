import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import InformationGrid from '../InformationGrid';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getDashboardStats: jest.fn(),
    getRecentActivity: jest.fn(),
    getSystemHealth: jest.fn(),
    getUsageMetrics: jest.fn(),
    getWorkflowStats: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid='line-chart' data-chart-data={JSON.stringify(data)} />
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid='bar-chart' data-chart-data={JSON.stringify(data)} />
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid='doughnut-chart' data-chart-data={JSON.stringify(data)} />
  ),
}));

const mockInvoiceOCRService = invoiceOCRService as jest.Mocked<
  typeof invoiceOCRService
>;
const mockMessage = message as jest.Mocked<typeof message>;

/**
 * 模拟仪表板统计数据
 */
const mockDashboardStats = {
  totalDocuments: 1250,
  processedToday: 45,
  successRate: 0.95,
  averageProcessingTime: 2.3,
  activeWorkflows: 8,
  queuedDocuments: 12,
  errorRate: 0.05,
  systemUptime: 0.999,
};

/**
 * 模拟最近活动数据
 */
const mockRecentActivity = [
  {
    id: 'activity-1',
    type: 'document_processed',
    message: 'Invoice INV-2024-001 processed successfully',
    timestamp: '2024-01-15T14:30:00Z',
    status: 'success',
    details: {
      documentId: 'doc-1',
      fileName: 'invoice_001.pdf',
      processingTime: 2.1,
    },
  },
  {
    id: 'activity-2',
    type: 'workflow_started',
    message: 'Workflow "Invoice Processing" started',
    timestamp: '2024-01-15T14:25:00Z',
    status: 'info',
    details: {
      workflowId: 'workflow-1',
      workflowName: 'Invoice Processing',
    },
  },
  {
    id: 'activity-3',
    type: 'error_occurred',
    message: 'Failed to process receipt_002.jpg',
    timestamp: '2024-01-15T14:20:00Z',
    status: 'error',
    details: {
      documentId: 'doc-2',
      fileName: 'receipt_002.jpg',
      error: 'Low image quality',
    },
  },
];

/**
 * 模拟系统健康数据
 */
const mockSystemHealth = {
  cpu: 0.65,
  memory: 0.72,
  disk: 0.45,
  network: 0.88,
  services: {
    ocrEngine: 'healthy',
    database: 'healthy',
    fileStorage: 'warning',
    apiGateway: 'healthy',
  },
  lastCheck: '2024-01-15T14:35:00Z',
};

/**
 * 模拟使用指标数据
 */
const mockUsageMetrics = {
  dailyProcessing: [
    { date: '2024-01-09', count: 42 },
    { date: '2024-01-10', count: 38 },
    { date: '2024-01-11', count: 55 },
    { date: '2024-01-12', count: 47 },
    { date: '2024-01-13', count: 51 },
    { date: '2024-01-14', count: 43 },
    { date: '2024-01-15', count: 45 },
  ],
  hourlyDistribution: [
    { hour: 0, count: 2 },
    { hour: 1, count: 1 },
    { hour: 8, count: 15 },
    { hour: 9, count: 22 },
    { hour: 10, count: 18 },
    { hour: 14, count: 25 },
    { hour: 15, count: 20 },
  ],
  documentTypes: [
    { type: 'invoice', count: 850, percentage: 0.68 },
    { type: 'receipt', count: 300, percentage: 0.24 },
    { type: 'contract', count: 100, percentage: 0.08 },
  ],
};

/**
 * 模拟工作流统计数据
 */
const mockWorkflowStats = [
  {
    id: 'workflow-1',
    name: 'Invoice Processing',
    totalRuns: 450,
    successRate: 0.96,
    averageTime: 2.1,
    lastRun: '2024-01-15T14:30:00Z',
    status: 'active',
  },
  {
    id: 'workflow-2',
    name: 'Receipt Processing',
    totalRuns: 280,
    successRate: 0.92,
    averageTime: 1.8,
    lastRun: '2024-01-15T13:45:00Z',
    status: 'active',
  },
  {
    id: 'workflow-3',
    name: 'Contract Analysis',
    totalRuns: 75,
    successRate: 0.89,
    averageTime: 4.2,
    lastRun: '2024-01-15T12:20:00Z',
    status: 'inactive',
  },
];

describe('InformationGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.getDashboardStats.mockResolvedValue({
      success: true,
      data: mockDashboardStats,
    });
    mockInvoiceOCRService.getRecentActivity.mockResolvedValue({
      success: true,
      data: mockRecentActivity,
    });
    mockInvoiceOCRService.getSystemHealth.mockResolvedValue({
      success: true,
      data: mockSystemHealth,
    });
    mockInvoiceOCRService.getUsageMetrics.mockResolvedValue({
      success: true,
      data: mockUsageMetrics,
    });
    mockInvoiceOCRService.getWorkflowStats.mockResolvedValue({
      success: true,
      data: mockWorkflowStats,
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', async () => {
    renderWithProviders(<InformationGrid />);

    expect(screen.getByText('信息概览')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoiceOCRService.getDashboardStats).toHaveBeenCalled();
    });
  });

  /**
   * 测试统计卡片显示
   */
  it('displays statistics cards', async () => {
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('总文档数')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('今日处理')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('成功率')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('平均处理时间')).toBeInTheDocument();
      expect(screen.getByText('2.3s')).toBeInTheDocument();
    });
  });

  /**
   * 测试最近活动列表
   */
  it('displays recent activity list', async () => {
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('最近活动')).toBeInTheDocument();
      expect(
        screen.getByText('Invoice INV-2024-001 processed successfully')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Workflow "Invoice Processing" started')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Failed to process receipt_002.jpg')
      ).toBeInTheDocument();
    });
  });

  /**
   * 测试系统健康状态
   */
  it('displays system health status', async () => {
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('系统健康')).toBeInTheDocument();
      expect(screen.getByText('CPU: 65%')).toBeInTheDocument();
      expect(screen.getByText('内存: 72%')).toBeInTheDocument();
      expect(screen.getByText('磁盘: 45%')).toBeInTheDocument();
      expect(screen.getByText('网络: 88%')).toBeInTheDocument();
    });
  });

  /**
   * 测试使用指标图表
   */
  it('displays usage metrics charts', async () => {
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('使用指标')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });
  });

  /**
   * 测试工作流统计
   */
  it('displays workflow statistics', async () => {
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('工作流统计')).toBeInTheDocument();
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
      expect(screen.getByText('Receipt Processing')).toBeInTheDocument();
      expect(screen.getByText('Contract Analysis')).toBeInTheDocument();
    });
  });

  /**
   * 测试刷新功能
   */
  it('refreshes data when refresh button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('信息概览')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /刷新/ });
    await user.click(refreshButton);

    expect(mockInvoiceOCRService.getDashboardStats).toHaveBeenCalledTimes(2);
    expect(mockInvoiceOCRService.getRecentActivity).toHaveBeenCalledTimes(2);
    expect(mockInvoiceOCRService.getSystemHealth).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试自动刷新
   */
  it('auto-refreshes data at intervals', async () => {
    jest.useFakeTimers();

    renderWithProviders(
      <InformationGrid autoRefresh refreshInterval={30000} />
    );

    await waitFor(() => {
      expect(mockInvoiceOCRService.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    // 快进30秒
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getDashboardStats).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  /**
   * 测试网格布局切换
   */
  it('switches between grid layouts', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('信息概览')).toBeInTheDocument();
    });

    // 切换到紧凑布局
    const layoutButton = screen.getByRole('button', { name: /布局/ });
    await user.click(layoutButton);

    const compactOption = screen.getByText('紧凑布局');
    await user.click(compactOption);

    const grid = screen.getByTestId('information-grid');
    expect(grid).toHaveClass('compact-layout');
  });

  /**
   * 测试卡片展开/折叠
   */
  it('expands and collapses cards', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('最近活动')).toBeInTheDocument();
    });

    // 折叠活动卡片
    const collapseButton = screen.getAllByRole('button', { name: /折叠/ })[0];
    await user.click(collapseButton);

    const activityCard = screen.getByTestId('activity-card');
    expect(activityCard).toHaveClass('collapsed');

    // 展开活动卡片
    const expandButton = screen.getByRole('button', { name: /展开/ });
    await user.click(expandButton);

    expect(activityCard).not.toHaveClass('collapsed');
  });

  /**
   * 测试时间范围选择
   */
  it('changes time range for metrics', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('使用指标')).toBeInTheDocument();
    });

    // 选择时间范围
    const timeRangeSelect = screen.getByRole('combobox', { name: /时间范围/ });
    await user.click(timeRangeSelect);

    const weekOption = screen.getByText('最近一周');
    await user.click(weekOption);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getUsageMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: 'week',
        })
      );
    });
  });

  /**
   * 测试活动详情查看
   */
  it('shows activity details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(
        screen.getByText('Invoice INV-2024-001 processed successfully')
      ).toBeInTheDocument();
    });

    // 点击活动项
    const activityItem = screen.getByText(
      'Invoice INV-2024-001 processed successfully'
    );
    await user.click(activityItem);

    // 检查详情模态框
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('活动详情')).toBeInTheDocument();
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });
  });

  /**
   * 测试系统健康警告
   */
  it('shows system health warnings', async () => {
    const warningSystemHealth = {
      ...mockSystemHealth,
      cpu: 0.95, // 高CPU使用率
      services: {
        ...mockSystemHealth.services,
        fileStorage: 'error', // 文件存储错误
      },
    };

    mockInvoiceOCRService.getSystemHealth.mockResolvedValue({
      success: true,
      data: warningSystemHealth,
    });

    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('CPU: 95%')).toBeInTheDocument();
      expect(screen.getByTestId('cpu-warning')).toBeInTheDocument();
      expect(screen.getByTestId('service-error')).toBeInTheDocument();
    });
  });

  /**
   * 测试工作流快速操作
   */
  it('performs quick workflow actions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击工作流的快速操作按钮
    const quickActionButton = screen.getAllByRole('button', {
      name: /操作/,
    })[0];
    await user.click(quickActionButton);

    // 检查操作菜单
    await waitFor(() => {
      expect(screen.getByText('执行')).toBeInTheDocument();
      expect(screen.getByText('编辑')).toBeInTheDocument();
      expect(screen.getByText('查看详情')).toBeInTheDocument();
    });
  });

  /**
   * 测试导出功能
   */
  it('exports dashboard data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('信息概览')).toBeInTheDocument();
    });

    // 点击导出按钮
    const exportButton = screen.getByRole('button', { name: /导出/ });
    await user.click(exportButton);

    // 选择导出格式
    const pdfOption = screen.getByText('PDF报告');
    await user.click(pdfOption);

    expect(mockMessage.success).toHaveBeenCalledWith('导出成功');
  });

  /**
   * 测试全屏模式
   */
  it('enters fullscreen mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('信息概览')).toBeInTheDocument();
    });

    // 点击全屏按钮
    const fullscreenButton = screen.getByRole('button', { name: /全屏/ });
    await user.click(fullscreenButton);

    const grid = screen.getByTestId('information-grid');
    expect(grid).toHaveClass('fullscreen');
  });

  /**
   * 测试加载状态
   */
  it('shows loading state', () => {
    mockInvoiceOCRService.getDashboardStats.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<InformationGrid />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  /**
   * 测试错误状态
   */
  it('handles loading error', async () => {
    mockInvoiceOCRService.getDashboardStats.mockRejectedValue(
      new Error('加载失败')
    );

    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('加载数据失败')).toBeInTheDocument();
    });
  });

  /**
   * 测试空数据状态
   */
  it('displays empty state when no data', async () => {
    mockInvoiceOCRService.getDashboardStats.mockResolvedValue({
      success: true,
      data: {
        ...mockDashboardStats,
        totalDocuments: 0,
        processedToday: 0,
      },
    });

    mockInvoiceOCRService.getRecentActivity.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
      expect(screen.getByText('暂无最近活动')).toBeInTheDocument();
    });
  });

  /**
   * 测试响应式布局
   */
  it('adapts to different screen sizes', () => {
    // 模拟移动设备屏幕
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { container } = renderWithProviders(<InformationGrid />);

    const grid = container.querySelector('.information-grid');
    expect(grid).toHaveClass('mobile-layout');
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <InformationGrid className='custom-grid' />
    );

    expect(container.querySelector('.custom-grid')).toBeInTheDocument();
  });

  /**
   * 测试卡片拖拽重排
   */
  it('supports card drag and drop reordering', async () => {
    const onLayoutChange = jest.fn();
    renderWithProviders(
      <InformationGrid draggable onLayoutChange={onLayoutChange} />
    );

    await waitFor(() => {
      expect(screen.getByText('信息概览')).toBeInTheDocument();
    });

    // 模拟拖拽操作
    const statsCard = screen.getByTestId('stats-card');
    const activityCard = screen.getByTestId('activity-card');

    fireEvent.dragStart(statsCard);
    fireEvent.dragOver(activityCard);
    fireEvent.drop(activityCard);

    expect(onLayoutChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'activity' }),
        expect.objectContaining({ id: 'stats' }),
      ])
    );
  });

  /**
   * 测试主题切换
   */
  it('switches between themes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InformationGrid />);

    await waitFor(() => {
      expect(screen.getByText('信息概览')).toBeInTheDocument();
    });

    // 切换到暗色主题
    const themeButton = screen.getByRole('button', { name: /主题/ });
    await user.click(themeButton);

    const darkOption = screen.getByText('暗色主题');
    await user.click(darkOption);

    const grid = screen.getByTestId('information-grid');
    expect(grid).toHaveClass('dark-theme');
  });
});
