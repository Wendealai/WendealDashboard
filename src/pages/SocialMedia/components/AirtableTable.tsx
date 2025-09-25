/**
 * TK Viral Extract AirtableTable Component
 * 显示TK Viral Extract数据的完整表格组件（基于Smart Opportunities架构）
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  Table,
  Card,
  Space,
  Typography,
  Empty,
  Alert,
  Tag,
  message,
  Tooltip,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Progress,
} from 'antd';
import {
  DatabaseOutlined,
  GlobalOutlined,
  VideoCameraOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  UploadOutlined,
  ClearOutlined,
  CloseOutlined,
  MailOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type { AirtableTableProps, ViralContentRecord } from '../types';
import { TKViralExtractAirtableService } from '@/services/tkViralExtractAirtableService';

const { Title, Text, Paragraph } = Typography;

/**
 * TK Viral Extract AirtableTable组件
 * 完整功能的表格组件，包含导出导入CSV、清空数据等功能
 */
const AirtableTable: React.FC<AirtableTableProps> = ({
  data,
  loading,
  error,
  onDataChange,
  airtableService,
  onSort,
  onPageChange,
}) => {
  const { t } = useTranslation();

  // 编辑状态管理
  const [editingRecord, setEditingRecord] = useState<ViralContentRecord | null>(
    null
  );
  const [editForm] = Form.useForm();

  // 确保Form组件已连接
  useEffect(() => {
    if (editForm) {
      console.log('AirtableTable: Edit form instance connected');
    }
  }, [editForm]);

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 导入导出相关状态
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cancelImport, setCancelImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [clearProgress, setClearProgress] = useState({ current: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const cancelImportRef = useRef(false);

  /**
   * 格式化文件大小
   */
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * 格式化日期
   */
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * 获取病毒得分标签颜色
   */
  const getViralScoreColor = useCallback((score: number) => {
    if (score >= 90) return 'red';
    if (score >= 80) return 'orange';
    if (score >= 70) return 'gold';
    if (score >= 60) return 'green';
    return 'blue';
  }, []);

  /**
   * 获取平台标签颜色
   */
  const getPlatformColor = useCallback((platform: string | undefined) => {
    if (!platform || typeof platform !== 'string') {
      return 'default';
    }
    switch (platform.toLowerCase()) {
      case 'tiktok':
        return 'red';
      case 'instagram':
        return 'purple';
      case 'youtube':
        return 'red';
      case 'twitter':
        return 'blue';
      case 'facebook':
        return 'blue';
      default:
        return 'default';
    }
  }, []);

  // Notion data detection removed - using Airtable only

  /**
   * 表格列定义
   */
  const columns: ColumnsType<ViralContentRecord> = useMemo(() => {
    // TK Viral Extract表格列定义 - 基于Smart Opportunities架构
    return [
      {
        title: 'Title',
        dataIndex: ['fields', 'title'],
        key: 'title',
        width: 250,
        render: (text: string) => (
          <Text strong style={{ fontSize: '13px' }}>
            {text || 'N/A'}
          </Text>
        ),
      },
      {
        title: 'Content',
        dataIndex: ['fields', 'content'],
        key: 'content',
        width: 300,
        render: (text: string) => (
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
            style={{ fontSize: '12px', margin: 0 }}
          >
            {text || 'N/A'}
          </Paragraph>
        ),
      },
      {
        title: 'Platform',
        dataIndex: ['fields', 'platform'],
        key: 'platform',
        width: 120,
        render: (text: string) => (
          <Tag color='blue' style={{ fontSize: '12px' }}>
            {text || 'N/A'}
          </Tag>
        ),
      },
      {
        title: 'Views',
        dataIndex: ['fields', 'views'],
        key: 'views',
        width: 100,
        render: (views: number) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <GlobalOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
            <Text style={{ fontSize: '12px' }}>
              {views?.toLocaleString() || '0'}
            </Text>
          </div>
        ),
      },
      {
        title: 'Likes',
        dataIndex: ['fields', 'likes'],
        key: 'likes',
        width: 100,
        render: (likes: number) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MailOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
            <Text style={{ fontSize: '12px' }}>
              {likes?.toLocaleString() || '0'}
            </Text>
          </div>
        ),
      },
      {
        title: 'Shares',
        dataIndex: ['fields', 'shares'],
        key: 'shares',
        width: 100,
        render: (shares: number) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShopOutlined style={{ fontSize: '12px', color: '#faad14' }} />
            <Text style={{ fontSize: '12px' }}>
              {shares?.toLocaleString() || '0'}
            </Text>
          </div>
        ),
      },
      {
        title: 'Creator',
        dataIndex: ['fields', 'creator'],
        key: 'creator',
        width: 150,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
        ),
      },
      {
        title: 'Viral Score',
        dataIndex: ['fields', 'viralScore'],
        key: 'viralScore',
        width: 100,
        render: (score: number) => (
          <Tag color='green' style={{ fontSize: '12px' }}>
            {score || '0'}
          </Tag>
        ),
      },
      {
        title: 'URL',
        dataIndex: ['fields', 'url'],
        key: 'url',
        width: 80,
        render: (text: string) =>
          text ? (
            <Tooltip title='Visit URL'>
              <LinkOutlined
                style={{
                  fontSize: '14px',
                  color: '#1890ff',
                  cursor: 'pointer',
                }}
                onClick={() => window.open(text, '_blank')}
              />
            </Tooltip>
          ) : (
            <Text style={{ fontSize: '12px', color: '#999' }}>N/A</Text>
          ),
      },
      {
        title: 'Contact Info',
        dataIndex: ['fields', 'contactInfo'],
        key: 'contactInfo',
        width: 150,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
        ),
      },
      {
        title: 'Created Time',
        dataIndex: 'createdTime',
        key: 'createdTime',
        width: 120,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>
            {text ? new Date(text).toLocaleDateString('en-US') : 'N/A'}
          </Text>
        ),
      },
    ];
  }, []);

  /**
   * 导出CSV - 基于Smart Opportunities架构
   */
  const handleExportCSV = useCallback(() => {
    if (data.length === 0) return;

    const csvContent = [
      // 表头 - 与TK Viral Extract表格字段匹配
      [
        'Title',
        'Content',
        'Platform',
        'Views',
        'Likes',
        'Shares',
        'Creator',
        'Viral Score',
        'URL',
        'Contact Info',
        'Created Time',
      ],
      // 数据行
      ...data.map(record => [
        record.fields?.title || '',
        record.fields?.content || '',
        record.fields?.platform || '',
        record.fields?.views || 0,
        record.fields?.likes || 0,
        record.fields?.shares || 0,
        record.fields?.creator || '',
        record.fields?.viralScore || 0,
        record.fields?.url || '',
        record.fields?.contactInfo || '',
        record.createdTime || '',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tk_viral_extract.csv';
    link.click();

    message.success('CSV文件已导出！');
  }, [data]);

  /**
   * 处理编辑记录
   */
  const handleEdit = useCallback(
    (record: ViralContentRecord) => {
      setEditingRecord(record);
      editForm.setFieldsValue({
        Title: record.fields?.title || '',
        Content: record.fields?.content || '',
        Platform: record.fields?.platform || '',
        Views: record.fields?.views || 0,
        Likes: record.fields?.likes || 0,
        Shares: record.fields?.shares || 0,
        Creator: record.fields?.creator || '',
        URL: record.fields?.url || '',
        Contact: record.fields?.contactInfo || '',
      });
    },
    [editForm]
  );

  /**
   * 处理保存编辑
   */
  const handleSaveEdit = useCallback(async () => {
    try {
      const values = await editForm.validateFields();

      if (!editingRecord || !airtableService) {
        console.error('No editing record or airtable service available');
        return;
      }

      console.log('Saving edited record:', editingRecord.id, values);

      // 准备更新数据 - 使用实际的Airtable字段名
      const updateData = {
        title: values.Title,
        content: values.Content,
        platform: values.Platform,
        views: values.Views,
        likes: values.Likes,
        shares: values.Shares,
        creator: values.Creator,
        url: values.URL,
        contactInfo: values.Contact,
      };

      // 更新Airtable记录
      const updatedRecord = await airtableService.updateRecord(
        editingRecord.id,
        updateData
      );

      console.log('Record updated successfully:', updatedRecord);

      // 更新本地数据
      const updatedData = data.map(record =>
        record.id === editingRecord.id ? updatedRecord : record
      );

      onDataChange?.(updatedData);

      // 关闭编辑对话框
      setEditingRecord(null);
      editForm.resetFields();

      message.success('记录更新成功！');
    } catch (error) {
      console.error('Failed to save edit:', error);
      message.error('更新失败，请重试');
    }
  }, [editingRecord, editForm, airtableService, data, onDataChange]);

  /**
   * 处理取消编辑
   */
  const handleCancelEdit = useCallback(() => {
    setEditingRecord(null);
    editForm.resetFields();
  }, [editForm]);

  /**
   * 处理表格变化（排序、分页）
   */
  const handleTableChange = useCallback(
    (pagination: any, filters: any, sorter: any) => {
      // 更新分页状态
      setCurrentPage(pagination.current);
      setPageSize(pagination.pageSize);

      // 处理排序
      if (sorter.field && sorter.order) {
        const direction = sorter.order === 'ascend' ? 'asc' : 'desc';
        onSort?.(sorter.field, direction);
      }

      // 处理分页变化
      onPageChange?.(pagination.current, pagination.pageSize);
    },
    [onSort, onPageChange]
  );

  /**
   * 刷新数据
   */
  const handleRefresh = useCallback(async () => {
    if (!airtableService) return;

    try {
      const allRecords = await airtableService.getAllRecords({});
      onDataChange?.(allRecords);
    } catch (error) {
      console.error('Failed to refresh viral content data:', error);
    }
  }, [airtableService, onDataChange]);

  return (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          <span>TikTok 内容结果</span>
          <Text type='secondary' style={{ fontSize: '12px' }}>
            ({data.length} 条结果)
          </Text>
          <Tag color='blue'>Airtable</Tag>
        </Space>
      }
      extra={
        <Space>
          <Button
            type='text'
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
            size='small'
            disabled={loading || data.length === 0}
          >
            Export CSV
          </Button>
          <Button
            type='default'
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading || false}
            size='small'
          >
            Refresh
          </Button>
        </Space>
      }
      size='small'
      style={{ height: '100%' }}
    >
      {error ? (
        <Alert
          message='Error loading viral content data'
          description={error}
          type='error'
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {data.length === 0 && !loading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='未找到病毒内容。请调整搜索参数后重试。'
        />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          rowKey='id'
          loading={loading || false}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: data.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total} items`,
          }}
          onChange={handleTableChange}
          size='small'
          scroll={{ x: 1200, y: 'calc(100vh - 300px)' }}
          style={{ marginTop: 16 }}
        />
      )}

      {/* 编辑对话框 */}
      <Modal
        title='编辑病毒内容'
        open={!!editingRecord}
        onOk={handleSaveEdit}
        onCancel={handleCancelEdit}
        width={600}
        okText='保存'
        cancelText='取消'
      >
        <Form form={editForm} layout='vertical' style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='Title'
                label='Title'
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder='请输入内容标题' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='Platform'
                label='Platform'
                rules={[{ required: true, message: '请选择平台' }]}
              >
                <Select placeholder='选择平台'>
                  <Select.Option value='TikTok'>TikTok</Select.Option>
                  <Select.Option value='Douyin'>Douyin</Select.Option>
                  <Select.Option value='Bilibili'>Bilibili</Select.Option>
                  <Select.Option value='WeChat Video'>
                    WeChat Video
                  </Select.Option>
                  <Select.Option value='Kuaishou'>Kuaishou</Select.Option>
                  <Select.Option value='Weibo'>Weibo</Select.Option>
                  <Select.Option value='Other'>Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='Content' label='Content'>
            <Input.TextArea placeholder='请输入内容描述' rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='Views' label='Views'>
                <InputNumber
                  placeholder='Views'
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='Likes' label='Likes'>
                <InputNumber
                  placeholder='Likes'
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='Shares' label='Shares'>
                <InputNumber
                  placeholder='Shares'
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='Creator' label='Creator'>
                <Input placeholder='Creator nickname' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='Contact' label='Contact Info'>
                <Input placeholder='Contact information' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='URL' label='URL'>
            <Input placeholder='https://...' />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AirtableTable;
