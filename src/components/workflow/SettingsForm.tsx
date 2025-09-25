import React, { useState, useEffect } from 'react';
import { Form, Space, Alert } from 'antd';
import { Input, Button } from '../common';
import type { WorkflowSettings } from '../../types/workflow';

export interface SettingsFormProps {
  /** Initial settings values */
  initialValues?: Partial<WorkflowSettings>;
  /** Form submission handler */
  onSubmit?: (values: WorkflowSettings) => void | Promise<void>;
  /** Form cancel handler */
  onCancel?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Form validation mode */
  validateTrigger?: 'onChange' | 'onBlur' | 'onSubmit';
  /** Show reset button */
  showReset?: boolean;
  /** Reset handler */
  onReset?: () => void;
}

/**
 * SettingsForm component for editing workflow settings
 * Provides form interface with validation for webhook URL and workflow name
 */
const SettingsForm: React.FC<SettingsFormProps> = ({
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  error,
  success,
  validateTrigger = 'onChange',
  showReset = true,
  onReset,
}) => {
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Partial<WorkflowSettings>>({
    webhookUrl: '',
    name: '',
    enabled: true,
    ...initialValues,
  });
  const [validationErrors, setValidationErrors] = useState<{
    webhookUrl?: string;
    name?: string;
  }>({});

  // Update form when initial values change
  useEffect(() => {
    const newValues = {
      webhookUrl: '',
      name: '',
      enabled: true,
      ...initialValues,
    };
    setFormValues(newValues);
    form.setFieldsValue(newValues);
  }, [initialValues, form]);

  /**
   * Validate webhook URL format
   */
  const validateWebhookUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Webhook URL is required';
    }

    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return 'URL must use HTTP or HTTPS protocol';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  };

  /**
   * Validate workflow name
   */
  const validateWorkflowName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Workflow name is required';
    }
    if (name.length < 2) {
      return 'Workflow name must be at least 2 characters';
    }
    if (name.length > 50) {
      return 'Workflow name must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return 'Workflow name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return null;
  };

  /**
   * Handle input value changes with validation
   */
  const handleInputChange = (field: keyof WorkflowSettings, value: string) => {
    const newValues = { ...formValues, [field]: value };
    setFormValues(newValues);

    // Real-time validation
    if (validateTrigger === 'onChange') {
      const errors = { ...validationErrors };

      if (field === 'webhookUrl') {
        const error = validateWebhookUrl(value);
        if (error) {
          errors.webhookUrl = error;
        } else {
          delete errors.webhookUrl;
        }
      } else if (field === 'name') {
        const error = validateWorkflowName(value);
        if (error) {
          errors.name = error;
        } else {
          delete errors.name;
        }
      }

      setValidationErrors(errors);
    }
  };

  /**
   * Handle input blur for validation
   */
  const handleInputBlur = (field: keyof WorkflowSettings) => {
    if (validateTrigger === 'onBlur') {
      const value = formValues[field] as string;
      const errors = { ...validationErrors };

      if (field === 'webhookUrl') {
        const error = validateWebhookUrl(value);
        if (error) {
          errors.webhookUrl = error;
        } else {
          delete errors.webhookUrl;
        }
      } else if (field === 'name') {
        const error = validateWorkflowName(value);
        if (error) {
          errors.name = error;
        } else {
          delete errors.name;
        }
      }

      setValidationErrors(errors);
    }
  };

  /**
   * Validate all form fields
   */
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    const webhookError = validateWebhookUrl(formValues.webhookUrl || '');
    if (webhookError) {
      errors.webhookUrl = webhookError;
    }

    const nameError = validateWorkflowName(formValues.name || '');
    if (nameError) {
      errors.name = nameError;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (validateTrigger === 'onSubmit') {
      if (!validateForm()) {
        return;
      }
    } else if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (onSubmit) {
      const settings: WorkflowSettings = {
        webhookUrl: formValues.webhookUrl || '',
        name: formValues.name || '',
        enabled: formValues.enabled ?? true,
      };

      await onSubmit(settings);
    }
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    const resetValues = {
      webhookUrl: '',
      name: '',
      enabled: true,
    };

    setFormValues(resetValues);
    setValidationErrors({});
    form.setFieldsValue(resetValues);

    if (onReset) {
      onReset();
    }
  };

  /**
   * Check if form has validation errors
   */
  const hasErrors = Object.keys(validationErrors).length > 0;

  /**
   * Check if form values are valid for submission
   */
  const isFormValid =
    !hasErrors && formValues.webhookUrl?.trim() && formValues.name?.trim();

  return (
    <div style={{ width: '100%' }}>
      {/* Status Messages */}
      {error && (
        <Alert
          message='Error'
          description={error}
          type='error'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {success && (
        <Alert
          message='Success'
          description={success}
          type='success'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout='vertical'
        initialValues={formValues}
        disabled={loading}
      >
        {/* Webhook URL Input */}
        <Form.Item
          label='Webhook URL'
          required
          validateStatus={validationErrors.webhookUrl ? 'error' : ''}
          help={validationErrors.webhookUrl}
        >
          <Input
            placeholder='https://example.com/webhook'
            value={formValues.webhookUrl}
            onChange={value => handleInputChange('webhookUrl', value)}
            onBlur={() => handleInputBlur('webhookUrl')}
            error={validationErrors.webhookUrl || ''}
            disabled={loading}
            required
          />
        </Form.Item>

        {/* Workflow Name Input */}
        <Form.Item
          label='Workflow Name'
          required
          validateStatus={validationErrors.name ? 'error' : ''}
          help={validationErrors.name}
        >
          <Input
            placeholder='Enter workflow name'
            value={formValues.name}
            onChange={value => handleInputChange('name', value)}
            onBlur={() => handleInputBlur('name')}
            error={validationErrors.name || ''}
            disabled={loading}
            required
            maxLength={50}
          />
        </Form.Item>

        {/* Form Actions */}
        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space>
            <Button
              type='primary'
              onClick={handleSubmit}
              loading={loading}
              disabled={!isFormValid}
            >
              Save Settings
            </Button>

            {onCancel && (
              <Button onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}

            {showReset && (
              <Button onClick={handleReset} disabled={loading}>
                Reset
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SettingsForm;
export { SettingsForm };
