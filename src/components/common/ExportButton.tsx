import React, { useState } from 'react';
import {
  Button,
  Dropdown,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import ExportUtils, {
  type ExportColumn,
  type ExportOptions,
} from '@/utils/export';

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename?: string;
  title?: string;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  onExportStart?: () => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (error: Error) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  columns,
  filename = 'export',
  title,
  disabled = false,
  size = 'middle',
  type = 'default',
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 快速导出菜单项
  const quickExportItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: (
        <Space>
          <FileExcelOutlined style={{ color: '#52c41a' }} />
          导出为Excel
        </Space>
      ),
      onClick: () => handleQuickExport('excel'),
    },
    {
      key: 'pdf',
      label: (
        <Space>
          <FilePdfOutlined style={{ color: '#ff4d4f' }} />
          导出为PDF
        </Space>
      ),
      onClick: () => handleQuickExport('pdf'),
    },
    {
      key: 'csv',
      label: (
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          导出为CSV
        </Space>
      ),
      onClick: () => handleQuickExport('csv'),
    },
    {
      type: 'divider',
    },
    {
      key: 'custom',
      label: '自定义导出...',
      onClick: () => setModalVisible(true),
    },
  ];

  // 快速导出处理
  const handleQuickExport = async (format: 'excel' | 'pdf' | 'csv') => {
    if (!data || data.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    try {
      setLoading(true);
      onExportStart?.();

      const options: ExportOptions = {
        filename,
        title,
        columns,
        data,
        format,
      };

      await ExportUtils.export(options);
      message.success(`${format.toUpperCase()}文件导出成功`);
      onExportComplete?.(format);
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败，请重试');
      onExportError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  // 自定义导出处理
  const handleCustomExport = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      onExportStart?.();

      // 过滤选中的列
      const selectedColumns = values.columns
        ? columns.filter(col => values.columns.includes(col.key))
        : columns;

      const options: ExportOptions = {
        filename: values.filename || filename,
        title: values.title || title,
        columns: selectedColumns,
        data,
        format: values.format,
      };

      await ExportUtils.export(options);
      message.success(`${values.format.toUpperCase()}文件导出成功`);
      onExportComplete?.(values.format);
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败，请重试');
      onExportError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  // 取消自定义导出
  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  return (
    <>
      <Dropdown
        menu={{ items: quickExportItems }}
        trigger={['click']}
        disabled={disabled || loading}
      >
        <Button
          type={type}
          size={size}
          icon={<DownloadOutlined />}
          loading={loading}
          disabled={disabled}
        >
          导出数据
        </Button>
      </Dropdown>

      <Modal
        title='自定义导出'
        open={modalVisible}
        onOk={handleCustomExport}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={500}
      >
        <Form
          form={form}
          layout='vertical'
          initialValues={{
            format: 'excel',
            filename,
            title,
            columns: columns.map(col => col.key),
          }}
        >
          <Form.Item
            name='format'
            label='导出格式'
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Select>
              <Select.Option value='excel'>
                <Space>
                  <FileExcelOutlined style={{ color: '#52c41a' }} />
                  Excel (.xlsx)
                </Space>
              </Select.Option>
              <Select.Option value='pdf'>
                <Space>
                  <FilePdfOutlined style={{ color: '#ff4d4f' }} />
                  PDF (.pdf)
                </Space>
              </Select.Option>
              <Select.Option value='csv'>
                <Space>
                  <FileTextOutlined style={{ color: '#1890ff' }} />
                  CSV (.csv)
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name='filename'
            label='文件名'
            rules={[{ required: true, message: '请输入文件名' }]}
          >
            <Input placeholder='请输入文件名（不含扩展名）' />
          </Form.Item>

          <Form.Item name='title' label='标题'>
            <Input placeholder='请输入导出文件的标题（可选）' />
          </Form.Item>

          <Form.Item
            name='columns'
            label='导出列'
            rules={[{ required: true, message: '请选择要导出的列' }]}
          >
            <Select
              mode='multiple'
              placeholder='请选择要导出的列'
              optionLabelProp='label'
            >
              {columns.map(col => (
                <Select.Option key={col.key} value={col.key} label={col.title}>
                  {col.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ExportButton;
