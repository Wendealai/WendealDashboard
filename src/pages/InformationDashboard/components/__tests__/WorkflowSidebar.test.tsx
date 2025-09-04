import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import WorkflowSidebar from '../WorkflowSidebar';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getWorkflows: jest.fn(),
    getWorkflowById: jest.fn(),
    updateWorkflow: jest.fn(),
    getExecutionHistory: jest.fn(),
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

const mockInvoiceOCRService = invoiceOCRService as jest.Mocked<
  typeof invoiceOCRService
>;
const mockMessage = message as jest.Mocked<typeof message>;

/**
 * 模拟工作流数据
 */
const mockWorkflows = [
  {
    id: '1',
    name: 'Invoice Processing',
    description: 'Standard invoice OCR workflow',
    status: 'active' as const,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    settings: {
      outputFormat: 'json',
      confidence: 0.8,
      enableValidation: true,
    },
    statistics: {
      totalProcessed: 150,
      successRate: 0.95,
      averageProcessingTime: 2.5,
    },
  },
  {
    id: '2',
    name: 'Receipt Processing',
    description: 'Receipt OCR workflow',
    status: 'inactive' as const,
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T09:00:00Z',
    settings: {
      outputFormat: 'csv',
      confidence: 0.7,
      enableValidation: false,
    },
    statistics: {
      totalProcessed: 75,
      successRate: 0.88,
      averageProcessingTime: 1.8,
    },
  },
];

/**
 * 模拟执行历史数据
 */
const mockExecutionHistory = [
  {
    id: 'exec-1',
    workflowId: '1',
    status: 'completed' as const,
    startTime: '2024-01-15T14:00:00Z',
    endTime: '2024-01-15T14:02:30Z',
    duration: 150,
    filesProcessed: 5,
    successCount: 5,
    errorCount: 0,
  },
  {
    id: 'exec-2',
    workflowId: '1',
    status: 'failed' as const,
    startTime: '2024-01-15T13:00:00Z',
    endTime: '2024-01-15T13:01:00Z',
    duration: 60,
    filesProcessed: 3,
    successCount: 2,
    errorCount: 1,
    error: 'Processing timeout',
  },
];

