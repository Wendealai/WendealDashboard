/**
 * InputForm Component
 * Smart Opportunities参数输入表单组件
 */

import React, { useCallback, useEffect } from 'react';
import { Form, Input, Button, Space, Card, Typography } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';
import type {
  InputFormProps,
  WorkflowParameters,
} from '@/types/smartOpportunities';

/**
 * InputFormProps扩展接口，添加iframe相关属性
 */
interface ExtendedInputFormProps extends InputFormProps {
  showIframe?: boolean;
  iframeSrc?: string;
  iframeTitle?: string;
}

const { Title, Text } = Typography;
const { Item } = Form;

/**
 * InputForm组件
 * 处理Smart Opportunities工作流的输入参数
 */
const InputForm: React.FC<ExtendedInputFormProps> = ({
  value,
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  showIframe = false,
  iframeSrc = 'https://nocodb.wendealai.com/dashboard/#/nc/view/24b9c8b5-ab0a-4e84-9789-24996ce17822',
  iframeTitle = 'Business Opportunity Dashboard',
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const message = useMessage();

  // 确保Form组件已连接
  useEffect(() => {
    if (form) {
      console.log('InformationDashboard InputForm: Form instance connected');
    }
  }, [form]);

  /**
   * 处理表单值变化
   */
  const handleFormChange = useCallback(
    (_: any, allValues: WorkflowParameters) => {
      // 更新父组件的状态
      onChange(allValues);
    },
    [onChange]
  );

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(
    async (values: WorkflowParameters) => {
      console.log('InputForm handleSubmit called with values:', values);
      try {
        // Ant Design已经处理了表单验证，这里只需要清理输入值
        const cleanedValues: WorkflowParameters = {
          industry: values.industry?.trim() || '',
          city: values.city?.trim() || '',
          country: values.country?.trim() || '',
        };

        console.log('Calling onSubmit with cleaned values:', cleanedValues);
        await onSubmit(cleanedValues);
        console.log('onSubmit completed successfully');
      } catch (error) {
        console.error('Form submission error:', error);
        message.error('提交失败，请重试');
      }
    },
    [onSubmit]
  );

  /**
   * 行业领域选项
   */
  const industryOptions = [
    { label: '理发店 (Barber Shop)', value: 'barber' },
    { label: '房地产经纪 (Real Estate Agency)', value: 'real estate agency' },
    { label: '咖啡店 (Coffee Shop)', value: 'coffee shop' },
    { label: '健身房 (Gym)', value: 'gym' },
    { label: '餐厅 (Restaurant)', value: 'restaurant' },
    { label: '零售店 (Retail Store)', value: 'retail store' },
    { label: '美容院 (Beauty Salon)', value: 'beauty salon' },
    { label: '咨询公司 (Consulting Firm)', value: 'consulting firm' },
    { label: '教育培训 (Education)', value: 'education' },
    { label: '医疗诊所 (Medical Clinic)', value: 'medical clinic' },
  ];

  /**
   * Country options - English only
   */
  const countryOptions = [
    { label: 'Australia', value: 'Australia' },
    { label: 'United States', value: 'United States' },
    { label: 'Canada', value: 'Canada' },
    { label: 'United Kingdom', value: 'United Kingdom' },
    { label: 'New Zealand', value: 'New Zealand' },
  ];

  return (
    <Card
      title={
        <Space>
          <SendOutlined />
          <span>Workflow Parameters</span>
        </Space>
      }
      size='small'
      style={{ height: '100%' }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={value}
        onValuesChange={handleFormChange}
        onFinish={handleSubmit}
        disabled={disabled || loading}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 4 }}>
          {/* 一行布局 */}
          <Space size='small' style={{ width: '100%', flexWrap: 'wrap' }}>
            {/* Industry Input */}
            <div
              style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text
                strong
                style={{
                  marginRight: '12px',
                  marginBottom: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Industry <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
              <Item
                name='industry'
                rules={[{ required: true, message: 'Please enter industry' }]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <Input
                  placeholder='e.g., barber, real estate agency, coffee shop'
                  style={{ height: '32px' }}
                />
              </Item>
            </div>

            {/* City Input */}
            <div
              style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text
                strong
                style={{
                  marginRight: '12px',
                  marginBottom: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                City <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
              <Item
                name='city'
                rules={[{ required: true, message: 'Please enter city' }]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <Input
                  placeholder='e.g., New York, London, Sydney'
                  style={{ height: '32px' }}
                />
              </Item>
            </div>

            {/* Country Selection */}
            <div
              style={{
                flex: 1,
                minWidth: '150px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text
                strong
                style={{
                  marginRight: '12px',
                  marginBottom: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Country <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
              <Item
                name='country'
                rules={[{ required: true, message: 'Please select country' }]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <select
                  title='Select Country'
                  aria-label='Country Selection'
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    height: '32px',
                  }}
                >
                  <option value=''>Select Country</option>
                  {countryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Item>
            </div>

            {/* Start Workflow Button */}
            <div
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Button
                type='default'
                htmlType='submit'
                loading={loading}
                disabled={disabled}
                style={{
                  height: '32px',
                  marginLeft: '8px',
                  backgroundColor: '#f5f5f5',
                  borderColor: '#d9d9d9',
                  color: '#666',
                }}
              >
                {loading ? 'Processing...' : 'Start Workflow'}
              </Button>
            </div>
          </Space>
        </div>

        {/* Iframe Dashboard - 显示在输入框下方 */}
        {showIframe && (
          <div
            style={{
              marginTop: '16px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              overflow: 'hidden',
              height: '1200px',
              backgroundColor: '#fafafa',
            }}
          >
            <iframe
              src={iframeSrc}
              width='100%'
              height='100%'
              style={{ border: 'none' }}
              title={iframeTitle}
            />
          </div>
        )}
      </Form>
    </Card>
  );
};

export default InputForm;
