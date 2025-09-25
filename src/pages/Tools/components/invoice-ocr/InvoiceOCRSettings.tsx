import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Switch,
  Select,
  Alert,
} from 'antd';
import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import ErrorModal from '@/components/common/ErrorModal';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { invoiceOCRService } from '../../../../services/invoiceOCRService';

const { Title } = Typography;
const { TextArea } = Input;

/**
 * Invoice OCR 设置组件接口
 */
interface InvoiceOCRSettingsProps {
  className?: string;
}

/**
 * Invoice OCR 配置数据接口
 */
interface InvoiceOCRConfig {
  workflowName: string;
  webhookUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  enableNotifications: boolean;
  outputFormat: 'json' | 'csv' | 'excel';
  description?: string;
}

/**
 * Invoice OCR 设置组件
 * 提供工作流名称和 Webhook 地址的配置界面
 */
const InvoiceOCRSettings: React.FC<InvoiceOCRSettingsProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const message = useMessage();

  // 确保Form组件已连接
  useEffect(() => {
    if (form) {
      console.log('InvoiceOCRSettings: Form instance connected');
    }
  }, [form]);
  const { isVisible, errorInfo, showError, hideError } = useErrorModal();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<InvoiceOCRConfig>({
    workflowName: 'Invoice OCR Workflow',
    webhookUrl: 'https://n8n.wendealai.com/webhook/invoiceOCR',
    timeout: 30,
    retryAttempts: 3,
    enableNotifications: true,
    outputFormat: 'json',
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'success' | 'error'
  >('unknown');

  /**
   * 组件初始化时加载配置
   */
  useEffect(() => {
    loadConfig();
  }, []);

  /**
   * 加载 Invoice OCR 配置
   */
  const loadConfig = async () => {
    try {
      setLoading(true);
      const savedConfig = await invoiceOCRService.getConfig();
      if (savedConfig) {
        setConfig(savedConfig);
        form.setFieldsValue(savedConfig);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      showError({
        title: t(
          'invoiceOCR.errors.loadConfigFailed',
          'Failed to load configuration'
        ),
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存配置
   */
  const handleSave = async (values: InvoiceOCRConfig) => {
    try {
      setLoading(true);

      // 验证 Webhook URL 格式
      if (values.webhookUrl && !isValidUrl(values.webhookUrl)) {
        showError({
          title: t('invoiceOCR.settings.validation.webhookUrlInvalid'),
          message: 'Please enter a valid webhook URL',
        });
        return;
      }

      await invoiceOCRService.saveConfig(values);
      setConfig(values);
      message.success(t('invoiceOCR.settings.settingsSaved'));

      // 保存后自动测试连接
      if (values.webhookUrl) {
        testConnection(values.webhookUrl);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showError({
        title: t('invoiceOCR.settings.settingsFailed'),
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 测试 Webhook 连接
   */
  const testConnection = async (url?: string) => {
    const testUrl = url || form.getFieldValue('webhookUrl');
    if (!testUrl) {
      message.warning(t('invoiceOCR.settings.validation.webhookUrlRequired'));
      return;
    }

    try {
      setTesting(true);
      const result = await invoiceOCRService.testWebhook(testUrl);

      if (result.success) {
        setConnectionStatus('success');
        message.success(t('invoiceOCR.settings.connectionSuccess'));
      } else {
        setConnectionStatus('error');
        showError({
          title: t('invoiceOCR.settings.connectionFailed'),
          message: result.message || 'Connection test failed',
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      showError({
        title: t('invoiceOCR.settings.connectionFailed'),
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setTesting(false);
    }
  };

  /**
   * 重置配置
   */
  const handleReset = () => {
    form.resetFields();
    setConnectionStatus('unknown');
    message.info(t('invoiceOCR.settings.resetSettings'));
  };

  /**
   * 验证 URL 格式
   */
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  /**
   * 获取连接状态显示
   */
  const getConnectionStatusAlert = () => {
    switch (connectionStatus) {
      case 'success':
        return (
          <Alert
            message={t('invoiceOCR.settings.connectionNormal')}
            description={t('invoiceOCR.settings.connectionSuccess')}
            type='success'
            icon={<CheckCircleOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
          />
        );
      case 'error':
        return (
          <Alert
            message={t('invoiceOCR.settings.connectionFailed')}
            description={t('invoiceOCR.settings.connectionFailedDesc')}
            type='error'
            icon={<ExclamationCircleOutlined />}
            showIcon
            style={{ marginBottom: 16 }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card
      {...(className && { className })}
      title={
        <Space>
          <SettingOutlined />
          <span>{t('invoiceOCR.settings.title')}</span>
        </Space>
      }
      loading={loading}
    >
      {getConnectionStatusAlert()}

      <Form
        form={form}
        layout='vertical'
        onFinish={handleSave}
        initialValues={config}
        autoComplete='off'
      >
        <Title level={5}>{t('invoiceOCR.settings.basicConfig')}</Title>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label={t('invoiceOCR.settings.workflowName')}
              name='workflowName'
              rules={[
                {
                  required: true,
                  message: t(
                    'invoiceOCR.settings.validation.workflowNameRequired'
                  ),
                },
                {
                  min: 2,
                  max: 50,
                  message: t(
                    'invoiceOCR.settings.validation.workflowNameLength'
                  ),
                },
              ]}
            >
              <Input
                placeholder={t(
                  'invoiceOCR.settings.validation.workflowNameRequired'
                )}
                prefix={<SettingOutlined />}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={t('invoiceOCR.settings.outputFormat')}
              name='outputFormat'
              rules={[
                {
                  required: true,
                  message: t('invoiceOCR.settings.selectOutputFormat'),
                },
              ]}
            >
              <Select placeholder={t('invoiceOCR.settings.selectOutputFormat')}>
                <Select.Option value='json'>JSON</Select.Option>
                <Select.Option value='csv'>CSV</Select.Option>
                <Select.Option value='excel'>Excel</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label='Webhook URL'
          name='webhookUrl'
          rules={[
            {
              required: true,
              message: t('invoiceOCR.settings.validation.webhookUrlRequired'),
            },
            {
              validator: (_, value) => {
                if (!value || isValidUrl(value)) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    t('invoiceOCR.settings.validation.webhookUrlInvalid')
                  )
                );
              },
            },
          ]}
          extra={t('invoiceOCR.settings.webhookUrlHelp')}
        >
          <Input
            placeholder='https://your-domain.com/webhook/invoice-ocr'
            suffix={
              <Button
                type='link'
                size='small'
                loading={testing}
                onClick={() => testConnection()}
              >
                {t('invoiceOCR.settings.testConnection')}
              </Button>
            }
          />
        </Form.Item>

        <Form.Item
          label={t('invoiceOCR.settings.description')}
          name='description'
        >
          <TextArea
            rows={3}
            placeholder={t('invoiceOCR.settings.descriptionPlaceholder')}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Divider />

        <Title level={5}>{t('invoiceOCR.settings.advancedConfig')}</Title>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label={t('invoiceOCR.settings.timeout')}
              name='timeout'
              rules={[
                {
                  required: true,
                  message: t('invoiceOCR.settings.validation.timeoutRequired'),
                },
                {
                  type: 'number',
                  min: 10,
                  max: 300,
                  message: t('invoiceOCR.settings.validation.timeoutRange'),
                },
              ]}
            >
              <Input
                type='number'
                placeholder='30'
                addonAfter={t('invoiceOCR.settings.seconds')}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label={t('invoiceOCR.settings.retryAttempts')}
              name='retryAttempts'
              rules={[
                {
                  required: true,
                  message: t(
                    'invoiceOCR.settings.validation.retryAttemptsRequired'
                  ),
                },
                {
                  type: 'number',
                  min: 0,
                  max: 10,
                  message: t(
                    'invoiceOCR.settings.validation.retryAttemptsRange'
                  ),
                },
              ]}
            >
              <Input
                type='number'
                placeholder='3'
                addonAfter={t('invoiceOCR.settings.times')}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label={t('invoiceOCR.settings.enableNotifications')}
              name='enableNotifications'
              valuePropName='checked'
            >
              <Switch
                checkedChildren={t('invoiceOCR.settings.enabled')}
                unCheckedChildren={t('invoiceOCR.settings.disabled')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={t('invoiceOCR.settings.apiKey')}
          name='apiKey'
          extra={t('invoiceOCR.settings.apiKeyHelp')}
        >
          <Input.Password
            placeholder={t('invoiceOCR.settings.apiKeyPlaceholder')}
            visibilityToggle
          />
        </Form.Item>

        <Divider />

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              {t('invoiceOCR.settings.reset')}
            </Button>

            <Button
              type='primary'
              htmlType='submit'
              icon={<SaveOutlined />}
              loading={loading}
            >
              {t('invoiceOCR.settings.saveConfig')}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <ErrorModal
        visible={isVisible}
        onClose={hideError}
        title={errorInfo?.title || ''}
        message={errorInfo?.message || ''}
        details={errorInfo?.details}
      />
    </Card>
  );
};

export default InvoiceOCRSettings;
