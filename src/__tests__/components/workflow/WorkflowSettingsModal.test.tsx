import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { I18nextProvider } from 'react-i18next';
import { WorkflowSettingsModal } from '../../../components/workflow/WorkflowSettingsModal';
import { WorkflowSettingsService } from '../../../services/workflowSettingsService';
import type { WorkflowSettings } from '../../../types/workflow';
// Jest测试框架导入
// describe, it, expect, beforeEach, afterEach 由Jest全局提供

/**
 * WorkflowSettingsModal 组件测试
 * 测试模态框的打开/关闭行为、表单提交和验证功能
 */

// 模拟 i18next 和 react-i18next
jest.mock('i18next', () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  t: (key: string) => key,
  changeLanguage: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'workflow.settings.title': '工作流设置',
        'workflow.settings.name': '工作流名称',
        'workflow.settings.webhookUrl': 'Webhook URL',
        'workflow.settings.enabled': '启用工作流',
        'workflow.settings.retryAttempts': '重试次数',
        'workflow.settings.timeout': '超时时间 (毫秒)',
        'workflow.settings.save': '保存设置',
        'workflow.settings.cancel': '取消',
        'workflow.settings.reset': '重置',
        'workflow.settings.export': '导出设置',
        'workflow.settings.import': '导入设置',
        'workflow.settings.saveSuccess': '设置保存成功',
        'workflow.settings.saveError': '保存设置失败',
        'workflow.settings.loadError': '加载设置失败',
        'workflow.settings.resetSuccess': '设置重置成功',
        'workflow.settings.exportSuccess': '设置导出成功',
        'workflow.settings.importSuccess': '设置导入成功',
        'workflow.settings.importError': '导入设置失败',
        'form.required': '此字段为必填项',
        'form.invalidUrl': 'URL格式不正确',
        'form.minLength': '最少需要 {min} 个字符',
        'form.maxLength': '最多允许 {max} 个字符',
        'form.minValue': '最小值为 {min}',
        'form.maxValue': '最大值为 {max}',
      };
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  withTranslation: () => (Component: React.ComponentType) => {
    const WrappedComponent = (props: any) => (
      <Component {...props} t={(key: string) => key} />
    );
    WrappedComponent.displayName = `withTranslation(${Component.displayName || Component.name})`;
    return WrappedComponent;
  },
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// 模拟 i18next-browser-languagedetector
jest.mock('i18next-browser-languagedetector', () => ({
  __esModule: true,
  default: {
    type: 'languageDetector',
    init: jest.fn(),
    detect: jest.fn(() => 'en'),
    cacheUserLanguage: jest.fn(),
  },
}));

// WorkflowSettingsService 已在上面模拟

// Mock antd message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      loading: jest.fn(),
    },
  };
});

const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  loading: jest.fn(),
};

/**
 * 测试工具函数：渲染带有必要Provider的组件
 */
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ConfigProvider locale={zhCN}>
      <I18nextProvider i18n={{} as any}>{ui}</I18nextProvider>
    </ConfigProvider>
  );
};

/**
 * 测试数据
 */
const mockWorkflowSettings: WorkflowSettings = {
  name: 'Test Workflow',
  webhookUrl: 'https://api.example.com/webhook',
  enabled: true,
  retryAttempts: 3,
  timeout: 30000,
};

const mockEmptySettings: WorkflowSettings = {
  name: '',
  webhookUrl: '',
  enabled: false,
  retryAttempts: 3,
  timeout: 30000,
};

