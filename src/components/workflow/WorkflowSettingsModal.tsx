import React, { useState, useEffect } from 'react';
import { Form, Input, Switch, message } from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import Modal from '../common/Modal';
import type { ModalProps } from '../common/Modal';
import type {
  WorkflowSettings,
  WorkflowSettingsFormData,
  ValidationResult,
} from '../../types/workflow';
import {
  workflowSettingsService,
  validateWorkflowSettings,
} from '../../services';

/**
 * 工作流设置模态框组件属性接口
 */
export interface WorkflowSettingsModalProps
  extends Omit<ModalProps, 'children' | 'onOk' | 'onCancel'> {
  /** 是否显示模态框 */
  visible?: boolean;
  /** 关闭模态框回调 */
  onClose?: () => void;
  /** 保存成功回调 */
  onSave?: (settings: WorkflowSettings) => void;
  /** 初始设置数据 */
  initialSettings?: Partial<WorkflowSettings>;
  /** 是否只读模式 */
  readonly?: boolean;
}

/**
 * 工作流设置模态框组件
 * 提供工作流配置的编辑界面
 *
 * @param props - 组件属性
 * @returns React组件
 */
const WorkflowSettingsModal: React.FC<WorkflowSettingsModalProps> = ({
  visible = false,
  onClose,
  onSave,
  initialSettings,
  readonly = false,
  title = '工作流设置',
  width = 600,
  ...modalProps
}) => {
  const [form] = Form.useForm<WorkflowSettingsFormData>();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [validationErrors, setValidationErrors] =
    useState<ValidationResult | null>(null);

  /**
   * 加载工作流设置
   */
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await workflowSettingsService.getSettings();

      if (response.success && response.data) {
        setSettings(response.data);
        form.setFieldsValue({
          name: response.data.name,
          webhookUrl: response.data.webhookUrl,
          enabled: response.data.enabled,
        });
      } else {
        message.error(response.error || '加载设置失败');
      }
    } catch (error) {
      console.error('Failed to load workflow settings:', error);
      message.error('加载设置时发生错误');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 验证表单数据
   * @param values - 表单值
   */
  const validateForm = async (
    values: WorkflowSettingsFormData
  ): Promise<boolean> => {
    try {
      setValidating(true);
      setValidationErrors(null);

      const validation = await validateWorkflowSettings(values);

      if (!validation.isValid) {
        setValidationErrors(validation);

        // 显示验证错误
        const errorMessages = validation.errors
          .map(error => error.message)
          .join('\n');
        message.error(`验证失败:\n${errorMessages}`);

        return false;
      }

      // 显示警告（如果有）
      if (validation.warnings && validation.warnings.length > 0) {
        const warningMessages = validation.warnings
          .map(warning => warning.message)
          .join('\n');
        message.warning(`注意:\n${warningMessages}`);
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      message.error('验证过程中发生错误');
      return false;
    } finally {
      setValidating(false);
    }
  };

  /**
   * 保存设置
   */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 验证表单数据
      const isValid = await validateForm(values);
      if (!isValid) {
        return;
      }

      setLoading(true);

      const response = await workflowSettingsService.saveSettings(values);

      if (response.success && response.data) {
        message.success('设置保存成功');
        setSettings(response.data);

        if (onSave) {
          onSave(response.data);
        }

        handleClose();
      } else {
        message.error(response.error || '保存设置失败');
      }
    } catch (error) {
      console.error('Failed to save workflow settings:', error);
      message.error('保存设置时发生错误');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置表单
   */
  const handleReset = async () => {
    try {
      setLoading(true);

      const response = await workflowSettingsService.resetSettings();

      if (response.success && response.data) {
        message.success('设置已重置为默认值');
        setSettings(response.data);
        form.setFieldsValue({
          name: response.data.name,
          webhookUrl: response.data.webhookUrl,
          enabled: response.data.enabled,
        });
      } else {
        message.error(response.error || '重置设置失败');
      }
    } catch (error) {
      console.error('Failed to reset workflow settings:', error);
      message.error('重置设置时发生错误');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 关闭模态框
   */
  const handleClose = () => {
    form.resetFields();
    setValidationErrors(null);
    if (onClose) {
      onClose();
    }
  };

  /**
   * 表单值变化处理
   * 实现实时验证功能
   */
  const handleFormChange = async (
    changedValues: Partial<WorkflowSettingsFormData>,
    allValues: WorkflowSettingsFormData
  ) => {
    // 清除之前的验证错误
    if (validationErrors) {
      setValidationErrors(null);
    }

    // 实时验证：当用户输入时进行验证
    try {
      // 只有当所有必填字段都有值时才进行验证
      if (allValues.name && allValues.webhookUrl) {
        const validation = await validateWorkflowSettings(allValues);

        if (!validation.isValid) {
          setValidationErrors(validation);
        }
      }
    } catch (error) {
      console.error('Real-time validation error:', error);
    }
  };

  // 当模态框打开时加载设置
  useEffect(() => {
    if (visible) {
      if (initialSettings) {
        form.setFieldsValue({
          name: initialSettings.name || '',
          webhookUrl: initialSettings.webhookUrl || '',
          enabled: initialSettings.enabled ?? true,
        });
      } else {
        loadSettings();
      }
    }
  }, [visible, initialSettings, form]);

  // 自定义页脚按钮
  const footerButtons = [
    <button
      key='reset'
      type='button'
      className='ant-btn ant-btn-default'
      onClick={handleReset}
      disabled={loading || readonly}
      style={{ marginRight: 8 }}
    >
      <ReloadOutlined />
      重置
    </button>,
    <button
      key='cancel'
      type='button'
      className='ant-btn ant-btn-default'
      onClick={handleClose}
      disabled={loading}
    >
      取消
    </button>,
    <button
      key='save'
      type='button'
      className='ant-btn ant-btn-primary'
      onClick={handleSave}
      disabled={loading || validating || readonly}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {loading || validating ? (
        <span className='ant-spin-dot ant-spin-dot-spin'>
          <i className='ant-spin-dot-item'></i>
          <i className='ant-spin-dot-item'></i>
          <i className='ant-spin-dot-item'></i>
          <i className='ant-spin-dot-item'></i>
        </span>
      ) : (
        <SaveOutlined />
      )}
      {loading ? '保存中...' : validating ? '验证中...' : '保存'}
    </button>,
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingOutlined />
          {title}
        </div>
      }
      open={visible}
      width={width}
      onCancel={handleClose}
      footerButtons={footerButtons}
      destroyOnClose
      maskClosable={!loading}
      keyboard={!loading}
    >
      <Form
        form={form}
        layout='vertical'
        onValuesChange={handleFormChange}
        disabled={readonly}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          label='工作流名称'
          name='name'
          rules={[
            { required: true, message: '请输入工作流名称' },
            { min: 2, message: '工作流名称至少2个字符' },
            { max: 50, message: '工作流名称不能超过50个字符' },
          ]}
          validateStatus={
            validationErrors?.errors.some(e => e.field === 'name')
              ? 'error'
              : ''
          }
          help={validationErrors?.errors.find(e => e.field === 'name')?.message}
        >
          <Input
            placeholder='请输入工作流名称'
            maxLength={50}
            showCount
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label='Webhook URL'
          name='webhookUrl'
          rules={[{ type: 'url', message: '请输入有效的URL地址' }]}
          validateStatus={
            validationErrors?.errors.some(e => e.field === 'webhookUrl')
              ? 'error'
              : ''
          }
          help={
            validationErrors?.errors.find(e => e.field === 'webhookUrl')
              ?.message
          }
        >
          <Input placeholder='https://example.com/webhook' disabled={loading} />
        </Form.Item>

        <Form.Item
          label='启用工作流'
          name='enabled'
          valuePropName='checked'
          extra='启用后工作流将开始处理请求'
        >
          <Switch
            checkedChildren='启用'
            unCheckedChildren='禁用'
            disabled={loading}
          />
        </Form.Item>

        {/* 显示设置信息 */}
        {settings && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              fontSize: '12px',
              color: '#666',
            }}
          >
            <div>创建时间: {new Date(settings.createdAt).toLocaleString()}</div>
            <div>更新时间: {new Date(settings.updatedAt).toLocaleString()}</div>
          </div>
        )}

        {/* 显示验证警告 */}
        {validationErrors?.warnings && validationErrors.warnings.length > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 6,
              fontSize: '12px',
              color: '#d46b08',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>注意事项:</div>
            {validationErrors.warnings.map((warning, index) => (
              <div key={index}>• {warning.message}</div>
            ))}
          </div>
        )}
      </Form>
    </Modal>
  );
};

// 默认导出
export default WorkflowSettingsModal;

// 命名导出
export { WorkflowSettingsModal };
