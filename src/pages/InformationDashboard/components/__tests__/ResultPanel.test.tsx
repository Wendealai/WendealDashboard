import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import ResultPanel from '../ResultPanel';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getOCRResults: jest.fn(),
    getResultById: jest.fn(),
    downloadResult: jest.fn(),
    deleteResult: jest.fn(),
    retryProcessing: jest.fn(),
    exportResults: jest.fn(),
    validateResult: jest.fn(),
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
 * 模拟OCR结果数据
 */
const mockOCRResults = [
  {
    id: 'result-1',
    fileName: 'invoice_001.pdf',
    status: 'completed' as const,
    confidence: 0.95,
    processedAt: '2024-01-15T10:30:00Z',
    processingTime: 2.5,
    extractedData: {
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
      vendor: 'ABC Company',
      amount: 1250.0,
      currency: 'USD',
      items: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: 500.0,
          total: 1000.0,
        },
        {
          description: 'Product B',
          quantity: 1,
          unitPrice: 250.0,
          total: 250.0,
        },
      ],
    },
    validationResults: {
      isValid: true,
      errors: [],
      warnings: ['Date format could be improved'],
    },
  },
  {
    id: 'result-2',
    fileName: 'receipt_002.jpg',
    status: 'failed' as const,
    confidence: 0.45,
    processedAt: '2024-01-15T10:25:00Z',
    processingTime: 1.8,
    error: 'Low image quality',
    extractedData: null,
    validationResults: {
      isValid: false,
      errors: ['Unable to extract invoice number', 'Date not found'],
      warnings: [],
    },
  },
  {
    id: 'result-3',
    fileName: 'invoice_003.pdf',
    status: 'processing' as const,
    confidence: null,
    processedAt: null,
    processingTime: null,
    extractedData: null,
    validationResults: null,
  },
];

