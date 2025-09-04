import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import WorkflowPanel from '../WorkflowPanel';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getWorkflows: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteWorkflow: jest.fn(),
    duplicateWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
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

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
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

describe('WorkflowPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.getWorkflows.mockResolvedValue({
      success: true,
      data: mockWorkflows,
      total: mockWorkflows.length,
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', async () => {
    renderWithProviders(<WorkflowPanel />);

    expect(screen.getByText('工作流管理')).toBeInTheDocument();
    expect(screen.getByText('创建工作流')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalled();
    });
  });

  /**
   * 测试工作流列表加载
   */
  it('loads and displays workflow list', async () => {
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
      expect(screen.getByText('Receipt Processing')).toBeInTheDocument();
    });

    // 检查状态显示
    expect(screen.getByText('活跃')).toBeInTheDocument();
    expect(screen.getByText('非活跃')).toBeInTheDocument();
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

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('暂无工作流')).toBeInTheDocument();
      expect(screen.getByText('创建您的第一个工作流')).toBeInTheDocument();
    });
  });

  /**
   * 测试加载状态
   */
  it('shows loading state', () => {
    mockInvoiceOCRService.getWorkflows.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<WorkflowPanel />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  /**
   * 测试错误状态
   */
  it('handles loading error', async () => {
    mockInvoiceOCRService.getWorkflows.mockRejectedValue(new Error('加载失败'));

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('加载工作流失败')).toBeInTheDocument();
    });
  });

  /**
   * 测试创建工作流
   */
  it('creates new workflow', async () => {
    const user = userEvent.setup();
    const newWorkflow = {
      id: '3',
      name: 'New Workflow',
      description: 'Test workflow',
      status: 'active' as const,
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
      settings: {
        outputFormat: 'json',
        confidence: 0.8,
        enableValidation: true,
      },
      statistics: {
        totalProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
      },
    };

    mockInvoiceOCRService.createWorkflow.mockResolvedValue({
      success: true,
      data: newWorkflow,
    });

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击创建按钮
    const createButton = screen.getByText('创建工作流');
    await user.click(createButton);

    // 填写表单
    const nameInput = screen.getByLabelText('工作流名称');
    await user.type(nameInput, 'New Workflow');

    const descriptionInput = screen.getByLabelText('描述');
    await user.type(descriptionInput, 'Test workflow');

    // 提交表单
    const submitButton = screen.getByText('创建');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Workflow',
          description: 'Test workflow',
        })
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('工作流创建成功');
  });

  /**
   * 测试编辑工作流
   */
  it('edits existing workflow', async () => {
    const user = userEvent.setup();
    const updatedWorkflow = {
      ...mockWorkflows[0],
      name: 'Updated Invoice Processing',
      description: 'Updated description',
    };

    mockInvoiceOCRService.updateWorkflow.mockResolvedValue({
      success: true,
      data: updatedWorkflow,
    });

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击编辑按钮
    const editButtons = screen.getAllByRole('button', { name: /编辑/ });
    await user.click(editButtons[0]);

    // 修改表单
    const nameInput = screen.getByDisplayValue('Invoice Processing');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Invoice Processing');

    // 提交表单
    const submitButton = screen.getByText('保存');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.updateWorkflow).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Updated Invoice Processing',
        })
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('工作流更新成功');
  });

  /**
   * 测试删除工作流
   */
  it('deletes workflow', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.deleteWorkflow.mockResolvedValue({
      success: true,
    });

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击删除按钮
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    await user.click(deleteButtons[0]);

    // 确认删除
    const confirmButton = screen.getByText('确定');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.deleteWorkflow).toHaveBeenCalledWith('1');
    });

    expect(mockMessage.success).toHaveBeenCalledWith('工作流删除成功');
  });

  /**
   * 测试复制工作流
   */
  it('duplicates workflow', async () => {
    const user = userEvent.setup();
    const duplicatedWorkflow = {
      ...mockWorkflows[0],
      id: '3',
      name: 'Invoice Processing (副本)',
    };

    mockInvoiceOCRService.duplicateWorkflow.mockResolvedValue({
      success: true,
      data: duplicatedWorkflow,
    });

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击复制按钮
    const duplicateButtons = screen.getAllByRole('button', { name: /复制/ });
    await user.click(duplicateButtons[0]);

    await waitFor(() => {
      expect(mockInvoiceOCRService.duplicateWorkflow).toHaveBeenCalledWith('1');
    });

    expect(mockMessage.success).toHaveBeenCalledWith('工作流复制成功');
  });

  /**
   * 测试执行工作流
   */
  it('executes workflow', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.executeWorkflow.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        status: 'running',
      },
    });

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击执行按钮
    const executeButtons = screen.getAllByRole('button', { name: /执行/ });
    await user.click(executeButtons[0]);

    await waitFor(() => {
      expect(mockInvoiceOCRService.executeWorkflow).toHaveBeenCalledWith('1');
    });

    expect(mockMessage.success).toHaveBeenCalledWith('工作流执行已开始');
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

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Receipt Processing')).toBeInTheDocument();
    });

    // 点击状态开关
    const statusSwitches = screen.getAllByRole('switch');
    await user.click(statusSwitches[1]); // 第二个工作流的开关

    await waitFor(() => {
      expect(mockInvoiceOCRService.updateWorkflow).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          status: 'active',
        })
      );
    });
  });

  /**
   * 测试搜索功能
   */
  it('searches workflows by name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowPanel />);

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
   * 测试状态过滤
   */
  it('filters workflows by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击状态过滤器
    const statusFilter = screen.getByText('全部状态');
    await user.click(statusFilter);

    // 选择"活跃"状态
    await waitFor(() => {
      expect(screen.getByText('活跃')).toBeInTheDocument();
    });

    const activeOption = screen.getAllByText('活跃')[1]; // 第二个是下拉选项
    await user.click(activeOption);

    // 验证过滤效果
    expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
      })
    );
  });

  /**
   * 测试排序功能
   */
  it('sorts workflows', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击排序选择器
    const sortSelect = screen.getByText('创建时间');
    await user.click(sortSelect);

    // 选择按名称排序
    await waitFor(() => {
      expect(screen.getByText('名称')).toBeInTheDocument();
    });

    const nameOption = screen.getByText('名称');
    await user.click(nameOption);

    // 验证排序效果
    expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'name',
      })
    );
  });

  /**
   * 测试分页
   */
  it('handles pagination', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.getWorkflows.mockResolvedValue({
      success: true,
      data: mockWorkflows,
      total: 50, // 模拟更多数据
    });

    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击下一页
    const nextPageButton = screen.getByTitle('下一页');
    await user.click(nextPageButton);

    expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      })
    );
  });

  /**
   * 测试统计信息显示
   */
  it('displays workflow statistics', async () => {
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // totalProcessed
      expect(screen.getByText('95%')).toBeInTheDocument(); // successRate
      expect(screen.getByText('2.5s')).toBeInTheDocument(); // averageProcessingTime
    });
  });

  /**
   * 测试工作流详情查看
   */
  it('shows workflow details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 点击工作流卡片
    const workflowCard = screen
      .getByText('Invoice Processing')
      .closest('.ant-card');
    await user.click(workflowCard!);

    // 检查详情是否显示
    await waitFor(() => {
      expect(screen.getByText('工作流详情')).toBeInTheDocument();
      expect(
        screen.getByText('Standard invoice OCR workflow')
      ).toBeInTheDocument();
    });
  });

  /**
   * 测试批量操作
   */
  it('handles batch operations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    // 选择多个工作流
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // 第一个工作流
    await user.click(checkboxes[1]); // 第二个工作流

    // 批量删除
    const batchDeleteButton = screen.getByText('批量删除');
    await user.click(batchDeleteButton);

    // 确认删除
    const confirmButton = screen.getByText('确定');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.deleteWorkflow).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * 测试刷新功能
   */
  it('refreshes workflow list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowPanel />);

    await waitFor(() => {
      expect(screen.getByText('Invoice Processing')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /刷新/ });
    await user.click(refreshButton);

    expect(mockInvoiceOCRService.getWorkflows).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <WorkflowPanel className='custom-panel' />
    );

    expect(container.querySelector('.custom-panel')).toBeInTheDocument();
  });
});
