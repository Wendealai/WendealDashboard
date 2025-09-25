import React, { useState, useEffect } from 'react';
import { Form, Input, Switch } from 'antd';
import { useMessage } from '@/hooks';
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
 * Workflow settings modal component props interface
 */
export interface WorkflowSettingsModalProps
  extends Omit<ModalProps, 'children' | 'onOk' | 'onCancel'> {
  /** Whether to show modal */
  visible?: boolean;
  /** Close modal callback */
  onClose?: () => void;
  /** Save success callback */
  onSave?: (settings: WorkflowSettings) => void;
  /** Initial settings data */
  initialSettings?: Partial<WorkflowSettings>;
  /** Whether in readonly mode */
  readonly?: boolean;
  /** Workflow ID */
  workflowId?: string | null;
}

/**
 * Workflow settings modal component
 * Provides editing interface for workflow configuration
 *
 * @param props - Component props
 * @returns React component
 */
const WorkflowSettingsModal: React.FC<WorkflowSettingsModalProps> = ({
  visible = false,
  onClose,
  onSave,
  initialSettings,
  readonly = false,
  title = 'Workflow Settings',
  width = Math.min(600, window.innerWidth * 0.9), // 确保不超出页面范围
  workflowId,
}) => {
  const [form] = Form.useForm<WorkflowSettingsFormData>();
  const message = useMessage();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const [validationErrors, setValidationErrors] =
    useState<ValidationResult | null>(null);

  /**
   * Load workflow settings
   */
  const loadSettings = async () => {
    if (!workflowId) {
      message.error('No workflow ID provided');
      return;
    }

    try {
      setLoading(true);
      const response = await workflowSettingsService.getSettings(workflowId);

      if (response.success && response.data) {
        setSettings(response.data);
        form.setFieldsValue({
          name: response.data.name,
          webhookUrl: response.data.webhookUrl,
          enabled: response.data.enabled ?? true,
        });
      } else {
        message.error(response.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Failed to load workflow settings:', error);
      message.error('Error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate form data
   * @param values - Form values
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

        // Show validation errors
        const errorMessages = validation.errors
          .map(error => error.message)
          .join('\n');
        message.error(`Validation failed:\n${errorMessages}`);

        return false;
      }

      // Show warnings (if any)
      if (validation.warnings && validation.warnings.length > 0) {
        const warningMessages = validation.warnings
          .map(warning => warning.message)
          .join('\n');
        message.warning(`Note:\n${warningMessages}`);
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      message.error('Error occurred during validation');
      return false;
    } finally {
      setValidating(false);
    }
  };

  /**
   * Save settings
   */
  const handleSave = async () => {
    if (!workflowId) {
      message.error('No workflow ID provided');
      return;
    }

    try {
      const values = await form.validateFields();

      // Validate form data
      const isValid = await validateForm(values);
      if (!isValid) {
        return;
      }

      setLoading(true);

      const response = await workflowSettingsService.saveSettings(
        workflowId,
        values
      );

      if (response.success && response.data) {
        message.success('Settings saved successfully');
        setSettings(response.data);

        if (onSave) {
          onSave(response.data);
        }

        handleClose();
      } else {
        message.error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save workflow settings:', error);
      message.error('Error occurred while saving settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form
   */
  const handleReset = async () => {
    if (!workflowId) {
      message.error('No workflow ID provided');
      return;
    }

    try {
      setLoading(true);

      const response = await workflowSettingsService.resetSettings(workflowId);

      if (response.success && response.data) {
        message.success('Settings reset to default values');
        setSettings(response.data);
        form.setFieldsValue({
          name: response.data.name,
          webhookUrl: response.data.webhookUrl,
          enabled: response.data.enabled ?? true,
        });
      } else {
        message.error(response.error || 'Failed to reset settings');
      }
    } catch (error) {
      console.error('Failed to reset workflow settings:', error);
      message.error('Error occurred while resetting settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Close modal
   */
  const handleClose = () => {
    form.resetFields();
    setValidationErrors(null);
    if (onClose) {
      onClose();
    }
  };

  /**
   * Handle form value changes
   * Implement real-time validation
   */
  const handleFormChange = async (
    changedValues: Partial<WorkflowSettingsFormData>,
    allValues: WorkflowSettingsFormData
  ) => {
    // Clear previous validation errors
    if (validationErrors) {
      setValidationErrors(null);
    }

    // Real-time validation: validate when user inputs
    try {
      // Only validate when all required fields have values
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

  // Load settings when modal opens
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

  // Custom footer buttons
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
      Reset
    </button>,
    <button
      key='cancel'
      type='button'
      className='ant-btn ant-btn-default'
      onClick={handleClose}
      disabled={loading}
    >
      Cancel
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
      {loading ? 'Saving...' : validating ? 'Validating...' : 'Save'}
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
      destroyOnHidden
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
          label='Workflow Name'
          name='name'
          rules={[
            { required: true, message: 'Please enter workflow name' },
            { min: 2, message: 'Workflow name must be at least 2 characters' },
            { max: 50, message: 'Workflow name cannot exceed 50 characters' },
          ]}
          validateStatus={
            validationErrors?.errors.some(e => e.field === 'name')
              ? 'error'
              : ''
          }
          help={validationErrors?.errors.find(e => e.field === 'name')?.message}
        >
          <Input
            placeholder='Please enter workflow name'
            maxLength={50}
            showCount
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label='Webhook URL'
          name='webhookUrl'
          rules={[
            { required: true, message: 'Please enter a webhook URL' },
            { type: 'url', message: 'Please enter a valid URL' },
            {
              validator: (_, value) => {
                if (value === 'https://api.example.com/reddit-webhook') {
                  return Promise.reject(
                    new Error(
                      'Please replace the default URL with your actual webhook URL'
                    )
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          validateStatus={
            validationErrors?.errors.some(e => e.field === 'webhookUrl')
              ? 'error'
              : ''
          }
          help={
            validationErrors?.errors.find(e => e.field === 'webhookUrl')
              ?.message
          }
          extra={
            <div style={{ marginTop: '8px' }}>
              <div style={{ marginBottom: '4px', color: '#666' }}>
                📝 Configuration Guide: Enter your n8n webhook URL
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                💡 Example format: https://your-n8n-instance.com/webhook/reddit
              </div>
              <div
                style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}
              >
                🔗 How to get: Create a webhook node in n8n and copy its URL
              </div>
            </div>
          }
        >
          <Input
            placeholder='https://your-n8n-instance.com/webhook/reddit'
            disabled={loading}
            style={{
              fontFamily: 'monospace',
              borderColor:
                form.getFieldValue('webhookUrl') ===
                'https://api.example.com/reddit-webhook'
                  ? '#ff4d4f'
                  : undefined,
            }}
          />
        </Form.Item>

        <Form.Item
          label='Enable Workflow'
          name='enabled'
          valuePropName='checked'
          extra='Workflow will start processing requests when enabled'
        >
          <Switch
            checkedChildren='Enabled'
            unCheckedChildren='Disabled'
            disabled={loading}
          />
        </Form.Item>

        {/* Display settings info */}
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
            <div>
              Created:{' '}
              {settings.createdAt
                ? new Date(settings.createdAt).toLocaleString()
                : 'N/A'}
            </div>
            <div>
              Updated:{' '}
              {settings.updatedAt
                ? new Date(settings.updatedAt).toLocaleString()
                : 'N/A'}
            </div>
          </div>
        )}

        {/* Display validation warnings */}
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
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Notes:</div>
            {validationErrors.warnings.map((warning, index) => (
              <div key={index}>• {warning.message}</div>
            ))}
          </div>
        )}
      </Form>
    </Modal>
  );
};

// Default export
export default WorkflowSettingsModal;

// Named export
export { WorkflowSettingsModal };