describe('ResultPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.getOCRResults.mockResolvedValue({
      success: true,
      data: mockOCRResults,
      total: mockOCRResults.length,
    });
    mockInvoiceOCRService.getResultById.mockResolvedValue({
      success: true,
      data: mockOCRResults[0],
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', async () => {
    renderWithProviders(<ResultPanel />);

    expect(screen.getByText('OCR结果')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoiceOCRService.getOCRResults).toHaveBeenCalled();
    });
  });

  /**
   * 测试结果列表显示
   */
  it('displays OCR results list', async () => {
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
      expect(screen.getByText('receipt_002.jpg')).toBeInTheDocument();
      expect(screen.getByText('invoice_003.pdf')).toBeInTheDocument();
    });
  });

  /**
   * 测试结果状态显示
   */
  it('displays result status correctly', async () => {
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('失败')).toBeInTheDocument();
      expect(screen.getByText('处理中')).toBeInTheDocument();
    });
  });

  /**
   * 测试置信度显示
   */
  it('displays confidence scores', async () => {
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  /**
   * 测试结果详情展开
   */
  it('expands result details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击展开按钮
    const expandButton = screen.getAllByRole('button', { name: /展开/ })[0];
    await user.click(expandButton);

    // 检查详情是否显示
    await waitFor(() => {
      expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
      expect(screen.getByText('ABC Company')).toBeInTheDocument();
      expect(screen.getByText('$1,250.00')).toBeInTheDocument();
    });
  });

  /**
   * 测试下载功能
   */
  it('downloads result successfully', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.downloadResult.mockResolvedValue({
      success: true,
      data: new Blob(['test data'], { type: 'application/json' }),
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击下载按钮
    const downloadButton = screen.getAllByRole('button', { name: /下载/ })[0];
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.downloadResult).toHaveBeenCalledWith(
        'result-1'
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('下载成功');
  });

  /**
   * 测试下载失败
   */
  it('handles download failure', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.downloadResult.mockRejectedValue(
      new Error('下载失败')
    );

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    const downloadButton = screen.getAllByRole('button', { name: /下载/ })[0];
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('下载失败');
    });
  });

  /**
   * 测试删除功能
   */
  it('deletes result', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.deleteResult.mockResolvedValue({
      success: true,
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击删除按钮
    const deleteButton = screen.getAllByRole('button', { name: /删除/ })[0];
    await user.click(deleteButton);

    // 确认删除
    const confirmButton = screen.getByRole('button', { name: /确定/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.deleteResult).toHaveBeenCalledWith(
        'result-1'
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('删除成功');
  });

  /**
   * 测试重试处理
   */
  it('retries failed processing', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.retryProcessing.mockResolvedValue({
      success: true,
      data: { ...mockOCRResults[1], status: 'processing' as const },
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('receipt_002.jpg')).toBeInTheDocument();
    });

    // 点击重试按钮
    const retryButton = screen.getByRole('button', { name: /重试/ });
    await user.click(retryButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.retryProcessing).toHaveBeenCalledWith(
        'result-2'
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('重新处理已开始');
  });

  /**
   * 测试状态过滤
   */
  it('filters results by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 选择状态过滤器
    const statusFilter = screen.getByRole('combobox', { name: /状态/ });
    await user.click(statusFilter);

    const completedOption = screen.getByText('已完成');
    await user.click(completedOption);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getOCRResults).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  /**
   * 测试搜索功能
   */
  it('searches results by filename', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索文件名');
    await user.type(searchInput, 'invoice');

    // 等待搜索防抖
    await waitFor(
      () => {
        expect(mockInvoiceOCRService.getOCRResults).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'invoice',
          })
        );
      },
      { timeout: 1000 }
    );
  });

  /**
   * 测试分页功能
   */
  it('handles pagination', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.getOCRResults.mockResolvedValue({
      success: true,
      data: mockOCRResults,
      total: 50,
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击下一页
    const nextPageButton = screen.getByRole('button', { name: /下一页/ });
    await user.click(nextPageButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getOCRResults).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  /**
   * 测试批量导出
   */
  it('exports selected results', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.exportResults.mockResolvedValue({
      success: true,
      data: new Blob(['exported data'], { type: 'application/zip' }),
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 选择结果
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // 第一个是全选框
    await user.click(checkboxes[2]);

    // 点击导出按钮
    const exportButton = screen.getByRole('button', { name: /导出/ });
    await user.click(exportButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.exportResults).toHaveBeenCalledWith([
        'result-1',
        'result-2',
      ]);
    });

    expect(mockMessage.success).toHaveBeenCalledWith('导出成功');
  });

  /**
   * 测试全选功能
   */
  it('selects all results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击全选框
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(selectAllCheckbox);

    // 检查所有项目是否被选中
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.slice(1).forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  /**
   * 测试结果验证
   */
  it('validates result data', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.validateResult.mockResolvedValue({
      success: true,
      data: {
        isValid: true,
        errors: [],
        warnings: ['Minor formatting issue'],
      },
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击验证按钮
    const validateButton = screen.getAllByRole('button', { name: /验证/ })[0];
    await user.click(validateButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.validateResult).toHaveBeenCalledWith(
        'result-1'
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('验证完成');
  });

  /**
   * 测试排序功能
   */
  it('sorts results by different criteria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击排序下拉菜单
    const sortSelect = screen.getByRole('combobox', { name: /排序/ });
    await user.click(sortSelect);

    const dateOption = screen.getByText('处理时间');
    await user.click(dateOption);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getOCRResults).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'processedAt',
          sortOrder: 'desc',
        })
      );
    });
  });

  /**
   * 测试刷新功能
   */
  it('refreshes results list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /刷新/ });
    await user.click(refreshButton);

    expect(mockInvoiceOCRService.getOCRResults).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试空状态
   */
  it('displays empty state when no results', async () => {
    mockInvoiceOCRService.getOCRResults.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('暂无OCR结果')).toBeInTheDocument();
    });
  });

  /**
   * 测试加载状态
   */
  it('shows loading state', () => {
    mockInvoiceOCRService.getOCRResults.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<ResultPanel />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  /**
   * 测试错误状态
   */
  it('handles loading error', async () => {
    mockInvoiceOCRService.getOCRResults.mockRejectedValue(
      new Error('加载失败')
    );

    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('加载OCR结果失败')).toBeInTheDocument();
    });
  });

  /**
   * 测试结果预览
   */
  it('previews result data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 点击预览按钮
    const previewButton = screen.getAllByRole('button', { name: /预览/ })[0];
    await user.click(previewButton);

    // 检查预览模态框
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('数据预览')).toBeInTheDocument();
    });
  });

  /**
   * 测试结果比较
   */
  it('compares multiple results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResultPanel />);

    await waitFor(() => {
      expect(screen.getByText('invoice_001.pdf')).toBeInTheDocument();
    });

    // 选择多个结果
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    // 点击比较按钮
    const compareButton = screen.getByRole('button', { name: /比较/ });
    await user.click(compareButton);

    // 检查比较视图
    await waitFor(() => {
      expect(screen.getByText('结果比较')).toBeInTheDocument();
    });
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <ResultPanel className='custom-result-panel' />
    );

    expect(container.querySelector('.custom-result-panel')).toBeInTheDocument();
  });

  /**
   * 测试自定义高度
   */
  it('applies custom height', () => {
    const { container } = renderWithProviders(<ResultPanel height={600} />);

    const panel = container.querySelector('.result-panel');
    expect(panel).toHaveStyle('height: 600px');
  });

  /**
   * 测试响应式布局
   */
  it('adapts to different screen sizes', () => {
    // 模拟小屏幕
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { container } = renderWithProviders(<ResultPanel />);

    const panel = container.querySelector('.result-panel');
    expect(panel).toHaveClass('mobile-layout');
  });
});
