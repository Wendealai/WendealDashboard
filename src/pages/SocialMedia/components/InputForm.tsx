/**
 * Social Media InputForm Component
 * TK Viral Extract参数输入表单组件
 */

import React, { useCallback, useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import type { WorkflowParameters } from '../types';

const { Item } = Form;

/**
 * InputForm组件
 * 处理TK Viral Extract工作流的输入参数
 */
const InputForm: React.FC<{
  value: WorkflowParameters;
  onSubmit: (params: WorkflowParameters) => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
  disabled?: boolean;
}> = ({ value, onSubmit, onRefresh, loading = false, disabled = false }) => {
  const [form] = Form.useForm();
  const message = useMessage();

  // 确保Form组件已连接
  useEffect(() => {
    if (form) {
      console.log('InputForm: Form instance connected');
    }
  }, [form]);

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(
    async (values: WorkflowParameters) => {
      console.log(
        'TKViralExtract InputForm handleSubmit called with values:',
        values
      );
      try {
        // Ant Design已经处理了表单验证，这里只需要清理输入值
        const cleanedValues: WorkflowParameters = {
          keyword: values.keyword?.trim() || '',
          offset: values.offset?.trim() || '0',
          count: values.count?.trim() || '20',
          sortMethod: values.sortMethod || '0',
          timeRange: values.timeRange || '0',
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
   * 排序方法选项
   */
  const sortOptions = [
    { label: '0 - 相关度排序', value: '0' },
    { label: '1 - 最多点赞排序', value: '1' },
  ];

  /**
   * 发布时间选项
   */
  const timeRangeOptions = [
    { label: '0 - 不限制', value: '0' },
    { label: '1 - 最近1天', value: '1' },
    { label: '7 - 最近7天', value: '7' },
    { label: '30 - 最近30天', value: '30' },
    { label: '90 - 最近90天', value: '90' },
    { label: '180 - 最近180天', value: '180' },
  ];

  return (
    <div style={{ width: '100%' }}>
      <Form
        form={form}
        layout='inline'
        initialValues={value}
        onFinish={handleSubmit}
        disabled={disabled || loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* 检索关键词 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '300px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            关键词 <span style={{ color: '#ff4d4f' }}>*</span>
          </span>
          <Item
            name='keyword'
            rules={[{ required: true, message: '请输入检索关键词' }]}
            style={{ marginBottom: 0, flex: 1 }}
          >
            <Input
              placeholder='请输入关键词...'
              style={{ width: '100%', height: '32px', fontSize: '12px' }}
            />
          </Item>
        </div>

        {/* 参数字段 - 横向排列 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              偏移
            </span>
            <Item name='offset' style={{ marginBottom: 0, width: '70px' }}>
              <Input
                placeholder='0'
                style={{ height: '32px', fontSize: '12px', padding: '4px 6px' }}
                type='number'
                min='0'
              />
            </Item>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              数量
            </span>
            <Item name='count' style={{ marginBottom: 0, width: '70px' }}>
              <Input
                placeholder='20'
                style={{ height: '32px', fontSize: '12px', padding: '4px 6px' }}
                type='number'
                min='1'
              />
            </Item>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              排序
            </span>
            <Item name='sortMethod' style={{ marginBottom: 0, width: '120px' }}>
              <select
                title='选择排序方法'
                aria-label='Sort Method Selection'
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: '#fff',
                  height: '32px',
                }}
              >
                <option value=''>排序方法</option>
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Item>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              时间
            </span>
            <Item name='timeRange' style={{ marginBottom: 0, width: '120px' }}>
              <select
                title='选择发布时间范围'
                aria-label='Time Range Selection'
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: '#fff',
                  height: '32px',
                }}
              >
                <option value=''>时间范围</option>
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Item>
          </div>
        </div>

        {/* 按钮组 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: 'auto',
          }}
        >
          {/* 刷新按钮 */}
          <Button
            type='default'
            onClick={onRefresh}
            disabled={disabled || loading}
            style={{
              height: '32px',
              fontSize: '12px',
              padding: '0 16px',
              backgroundColor: '#f5f5f5',
              borderColor: '#d9d9d9',
              color: '#666',
            }}
            icon={<span style={{ fontSize: '12px' }}>🔄</span>}
          >
            刷新
          </Button>

          {/* 执行按钮 */}
          <Button
            type='default'
            htmlType='submit'
            loading={loading}
            disabled={disabled}
            style={{
              height: '32px',
              fontSize: '12px',
              padding: '0 16px',
              backgroundColor: '#f5f5f5',
              borderColor: '#d9d9d9',
              color: '#666',
            }}
            icon={<RocketOutlined />}
          >
            {loading ? '执行中...' : '执行'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default InputForm;