describe('WorkflowSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.getWorkflows.mockResolvedValue({
      success: true,
      data: mockWorkflows,
      total: mockWorkflows.length,
    });
    mockInvoiceOCRService.getWorkflowById.mockResolvedValue({
      success: true,
      data: mockWorkflows[0],
    });
    mockInvoiceOCRService.getExecutionHistory.mockResolvedValue({
      success: true,
      data: mockExecutionHistory,
      total: mockExecutionHistory.length,
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', async () => {
    renderWithProviders(<WorkflowSidebar />);

    expect(screen.getByText('工作流')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalled();
    });
  });

  /**
   * 测试工作流列表显示
   */
  it('displays workflow list', async () => {
    renderWithProviders(<WorkflowSidebar />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
      expect(screen.getByText('Receipt Processing')).toBeInTheDocument();
    });
  });

  /**
   * 测试工作流选择
   */
  it('selects workflow when clicked', async () => {
    const onWorkflowSelect = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <WorkflowSidebar onWorkflowSelect={onWorkflowSelect} />
    );

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    const workflowItem = screen.getByText('Invoice Processing');
    await user.click(workflowItem);

    expect(onWorkflowSelect).toHaveBeenCalledWith(mockWorkflows[0]);
  });

  /**
   * 测试选中状态显示
   */
  it('shows selected workflow state', async () => {
    renderWithProviders(<WorkflowSidebar selectedWorkflowId='1' />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    const selectedItem = screen
      .getByText('Invoice Processing')
      .closest('.ant-menu-item');
    expect(selectedItem).toHaveClass('ant-menu-item-selected');
  });

  /**
   * 测试工作流状态指示器
   */
  it('displays workflow status indicators', async () => {
    renderWithProviders(<WorkflowSidebar />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 检查状态指示器
    const activeIndicator = screen.getByTestId('status-active');
    const inactiveIndicator = screen.getByTestId('status-inactive');

    expect(activeIndicator).toBeInTheDocument();
    expect(inactiveIndicator).toBeInTheDocument();
  });

  /**
   * 测试工作流统计信息显示
   */
  it('displays workflow statistics', async () => {
    renderWithProviders(<WorkflowSidebar showStatistics />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 检查统计信息
    expect(screen.getByText('150')).toBeInTheDocument(); // totalProcessed
    expect(screen.getByText('95%')).toBeInTheDocument(); // successRate
  });

  /**
   * 测试搜索功能
   */
  it('searches workflows', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowSidebar searchable />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索工作流');
    await user.type(searchInput, 'Invoice');

    // 等待搜索防抖
    await waitFor(
      () => {
        expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Invoice',
          })
        );
      },
      { timeout: 1000 }
    );
  });

  /**
   * 测试工作流详情展开
   */
  it('expands workflow details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowSidebar expandable />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击展开按钮
    const expandButton = screen.getAllByRole('button', { name: /展开/ })[0];
    await user.click(expandButton);

    // 检查详情是否显示
    await waitFor(() => {
      expect(
        screen.getByText('Standard invoice OCR workflow')
      ).toBeInTheDocument();
    });
  });

  /**
   * 测试执行历史显示
   */
  it('displays execution history', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkflowSidebar selectedWorkflowId='1' showExecutionHistory />
    );

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击历史记录标签
    const historyTab = screen.getByText('执行历史');
    await user.click(historyTab);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getExecutionHistory).toHaveBeenCalledWith(
        '1'
      );
    });

    // 检查历史记录显示
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
  });

  /**
   * 测试快速操作按钮
   */
  it('shows quick action buttons', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkflowSidebar selectedWorkflowId='1' showQuickActions />
    );

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 检查快速操作按钮
    expect(screen.getByRole('button', { name: /执行/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /设置/ })).toBeInTheDocument();
  });

  /**
   * 测试工作流状态切换
   */
  it('toggles workflow status', async () => {
    const user = userEvent.setup();
    const updatedWorkflow = {
      ...mockWorkflows[1],
      status: 'active' as const,
    };

    mockInvoiceOCRService.updateWorkflow.mockResolvedValue({
      success: true,
      data: updatedWorkflow,
    });

    renderWithProviders(
      <WorkflowSidebar selectedWorkflowId='2' allowStatusToggle />
    );

    await waitFor(() => {
      expect(screen.getByText('Receipt Processing')).toBeInTheDocument();
    });

    // 点击状态开关
    const statusSwitch = screen.getByRole('switch');
    await user.click(statusSwitch);

    await waitFor(() => {
      expect(mockInvoiceOCRService.updateWorkflow).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('工作流状态已更新');
  });

  /**
   * 测试折叠/展开侧边栏
   */
  it('collapses and expands sidebar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowSidebar collapsible />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击折叠按钮
    const collapseButton = screen.getByRole('button', { name: /折叠/ });
    await user.click(collapseButton);

    // 检查侧边栏是否折叠
    const sidebar = screen.getByTestId('workflow-sidebar');
    expect(sidebar).toHaveClass('collapsed');

    // 再次点击展开
    await user.click(collapseButton);
    expect(sidebar).not.toHaveClass('collapsed');
  });

  /**
   * 测试空状态
   */
  it('displays empty state when no workflows', async () => {
    mockInvoiceOCRService.getWorkflows.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    renderWithProviders(<WorkflowSidebar />);

    await waitFor(() => {
      expect(screen.getByText('暂无工作流')).toBeInTheDocument();
    });
  });

  /**
   * 测试加载状态
   */
  it('shows loading state', () => {
    mockInvoiceOCRService.getWorkflows.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<WorkflowSidebar />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  /**
   * 测试错误状态
   */
  it('handles loading error', async () => {
    mockInvoiceOCRService.getWorkflows.mockRejectedValue(new Error('加载失败'));

    renderWithProviders(<WorkflowSidebar />);

    await waitFor(() => {
      expect(screen.getByText('加载工作流失败')).toBeInTheDocument();
    });
  });

  /**
   * 测试刷新功能
   */
  it('refreshes workflow list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowSidebar refreshable />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /刷新/ });
    await user.click(refreshButton);

    expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试工作流分组
   */
  it('groups workflows by status', async () => {
    renderWithProviders(<WorkflowSidebar groupByStatus />);

    await waitFor(() => {
      expect(screen.getByText('活跃工作流')).toBeInTheDocument();
      expect(screen.getByText('非活跃工作流')).toBeInTheDocument();
    });
  });

  /**
   * 测试拖拽排序
   */
  it('supports drag and drop reordering', async () => {
    const onReorder = jest.fn();
    renderWithProviders(<WorkflowSidebar draggable onReorder={onReorder} />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 模拟拖拽操作
    const firstItem = screen
      .getByText('Invoice Processing')
      .closest('.draggable-item');
    const secondItem = screen
      .getByText('Receipt Processing')
      .closest('.draggable-item');

    fireEvent.dragStart(firstItem!);
    fireEvent.dragOver(secondItem!);
    fireEvent.drop(secondItem!);

    expect(onReorder).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: '2' }),
        expect.objectContaining({ id: '1' }),
      ])
    );
  });

  /**
   * 测试右键菜单
   */
  it('shows context menu on right click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowSidebar showContextMenu />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 右键点击工作流项
    const workflowItem = screen.getByText('Invoice Processing');
    fireEvent.contextMenu(workflowItem);

    // 检查上下文菜单
    await waitFor(() => {
      expect(screen.getByText('编辑')).toBeInTheDocument();
      expect(screen.getByText('复制')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();
    });
  });

  /**
   * 测试键盘导航
   */
  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowSidebar />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    const firstItem = screen.getByText('Invoice Processing');
    firstItem.focus();

    // 使用方向键导航
    await user.keyboard('{ArrowDown}');

    const secondItem = screen.getByText('Receipt Processing');
    expect(secondItem).toHaveFocus();

    // 使用回车键选择
    await user.keyboard('{Enter}');

    expect(secondItem.closest('.ant-menu-item')).toHaveClass(
      'ant-menu-item-selected'
    );
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <WorkflowSidebar className='custom-sidebar' />
    );

    expect(container.querySelector('.custom-sidebar')).toBeInTheDocument();
  });

  /**
   * 测试自定义宽度
   */
  it('applies custom width', () => {
    const { container } = renderWithProviders(<WorkflowSidebar width={300} />);

    const sidebar = container.querySelector('.workflow-sidebar');
    expect(sidebar).toHaveStyle('width: 300px');
  });

  /**
   * 测试工作流创建按钮
   */
  it('shows create workflow button', async () => {
    const onCreate = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <WorkflowSidebar showCreateButton onCreate={onCreate} />
    );

    await waitFor(() => {
      expect(screen.getByText('创建工作流')).toBeInTheDocument();
    });

    const createButton = screen.getByText('创建工作流');
    await user.click(createButton);

    expect(onCreate).toHaveBeenCalled();
  });
});
