import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import InvoiceOCRResults from '../InvoiceOCRResults';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getResults: jest.fn(),
    downloadResult: jest.fn(),
    deleteResult: jest.fn(),
    retryProcessing: jest.fn(),
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

// Mock file download
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

const mockInvoiceOCRService = invoiceOCRService as jest.Mocked<
  typeof invoiceOCRService
>;
const mockMessage = message as jest.Mocked<typeof message>;

/**
 * 模拟OCR结果数据
 */
const mockResults = [
  {
    id: '1',
    fileName: 'invoice1.pdf',
    status: 'completed' as const,
    processedAt: '2024-01-15T10:30:00Z',
    extractedData: {
      invoiceNumber: 'INV-001',
      date: '2024-01-15',
      amount: 1500.0,
      vendor: 'Test Vendor',
      items: [{ description: 'Product A', quantity: 2, price: 750.0 }],
    },
    confidence: 0.95,
    processingTime: 2.5,
  },
  {
    id: '2',
    fileName: 'invoice2.pdf',
    status: 'processing' as const,
    processedAt: '2024-01-15T10:35:00Z',
    extractedData: null,
    confidence: null,
    processingTime: null,
  },
  {
    id: '3',
    fileName: 'invoice3.pdf',
    status: 'failed' as const,
    processedAt: '2024-01-15T10:40:00Z',
    extractedData: null,
    confidence: null,
    processingTime: null,
    error: 'OCR processing failed',
  },
];

describe('InvoiceOCRResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.getResults.mockResolvedValue({
      success: true,
      data: mockResults,
      total: mockResults.length,
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', async () => {
    renderWithProviders(<InvoiceOCRResults />);

    expect(screen.getByText('OCR 处理结果')).toBeInTheDocument();
    expect(screen.getByText('刷新')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoiceOCRService.getResults).toHaveBeenCalled();
    });
  });

  /**
   * 测试结果列表加载
   */
  it('loads and displays results', async () => {
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice2.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice3.pdf')).toBeInTheDocument();
    });

    // 检查状态显示
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('处理中')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
  });

  /**
   * 测试空状态
   */
  it('displays empty state when no results', async () => {
    mockInvoiceOCRService.getResults.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('暂无处理结果')).toBeInTheDocument();
    });
  });

  /**
   * 测试加载状态
   */
  it('shows loading state', () => {
    mockInvoiceOCRService.getResults.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<InvoiceOCRResults />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  /**
   * 测试错误状态
   */
  it('handles loading error', async () => {
    mockInvoiceOCRService.getResults.mockRejectedValue(new Error('加载失败'));

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('加载结果失败')).toBeInTheDocument();
    });
  });

  /**
   * 测试刷新功能
   */
  it('refreshes results when refresh button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('刷新');
    await user.click(refreshButton);

    expect(mockInvoiceOCRService.getResults).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试结果详情展开
   */
  it('expands result details when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    // 点击展开按钮
    const expandButton = screen.getAllByRole('button', { name: /展开/ })[0];
    await user.click(expandButton);

    // 检查详情是否显示
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('1500.00')).toBeInTheDocument();
    });
  });

  /**
   * 测试下载功能
   */
  it('downloads result when download button clicked', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['test data'], { type: 'application/json' });
    mockInvoiceOCRService.downloadResult.mockResolvedValue(mockBlob);

    // Mock document.createElement and click
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation();
    jest.spyOn(document.body, 'removeChild').mockImplementation();

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    const downloadButton = screen.getAllByRole('button', { name: /下载/ })[0];
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.downloadResult).toHaveBeenCalledWith('1');
    });

    expect(mockLink.click).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('下载成功');
  });

  /**
   * 测试下载失败
   */
  it('handles download error', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.downloadResult.mockRejectedValue(
      new Error('下载失败')
    );

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    const downloadButton = screen.getAllByRole('button', { name: /下载/ })[0];
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('下载失败: 下载失败');
    });
  });

  /**
   * 测试删除功能
   */
  it('deletes result when delete button clicked', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.deleteResult.mockResolvedValue({
      success: true,
    });

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByRole('button', { name: /删除/ })[0];
    await user.click(deleteButton);

    // 确认删除
    const confirmButton = screen.getByText('确定');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.deleteResult).toHaveBeenCalledWith('1');
    });

    expect(mockMessage.success).toHaveBeenCalledWith('删除成功');
  });

  /**
   * 测试重试处理
   */
  it('retries processing when retry button clicked', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.retryProcessing.mockResolvedValue({
      success: true,
    });

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice3.pdf')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /重试/ });
    await user.click(retryButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.retryProcessing).toHaveBeenCalledWith('3');
    });

    expect(mockMessage.success).toHaveBeenCalledWith('重新处理已开始');
  });

  /**
   * 测试状态过滤
   */
  it('filters results by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    // 点击状态过滤器
    const statusFilter = screen.getByText('全部状态');
    await user.click(statusFilter);

    // 选择"已完成"状态
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    const completedOption = screen.getAllByText('已完成')[1]; // 第二个是下拉选项
    await user.click(completedOption);

    // 验证过滤效果
    expect(mockInvoiceOCRService.getResults).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
      })
    );
  });

  /**
   * 测试分页
   */
  it('handles pagination', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.getResults.mockResolvedValue({
      success: true,
      data: mockResults,
      total: 50, // 模拟更多数据
    });

    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    // 点击下一页
    const nextPageButton = screen.getByTitle('下一页');
    await user.click(nextPageButton);

    expect(mockInvoiceOCRService.getResults).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      })
    );
  });

  /**
   * 测试搜索功能
   */
  it('searches results by filename', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索文件名');
    await user.type(searchInput, 'invoice1');

    // 等待搜索防抖
    await waitFor(
      () => {
        expect(mockInvoiceOCRService.getResults).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'invoice1',
          })
        );
      },
      { timeout: 1000 }
    );
  });

  /**
   * 测试置信度显示
   */
  it('displays confidence score for completed results', async () => {
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  /**
   * 测试处理时间显示
   */
  it('displays processing time for completed results', async () => {
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });
  });

  /**
   * 测试错误信息显示
   */
  it('displays error message for failed results', async () => {
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('OCR processing failed')).toBeInTheDocument();
    });
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <InvoiceOCRResults className='custom-results' />
    );

    expect(container.querySelector('.custom-results')).toBeInTheDocument();
  });

  /**
   * 测试批量操作
   */
  it('handles batch operations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRResults />);

    await waitFor(() => {
      expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
    });

    // 选择多个结果
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // 第一个结果
    await user.click(checkboxes[2]); // 第二个结果

    // 批量删除
    const batchDeleteButton = screen.getByText('批量删除');
    await user.click(batchDeleteButton);

    // 确认删除
    const confirmButton = screen.getByText('确定');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.deleteResult).toHaveBeenCalledTimes(2);
    });
  });
});