describe('WorkflowSettingsModal', () => {
  let mockSettingsService: {
    loadSettings: ReturnType<typeof jest.fn>;
    saveSettings: ReturnType<typeof jest.fn>;
    resetSettings: ReturnType<typeof jest.fn>;
    exportSettings: ReturnType<typeof jest.fn>;
    importSettings: ReturnType<typeof jest.fn>;
  };

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // Mock settings service methods
    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
      resetSettings: jest.fn(),
      exportSettings: jest.fn(),
      importSettings: jest.fn(),
    };

    // 使用模拟的服务方法

    // 默认返回成功的响应
    mockSettingsService.loadSettings.mockResolvedValue({
      success: true,
      data: mockWorkflowSettings,
    });
    mockSettingsService.saveSettings.mockResolvedValue({
      success: true,
      data: mockWorkflowSettings,
    });
    mockSettingsService.resetSettings.mockResolvedValue({
      success: true,
      data: mockEmptySettings,
    });
    mockSettingsService.exportSettings.mockResolvedValue({
      success: true,
      data: JSON.stringify(mockWorkflowSettings, null, 2),
    });
    mockSettingsService.importSettings.mockResolvedValue({
      success: true,
      data: mockWorkflowSettings,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Modal Rendering and Visibility', () => {
    it('should render modal when open is true', () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      expect(screen.getByText('工作流设置')).toBeInTheDocument();
      expect(screen.getByLabelText('工作流名称')).toBeInTheDocument();
      expect(screen.getByLabelText('Webhook URL')).toBeInTheDocument();
    });

    it('should not render modal when open is false', () => {
      renderWithProviders(
        <WorkflowSettingsModal {...defaultProps} open={false} />
      );

      expect(screen.queryByText('工作流设置')).not.toBeInTheDocument();
    });

    it('should display all form fields', () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      expect(screen.getByLabelText('工作流名称')).toBeInTheDocument();
      expect(screen.getByLabelText('Webhook URL')).toBeInTheDocument();
      expect(screen.getByLabelText('启用工作流')).toBeInTheDocument();
      expect(screen.getByLabelText('重试次数')).toBeInTheDocument();
      expect(screen.getByLabelText('超时时间 (毫秒)')).toBeInTheDocument();
    });

    it('should display action buttons', () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      expect(screen.getByText('保存设置')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
      expect(screen.getByText('重置')).toBeInTheDocument();
      expect(screen.getByText('导出设置')).toBeInTheDocument();
      expect(screen.getByText('导入设置')).toBeInTheDocument();
    });
  });

  describe('Modal Open/Close Behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const onClose = jest.fn();
      renderWithProviders(
        <WorkflowSettingsModal {...defaultProps} onClose={onClose} />
      );

      const cancelButton = screen.getByText('取消');
      await userEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when modal close button is clicked', async () => {
      const onClose = jest.fn();
      renderWithProviders(
        <WorkflowSettingsModal {...defaultProps} onClose={onClose} />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', async () => {
      const onClose = jest.fn();
      renderWithProviders(
        <WorkflowSettingsModal {...defaultProps} onClose={onClose} />
      );

      await userEvent.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Data Loading', () => {
    it('should load and display existing settings', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockSettingsService.loadSettings).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('https://api.example.com/webhook')
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
        expect(screen.getByDisplayValue('30000')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      mockSettingsService.loadSettings.mockResolvedValue({
        success: false,
        error: 'Failed to load settings',
      });

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('加载设置失败');
      });
    });

    it('should show loading state while fetching data', () => {
      mockSettingsService.loadSettings.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      // 清空必填字段
      const nameInput = screen.getByLabelText('工作流名称');
      await userEvent.clear(nameInput);

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('此字段为必填项')).toBeInTheDocument();
      });

      expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
    });

    it('should validate URL format', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const urlInput = screen.getByLabelText('Webhook URL');
      await userEvent.clear(urlInput);
      await userEvent.type(urlInput, 'invalid-url');

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('URL格式不正确')).toBeInTheDocument();
      });

      expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
    });

    it('should validate numeric field ranges', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const retryInput = screen.getByLabelText('重试次数');
      await userEvent.clear(retryInput);
      await userEvent.type(retryInput, '0'); // Below minimum

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('最小值为 1')).toBeInTheDocument();
      });

      expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
    });

    it('should validate maximum values', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const timeoutInput = screen.getByLabelText('超时时间 (毫秒)');
      await userEvent.clear(timeoutInput);
      await userEvent.type(timeoutInput, '999999999'); // Above maximum

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('最大值为 300000')).toBeInTheDocument();
      });

      expect(mockSettingsService.saveSettings).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should save settings with valid data', async () => {
      const onSave = jest.fn();
      renderWithProviders(
        <WorkflowSettingsModal {...defaultProps} onSave={onSave} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSettingsService.saveSettings).toHaveBeenCalledWith(
          mockWorkflowSettings
        );
        expect(mockMessage.success).toHaveBeenCalledWith('设置保存成功');
        expect(onSave).toHaveBeenCalledWith(mockWorkflowSettings);
      });
    });

    it('should handle save errors', async () => {
      mockSettingsService.saveSettings.mockResolvedValue({
        success: false,
        error: 'Save failed',
      });

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('保存设置失败');
      });
    });

    it('should show loading state during save', async () => {
      mockSettingsService.saveSettings.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () => resolve({ success: true, data: mockWorkflowSettings }),
              1000
            )
          )
      );

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByTestId('save-loading')).toBeInTheDocument();
    });
  });

  describe('Form Reset Functionality', () => {
    it('should reset form to default values', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      const resetButton = screen.getByText('重置');
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(mockSettingsService.resetSettings).toHaveBeenCalledTimes(1);
        expect(mockMessage.success).toHaveBeenCalledWith('设置重置成功');
      });
    });

    it('should handle reset errors', async () => {
      mockSettingsService.resetSettings.mockResolvedValue({
        success: false,
        error: 'Reset failed',
      });

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const resetButton = screen.getByText('重置');
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('重置设置失败');
      });
    });
  });

  describe('Export/Import Functionality', () => {
    it('should export settings', async () => {
      // Mock URL.createObjectURL and document.createElement
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = jest.fn();
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();

      Object.defineProperty(URL, 'createObjectURL', {
        value: mockCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: mockRevokeObjectURL,
      });

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };

      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation(mockAppendChild);
      jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation(mockRemoveChild);

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const exportButton = screen.getByText('导出设置');
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(mockSettingsService.exportSettings).toHaveBeenCalledTimes(1);
        expect(mockMessage.success).toHaveBeenCalledWith('设置导出成功');
        expect(mockClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle export errors', async () => {
      mockSettingsService.exportSettings.mockResolvedValue({
        success: false,
        error: 'Export failed',
      });

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const exportButton = screen.getByText('导出设置');
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('导出设置失败');
      });
    });

    it('should import settings from file', async () => {
      const mockFile = new File(
        [JSON.stringify(mockWorkflowSettings)],
        'settings.json',
        { type: 'application/json' }
      );

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const importInput = screen.getByLabelText('导入设置');
      await userEvent.upload(importInput, mockFile);

      await waitFor(() => {
        expect(mockSettingsService.importSettings).toHaveBeenCalledWith(
          JSON.stringify(mockWorkflowSettings)
        );
        expect(mockMessage.success).toHaveBeenCalledWith('设置导入成功');
      });
    });

    it('should handle import errors', async () => {
      mockSettingsService.importSettings.mockResolvedValue({
        success: false,
        error: 'Import failed',
      });

      const mockFile = new File(['invalid json'], 'settings.json', {
        type: 'application/json',
      });

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const importInput = screen.getByLabelText('导入设置');
      await userEvent.upload(importInput, mockFile);

      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('导入设置失败');
      });
    });

    it('should validate file type for import', async () => {
      const mockFile = new File(['content'], 'settings.txt', {
        type: 'text/plain',
      });

      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const importInput = screen.getByLabelText('导入设置');
      await userEvent.upload(importInput, mockFile);

      await waitFor(() => {
        expect(mockMessage.error).toHaveBeenCalledWith('请选择JSON格式的文件');
      });

      expect(mockSettingsService.importSettings).not.toHaveBeenCalled();
    });
  });

  describe('Form Field Interactions', () => {
    it('should update form fields correctly', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('工作流名称');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Workflow');

      expect(screen.getByDisplayValue('Updated Workflow')).toBeInTheDocument();
    });

    it('should toggle enabled switch', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      const enabledSwitch = screen.getByLabelText('启用工作流');
      expect(enabledSwitch).toBeChecked();

      await userEvent.click(enabledSwitch);
      expect(enabledSwitch).not.toBeChecked();
    });

    it('should handle numeric input changes', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
      });

      const retryInput = screen.getByLabelText('重试次数');
      await userEvent.clear(retryInput);
      await userEvent.type(retryInput, '5');

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByLabelText('工作流名称')).toBeInTheDocument();
      expect(screen.getByLabelText('Webhook URL')).toBeInTheDocument();
      expect(screen.getByLabelText('启用工作流')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('工作流名称');
      nameInput.focus();

      await userEvent.keyboard('{Tab}');
      expect(screen.getByLabelText('Webhook URL')).toHaveFocus();

      await userEvent.keyboard('{Tab}');
      expect(screen.getByLabelText('启用工作流')).toHaveFocus();
    });

    it('should announce form validation errors to screen readers', async () => {
      renderWithProviders(<WorkflowSettingsModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('工作流名称');
      await userEvent.clear(nameInput);

      const saveButton = screen.getByText('保存设置');
      await userEvent.click(saveButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('此字段为必填项');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();

      const TestComponent = () => {
        renderSpy();
        return <WorkflowSettingsModal {...defaultProps} />;
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Workflow')).toBeInTheDocument();
      });

      // 初始渲染 + 数据加载后的重新渲染
      expect(renderSpy).toHaveBeenCalledTimes(2);

      // 点击不会触发状态变化的按钮
      const cancelButton = screen.getByText('取消');
      await userEvent.click(cancelButton);

      // 不应该有额外的渲染
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
