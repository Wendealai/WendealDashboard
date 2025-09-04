import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import InvoiceOCRSettings from '../InvoiceOCRSettings';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { message } from 'antd';

// Mock services
jest.mock('../../../services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    testWebhook: jest.fn(),
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
 * 模拟配置数据
 */
const mockConfig = {
  workflowName: 'Test Invoice OCR',
  webhookUrl: 'https://example.com/webhook',
  apiKey: 'test-api-key',
  timeout: 30,
  retryAttempts: 3,
  enableNotifications: true,
  outputFormat: 'json' as const,
  description: 'Test description',
};

describe('InvoiceOCRSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceOCRService.getSettings.mockResolvedValue({
      success: true,
      data: mockConfig,
    });
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly', async () => {
    renderWithProviders(<InvoiceOCRSettings />);

    expect(screen.getByText('Invoice OCR 设置')).toBeInTheDocument();
    expect(screen.getByText('基本配置')).toBeInTheDocument();
    expect(screen.getByText('高级配置')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoiceOCRService.getSettings).toHaveBeenCalled();
    });
  });

  /**
   * 测试配置加载
   */
  it('loads configuration on mount', async () => {
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(mockInvoiceOCRService.getSettings).toHaveBeenCalled();
    });

    // 检查表单字段是否填充了数据
    expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('https://example.com/webhook')
    ).toBeInTheDocument();
  });

  /**
   * 测试表单验证
   */
  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    // 清空必填字段
    const workflowNameInput = screen.getByDisplayValue('Test Invoice OCR');
    await user.clear(workflowNameInput);

    // 提交表单
    const saveButton = screen.getByText('保存配置');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('请输入工作流名称')).toBeInTheDocument();
    });
  });

  /**
   * 测试工作流名称长度验证
   */
  it('validates workflow name length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    // 输入过短的名称
    const workflowNameInput = screen.getByDisplayValue('Test Invoice OCR');
    await user.clear(workflowNameInput);
    await user.type(workflowNameInput, 'A');

    const saveButton = screen.getByText('保存配置');
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText('工作流名称长度应在 2-50 个字符之间')
      ).toBeInTheDocument();
    });
  });

  /**
   * 测试Webhook URL验证
   */
  it('validates webhook URL format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('https://example.com/webhook')
      ).toBeInTheDocument();
    });

    // 输入无效的URL
    const webhookInput = screen.getByDisplayValue(
      'https://example.com/webhook'
    );
    await user.clear(webhookInput);
    await user.type(webhookInput, 'invalid-url');

    const saveButton = screen.getByText('保存配置');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('请输入有效的 Webhook URL')).toBeInTheDocument();
    });
  });

  /**
   * 测试配置保存
   */
  it('saves configuration successfully', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.updateSettings.mockResolvedValue({
      success: true,
      data: mockConfig,
    });

    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    // 修改配置
    const workflowNameInput = screen.getByDisplayValue('Test Invoice OCR');
    await user.clear(workflowNameInput);
    await user.type(workflowNameInput, 'Updated Invoice OCR');

    // 保存配置
    const saveButton = screen.getByText('保存配置');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowName: 'Updated Invoice OCR',
        })
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('配置保存成功');
  });

  /**
   * 测试配置保存失败
   */
  it('handles save configuration error', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.updateSettings.mockRejectedValue(
      new Error('保存失败')
    );

    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('保存配置');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('保存配置失败: 保存失败');
    });
  });

  /**
   * 测试Webhook连接测试
   */
  it('tests webhook connection successfully', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.testWebhook.mockResolvedValue({
      success: true,
      message: '连接成功',
    });

    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('https://example.com/webhook')
      ).toBeInTheDocument();
    });

    const testButton = screen.getByText('测试连接');
    await user.click(testButton);

    await waitFor(() => {
      expect(mockInvoiceOCRService.testWebhook).toHaveBeenCalledWith(
        'https://example.com/webhook'
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('Webhook 连接测试成功');
  });

  /**
   * 测试Webhook连接测试失败
   */
  it('handles webhook connection test failure', async () => {
    const user = userEvent.setup();
    mockInvoiceOCRService.testWebhook.mockRejectedValue(new Error('连接失败'));

    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('https://example.com/webhook')
      ).toBeInTheDocument();
    });

    const testButton = screen.getByText('测试连接');
    await user.click(testButton);

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith(
        'Webhook 连接测试失败: 连接失败'
      );
    });
  });

  /**
   * 测试重置功能
   */
  it('resets form to initial values', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    // 修改表单值
    const workflowNameInput = screen.getByDisplayValue('Test Invoice OCR');
    await user.clear(workflowNameInput);
    await user.type(workflowNameInput, 'Modified Name');

    // 重置表单
    const resetButton = screen.getByText('重置');
    await user.click(resetButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });
  });

  /**
   * 测试输出格式选择
   */
  it('allows selecting different output formats', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    // 点击输出格式选择器
    const formatSelect = screen.getByText('JSON');
    await user.click(formatSelect);

    // 选择CSV格式
    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    await user.click(screen.getByText('CSV'));

    // 验证选择已更改
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  /**
   * 测试通知开关
   */
  it('toggles notification setting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    const notificationSwitch = screen.getByRole('switch');
    expect(notificationSwitch).toBeChecked();

    await user.click(notificationSwitch);
    expect(notificationSwitch).not.toBeChecked();
  });

  /**
   * 测试连接状态显示
   */
  it('displays connection status alert', async () => {
    renderWithProviders(<InvoiceOCRSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Invoice OCR')).toBeInTheDocument();
    });

    // 应该显示连接状态提示
    expect(screen.getByText(/连接状态/)).toBeInTheDocument();
  });

  /**
   * 测试加载状态
   */
  it('shows loading state during configuration load', () => {
    mockInvoiceOCRService.getSettings.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<InvoiceOCRSettings />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <InvoiceOCRSettings className='custom-settings' />
    );

    expect(container.querySelector('.custom-settings')).toBeInTheDocument();
  });
});
