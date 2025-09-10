import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import InvoiceFileUpload from '../InvoiceFileUpload';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    uploadFile: jest.fn(),
    uploadBatch: jest.fn(),
    validateFile: jest.fn(),
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

// Mock file reader
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    readAsDataURL: jest.fn(),
    readAsText: jest.fn(),
    result: 'data:application/pdf;base64,mock-base64-data',
    onload: null,
    onerror: null,
  })),
});

const mockInvoiceOCRService = invoiceOCRService as jest.Mocked<
  typeof invoiceOCRService
>;
const mockMessage = message as jest.Mocked<typeof message>;

/**
 * 创建模拟文件
 */
const createMockFile = (name: string, type: string, size: number = 1024) => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/**
 * 模拟拖拽事件
 */
const createMockDragEvent = (files: File[]) => {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
    },
  };
};

describe('InvoiceFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.validateFile.mockResolvedValue({
      success: true,
      valid: true,
    });
    mockInvoiceOCRService.uploadFile.mockResolvedValue({
      success: true,
      data: {
        id: 'upload-1',
        fileName: 'test.pdf',
        status: 'uploaded',
      },
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', () => {
    renderWithProviders(<InvoiceFileUpload />);

    expect(screen.getByText('上传发票文件')).toBeInTheDocument();
    expect(screen.getByText('点击或拖拽文件到此区域上传')).toBeInTheDocument();
    expect(
      screen.getByText('支持 PDF、JPG、PNG 格式，单个文件不超过 10MB')
    ).toBeInTheDocument();
  });

  /**
   * 测试文件选择上传
   */
  it('uploads file when selected', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(mockInvoiceOCRService.validateFile).toHaveBeenCalledWith(mockFile);
    });

    await waitFor(() => {
      expect(mockInvoiceOCRService.uploadFile).toHaveBeenCalledWith(mockFile);
    });

    expect(mockMessage.success).toHaveBeenCalledWith('文件上传成功');
  });

  /**
   * 测试多文件上传
   */
  it('uploads multiple files', async () => {
    const user = userEvent.setup();
    const mockFiles = [
      createMockFile('invoice1.pdf', 'application/pdf'),
      createMockFile('invoice2.jpg', 'image/jpeg'),
    ];

    mockInvoiceOCRService.uploadBatch.mockResolvedValue({
      success: true,
      data: mockFiles.map((file, index) => ({
        id: `upload-${index + 1}`,
        fileName: file.name,
        status: 'uploaded',
      })),
    });

    renderWithProviders(<InvoiceFileUpload multiple />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(mockInvoiceOCRService.uploadBatch).toHaveBeenCalledWith(mockFiles);
    });

    expect(mockMessage.success).toHaveBeenCalledWith('批量上传成功');
  });

  /**
   * 测试拖拽上传
   */
  it('handles drag and drop upload', async () => {
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload />);

    const dropZone = screen
      .getByText('点击或拖拽文件到此区域上传')
      .closest('.ant-upload-drag');

    // 模拟拖拽进入
    fireEvent.dragEnter(dropZone!, createMockDragEvent([mockFile]));
    expect(dropZone).toHaveClass('ant-upload-drag-hover');

    // 模拟拖拽悬停
    fireEvent.dragOver(dropZone!, createMockDragEvent([mockFile]));

    // 模拟文件放置
    fireEvent.drop(dropZone!, createMockDragEvent([mockFile]));

    await waitFor(() => {
      expect(mockInvoiceOCRService.validateFile).toHaveBeenCalledWith(mockFile);
    });
  });

  /**
   * 测试文件类型验证
   */
  it('validates file type', async () => {
    const user = userEvent.setup();
    const invalidFile = createMockFile('document.txt', 'text/plain');

    renderWithProviders(<InvoiceFileUpload />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, invalidFile);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith(
        '不支持的文件类型，请上传 PDF、JPG 或 PNG 格式的文件'
      );
    });

    expect(mockInvoiceOCRService.uploadFile).not.toHaveBeenCalled();
  });

  /**
   * 测试文件大小验证
   */
  it('validates file size', async () => {
    const user = userEvent.setup();
    const largeFile = createMockFile(
      'large.pdf',
      'application/pdf',
      11 * 1024 * 1024
    ); // 11MB

    renderWithProviders(<InvoiceFileUpload />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('文件大小不能超过 10MB');
    });

    expect(mockInvoiceOCRService.uploadFile).not.toHaveBeenCalled();
  });

  /**
   * 测试文件验证失败
   */
  it('handles file validation failure', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('corrupted.pdf', 'application/pdf');

    mockInvoiceOCRService.validateFile.mockResolvedValue({
      success: false,
      valid: false,
      error: '文件已损坏',
    });

    renderWithProviders(<InvoiceFileUpload />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith(
        '文件验证失败: 文件已损坏'
      );
    });

    expect(mockInvoiceOCRService.uploadFile).not.toHaveBeenCalled();
  });

  /**
   * 测试上传失败
   */
  it('handles upload failure', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    mockInvoiceOCRService.uploadFile.mockRejectedValue(new Error('网络错误'));

    renderWithProviders(<InvoiceFileUpload />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('文件上传失败: 网络错误');
    });
  });

  /**
   * 测试上传进度显示
   */
  it('shows upload progress', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    // 模拟上传进度
    mockInvoiceOCRService.uploadFile.mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              data: {
                id: 'upload-1',
                fileName: 'invoice.pdf',
                status: 'uploaded',
              },
            });
          }, 1000);
        })
    );

    renderWithProviders(<InvoiceFileUpload />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    // 检查上传中状态
    expect(screen.getByText('上传中...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // 等待上传完成
    await waitFor(
      () => {
        expect(screen.queryByText('上传中...')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  /**
   * 测试文件列表显示
   */
  it('displays uploaded file list', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload showUploadList />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });

    // 检查文件操作按钮
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /预览/ })).toBeInTheDocument();
  });

  /**
   * 测试文件删除
   */
  it('removes file from list when delete button clicked', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload showUploadList />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /删除/ });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('invoice.pdf')).not.toBeInTheDocument();
    });
  });

  /**
   * 测试文件预览
   */
  it('opens file preview when preview button clicked', async () => {
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    renderWithProviders(<InvoiceFileUpload showUploadList />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });

    const previewButton = screen.getByRole('button', { name: /预览/ });
    await user.click(previewButton);

    expect(mockOpen).toHaveBeenCalled();
  });

  /**
   * 测试自定义上传提示
   */
  it('displays custom upload hint', () => {
    const customHint = '请上传清晰的发票图片';

    renderWithProviders(<InvoiceFileUpload hint={customHint} />);

    expect(screen.getByText(customHint)).toBeInTheDocument();
  });

  /**
   * 测试禁用状态
   */
  it('disables upload when disabled prop is true', () => {
    renderWithProviders(<InvoiceFileUpload disabled />);

    const uploadArea = screen
      .getByText('点击或拖拽文件到此区域上传')
      .closest('.ant-upload-drag');
    expect(uploadArea).toHaveClass('ant-upload-disabled');
  });

  /**
   * 测试最大文件数量限制
   */
  it('enforces maximum file count', async () => {
    const user = userEvent.setup();
    const mockFiles = [
      createMockFile('invoice1.pdf', 'application/pdf'),
      createMockFile('invoice2.pdf', 'application/pdf'),
      createMockFile('invoice3.pdf', 'application/pdf'),
    ];

    renderWithProviders(
      <InvoiceFileUpload multiple maxCount={2} showUploadList />
    );

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFiles);

    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledWith('最多只能上传 2 个文件');
    });

    // 只应该上传前两个文件
    expect(mockInvoiceOCRService.uploadFile).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试上传前回调
   */
  it('calls beforeUpload callback', async () => {
    const beforeUpload = jest.fn().mockReturnValue(true);
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload beforeUpload={beforeUpload} />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    expect(beforeUpload).toHaveBeenCalledWith(mockFile, [mockFile]);
  });

  /**
   * 测试上传前回调阻止上传
   */
  it('prevents upload when beforeUpload returns false', async () => {
    const beforeUpload = jest.fn().mockReturnValue(false);
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload beforeUpload={beforeUpload} />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    expect(beforeUpload).toHaveBeenCalledWith(mockFile, [mockFile]);
    expect(mockInvoiceOCRService.uploadFile).not.toHaveBeenCalled();
  });

  /**
   * 测试上传成功回调
   */
  it('calls onSuccess callback when upload succeeds', async () => {
    const onSuccess = jest.fn();
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    renderWithProviders(<InvoiceFileUpload onSuccess={onSuccess} />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'upload-1',
          fileName: 'invoice.pdf',
        }),
        mockFile
      );
    });
  });

  /**
   * 测试上传失败回调
   */
  it('calls onError callback when upload fails', async () => {
    const onError = jest.fn();
    const user = userEvent.setup();
    const mockFile = createMockFile('invoice.pdf', 'application/pdf');

    mockInvoiceOCRService.uploadFile.mockRejectedValue(new Error('上传失败'));

    renderWithProviders(<InvoiceFileUpload onError={onError} />);

    const fileInput = screen.getByLabelText(/上传文件/);
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error), mockFile);
    });
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <InvoiceFileUpload className='custom-upload' />
    );

    expect(container.querySelector('.custom-upload')).toBeInTheDocument();
  });

  /**
   * 测试自定义接受的文件类型
   */
  it('accepts custom file types', () => {
    renderWithProviders(<InvoiceFileUpload accept='.pdf,.doc,.docx' />);

    const fileInput = screen.getByLabelText(/上传文件/);
    expect(fileInput).toHaveAttribute('accept', '.pdf,.doc,.docx');
  });
});
