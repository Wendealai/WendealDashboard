/**
 * 信息数据展示网格组件
 * 提供信息数据的展示、搜索、过滤和管理功能
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Typography,
  Badge,
  Dropdown,
  Menu,
} from 'antd';
import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import ErrorModal from '@/components/common/ErrorModal';
import { useTranslation } from 'react-i18next';
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ExportOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchInformationList,
  selectInformationData,
  selectInformationLoading,
} from '@/store/slices/informationDashboardSlice';
import type { InformationItem, InformationQueryParams } from '../types';

const { Search } = Input;
const { Option } = Select;
const { Text, Paragraph } = Typography;

/**
 * 信息网格组件属性
 */
interface InformationGridProps {
  className?: string;
  onItemSelect?: (item: InformationItem) => void;
  onItemUpdate?: (item: InformationItem) => void;
}

/**
 * 信息网格组件
 */
const InformationGrid: React.FC<InformationGridProps> = memo(
  ({ className, onItemSelect, onItemUpdate }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const informationData = useAppSelector(selectInformationData);
    const loading = useAppSelector(selectInformationLoading);
    const message = useMessage();
    const { isVisible, errorInfo, showError, hideError } = useErrorModal();

    // Remove unused variable
    // const stats = useAppSelector(selectInformationStats);

    // 组件状态
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState<Partial<InformationQueryParams>>({});
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InformationItem | null>(
      null
    );
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm] = Form.useForm();

    // 确保Form组件已连接
    useEffect(() => {
      if (editForm) {
        console.log('InformationGrid: Edit form instance connected');
      }
    }, [editForm]);

    /**
     * 初始化数据加载
     */
    useEffect(() => {
      dispatch(fetchInformationList({}));
    }, [dispatch]);

    /**
     * 搜索和过滤数据
     */
    const handleSearch = useCallback(() => {
      const queryParams: InformationQueryParams = {
        ...(searchText ? { search: searchText } : {}),
        ...filters,
        page: 1,
      };
      dispatch(fetchInformationList(queryParams));
    }, [dispatch, searchText, filters]);

    /**
     * 重置搜索和过滤
     */
    const handleReset = useCallback(() => {
      setSearchText('');
      setFilters({});
      dispatch(fetchInformationList({}));
    }, [dispatch]);

    /**
     * 处理过滤器变化
     */
    const handleFilterChange = useCallback((key: string, value: any) => {
      setFilters(prev => ({
        ...prev,
        [key]: value,
      }));
    }, []);

    /**
     * 查看详情
     */
    const handleViewDetail = useCallback(
      (item: InformationItem) => {
        setSelectedItem(item);
        setDetailModalVisible(true);
        if (onItemSelect) {
          onItemSelect(item);
        }
      },
      [onItemSelect]
    );

    /**
     * 编辑信息
     */
    const handleEdit = useCallback(
      (item: InformationItem) => {
        setSelectedItem(item);
        editForm.setFieldsValue({
          title: item.title,
          content: item.content,
          category: item.category,
          priority: item.priority,
          status: item.status,
          tags: item.tags,
        });
        setEditModalVisible(true);
      },
      [editForm]
    );

    /**
     * 确认编辑
     */
    const handleConfirmEdit = useCallback(async () => {
      if (!selectedItem) return;

      try {
        const values = await editForm.validateFields();
        const updatedItem: InformationItem = {
          ...selectedItem,
          ...values,
          updatedAt: new Date().toISOString(),
        };

        // 这里应该调用更新API
        message.success(t('informationGrid.messages.updateSuccess'), 3);
        setEditModalVisible(false);

        if (onItemUpdate) {
          onItemUpdate(updatedItem);
        }

        // 刷新列表
        handleSearch();
      } catch (error) {
        showError({
          title: t('informationGrid.messages.updateFailed'),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, [selectedItem, editForm, onItemUpdate, handleSearch]);

    /**
     * 删除信息
     */
    const handleDelete = useCallback(
      async (_id: string) => {
        try {
          // 这里应该调用删除API
          message.success(t('informationGrid.messages.deleteSuccess'), 3);
          handleSearch();
        } catch (error) {
          showError({
            title: t('informationGrid.messages.deleteFailed'),
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
      [handleSearch]
    );

    /**
     * 批量删除
     */
    const handleBatchDelete = useCallback(async () => {
      if (selectedRowKeys.length === 0) {
        message.warning(t('informationGrid.messages.selectItemsToDelete'));
        return;
      }

      try {
        // 这里应该调用批量删除API
        message.success(
          t('informationGrid.messages.batchDeleteSuccess', {
            count: selectedRowKeys.length,
          }),
          3
        );
        setSelectedRowKeys([]);
        handleSearch();
      } catch (error) {
        showError({
          title: t('informationGrid.messages.batchDeleteFailed'),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, [selectedRowKeys, handleSearch, message, t]);

    /**
     * 导出数据
     */
    const handleExport = useCallback(() => {
      message.info(t('common.comingSoon'));
    }, [t, message]);

    /**
     * 信息类型颜色映射
     */
    const getTypeColor = useCallback(
      (type: InformationItem['type']): string => {
        switch (type) {
          case 'text':
            return 'blue';
          case 'number':
            return 'green';
          case 'date':
            return 'orange';
          case 'url':
            return 'purple';
          case 'json':
            return 'cyan';
          case 'image':
            return 'magenta';
          default:
            return 'default';
        }
      },
      []
    );

    /**
     * 优先级颜色映射
     */
    const getPriorityColor = useCallback(
      (priority: InformationItem['priority']): string => {
        switch (priority) {
          case 'urgent':
            return 'red';
          case 'high':
            return 'orange';
          case 'medium':
            return 'blue';
          case 'low':
            return 'default';
          default:
            return 'default';
        }
      },
      []
    );

    /**
     * 状态颜色映射
     */
    const getStatusColor = useCallback(
      (status: InformationItem['status']): string => {
        switch (status) {
          case 'active':
            return 'success';
          case 'archived':
            return 'default';
          case 'draft':
            return 'warning';
          default:
            return 'default';
        }
      },
      []
    );

    /**
     * 渲染内容
     */
    const renderContent = useCallback(
      (content: string, type: InformationItem['type']) => {
        switch (type) {
          case 'url':
            return (
              <a href={content} target='_blank' rel='noopener noreferrer'>
                {content.length > 50
                  ? `${content.substring(0, 50)}...`
                  : content}
              </a>
            );
          case 'json':
            try {
              const jsonObj = JSON.parse(content);
              return (
                <Tooltip title={<pre>{JSON.stringify(jsonObj, null, 2)}</pre>}>
                  <Text code>{t('informationGrid.content.jsonData')}</Text>
                </Tooltip>
              );
            } catch {
              return (
                <Text type='danger'>
                  {t('informationGrid.content.invalidJson')}
                </Text>
              );
            }
          case 'date':
            return new Date(content).toLocaleString();
          case 'number':
            return <Text strong>{content}</Text>;
          default:
            return (
              <Paragraph
                ellipsis={{
                  rows: 2,
                  expandable: true,
                  symbol: t('common.more'),
                }}
                style={{ margin: 0 }}
              >
                {content}
              </Paragraph>
            );
        }
      },
      [t]
    );

    /**
     * 表格列定义
     */
    const columns = useMemo(
      () => [
        {
          title: t('informationGrid.columns.title'),
          dataIndex: 'title',
          key: 'title',
          width: 200,
          render: (text: string, record: InformationItem) => (
            <Space direction='vertical' size={0}>
              <Text strong>{text}</Text>
              <Space size={4}>
                <Tag color={getTypeColor(record.type)}>{record.type}</Tag>
                <Tag color={getPriorityColor(record.priority)}>
                  {record.priority}
                </Tag>
              </Space>
            </Space>
          ),
        },
        {
          title: t('informationGrid.columns.content'),
          dataIndex: 'content',
          key: 'content',
          width: 300,
          render: (content: string, record: InformationItem) =>
            renderContent(content, record.type),
        },
        {
          title: t('informationGrid.columns.category'),
          dataIndex: 'category',
          key: 'category',
          width: 120,
          render: (category: string) => <Tag>{category}</Tag>,
        },
        {
          title: t('informationGrid.columns.source'),
          dataIndex: 'source',
          key: 'source',
          width: 120,
        },
        {
          title: t('informationGrid.columns.status'),
          dataIndex: 'status',
          key: 'status',
          width: 80,
          render: (status: InformationItem['status']) => (
            <Tag color={getStatusColor(status)}>
              {t(`informationGrid.status.${status}`)}
            </Tag>
          ),
        },
        {
          title: t('informationGrid.columns.tags'),
          dataIndex: 'tags',
          key: 'tags',
          width: 150,
          render: (tags: string[]) => (
            <Space size={4} wrap>
              {tags?.slice(0, 2).map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
              {tags?.length > 2 && <Tag>+{tags.length - 2}</Tag>}
            </Space>
          ),
        },
        {
          title: t('informationGrid.columns.createdAt'),
          dataIndex: 'createdAt',
          key: 'createdAt',
          width: 150,
          render: (time: string) => new Date(time).toLocaleString(),
        },
        {
          title: t('informationGrid.columns.actions'),
          key: 'actions',
          width: 120,
          fixed: 'right' as const,
          render: (_text: any, record: InformationItem) => (
            <Space size={0}>
              <Tooltip title={t('common.actions.viewDetails')}>
                <Button
                  type='text'
                  icon={<EyeOutlined />}
                  size='small'
                  onClick={() => handleViewDetail(record)}
                />
              </Tooltip>
              <Tooltip title={t('common.actions.edit')}>
                <Button
                  type='text'
                  icon={<EditOutlined />}
                  size='small'
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
              <Popconfirm
                title={t('informationGrid.confirmDelete')}
                onConfirm={() => handleDelete(record.id)}
              >
                <Tooltip title={t('common.actions.delete')}>
                  <Button
                    type='text'
                    icon={<DeleteOutlined />}
                    size='small'
                    danger
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [
        t,
        getTypeColor,
        getPriorityColor,
        getStatusColor,
        renderContent,
        handleViewDetail,
        handleEdit,
        handleDelete,
      ]
    );

    /**
     * 行选择配置
     */
    const rowSelection = useMemo(
      () => ({
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
      }),
      [selectedRowKeys]
    );

    /**
     * 更多操作菜单
     */
    const moreMenu = useMemo(
      () => (
        <Menu>
          <Menu.Item
            key='export'
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            {t('informationGrid.actions.exportData')}
          </Menu.Item>
          <Menu.Item
            key='batchDelete'
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            danger
          >
            {t('informationGrid.actions.batchDelete')}
          </Menu.Item>
        </Menu>
      ),
      [t, handleExport, handleBatchDelete]
    );

    /**
     * 分页变化处理
     */
    const handlePaginationChange = useCallback(
      (page: number, pageSize?: number) => {
        const queryParams: InformationQueryParams = {
          ...(searchText ? { search: searchText } : {}),
          ...filters,
          page,
          pageSize: pageSize || 20,
        };
        dispatch(fetchInformationList(queryParams));
      },
      [searchText, filters, dispatch]
    );

    return (
      <div className={className}>
        <Card>
          {/* 搜索和过滤区域 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Search
                placeholder={t('informationGrid.search.placeholder')}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onSearch={handleSearch}
                enterButton
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder={t('informationGrid.filters.category')}
                allowClear
                style={{ width: '100%' }}
                value={filters.category || null}
                onChange={value => handleFilterChange('category', value)}
              >
                <Option value='系统监控'>
                  {t('informationGrid.categories.systemMonitoring')}
                </Option>
                <Option value='业务数据'>
                  {t('informationGrid.categories.businessData')}
                </Option>
                <Option value='userFeedback'>
                  {t('informationGrid.categories.userFeedback')}
                </Option>
                <Option value='productInfo'>
                  {t('informationGrid.categories.productInfo')}
                </Option>
                <Option value='systemMaintenance'>
                  {t('informationGrid.categories.systemMaintenance')}
                </Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder={t('informationGrid.filters.type')}
                allowClear
                style={{ width: '100%' }}
                value={filters.type || null}
                onChange={value => handleFilterChange('type', value)}
              >
                <Option value='text'>{t('informationGrid.types.text')}</Option>
                <Option value='number'>
                  {t('informationGrid.types.number')}
                </Option>
                <Option value='date'>{t('informationGrid.types.date')}</Option>
                <Option value='url'>{t('informationGrid.types.url')}</Option>
                <Option value='json'>{t('informationGrid.types.json')}</Option>
                <Option value='image'>
                  {t('informationGrid.types.image')}
                </Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder={t('informationGrid.filters.priority')}
                allowClear
                style={{ width: '100%' }}
                value={filters.priority || null}
                onChange={value => handleFilterChange('priority', value)}
              >
                <Option value='urgent'>{t('common.priority.urgent')}</Option>
                <Option value='high'>{t('common.priority.high')}</Option>
                <Option value='medium'>{t('common.priority.medium')}</Option>
                <Option value='low'>{t('common.priority.low')}</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Space>
                <Button icon={<FilterOutlined />} onClick={handleSearch}>
                  {t('informationGrid.actions.filter')}
                </Button>
                <Button onClick={handleReset}>
                  {t('informationGrid.actions.reset')}
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 操作栏 */}
          <Row justify='space-between' style={{ marginBottom: 16 }}>
            <Col>
              <Space>
                <Button type='primary' icon={<PlusOutlined />}>
                  {t('informationGrid.actions.addNew')}
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Badge count={selectedRowKeys.length}>
                    <Button danger onClick={handleBatchDelete}>
                      {t('informationGrid.actions.batchDelete')}
                    </Button>
                  </Badge>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleSearch}
                  loading={loading}
                >
                  {t('common.actions.refresh')}
                </Button>
                <Dropdown overlay={moreMenu} trigger={['click']}>
                  <Button icon={<MoreOutlined />}>{t('common.more')}</Button>
                </Dropdown>
              </Space>
            </Col>
          </Row>

          {/* 数据表格 */}
          <Table
            columns={columns}
            dataSource={informationData?.list || []}
            rowKey='id'
            loading={loading}
            rowSelection={rowSelection}
            scroll={{ x: 1200 }}
            pagination={{
              current: informationData?.pagination?.current || 1,
              pageSize: informationData?.pagination?.pageSize || 20,
              total: informationData?.pagination?.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                t('informationGrid.pagination.total', {
                  start: range[0],
                  end: range[1],
                  total,
                }),
              onChange: handlePaginationChange,
            }}
          />
        </Card>

        {/* 详情模态框 */}
        <Modal
          title={t('informationGrid.detailModal.title')}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key='close' onClick={() => setDetailModalVisible(false)}>
              {t('common.actions.close')}
            </Button>,
          ]}
          width={800}
        >
          {selectedItem && (
            <div>
              <Row gutter={16}>
                <Col span={12}>
                  <p>
                    <strong>{t('informationGrid.detailModal.title')}:</strong>{' '}
                    {selectedItem.title}
                  </p>
                  <p>
                    <strong>
                      {t('informationGrid.detailModal.category')}:
                    </strong>{' '}
                    {selectedItem.category}
                  </p>
                  <p>
                    <strong>{t('informationGrid.detailModal.source')}:</strong>{' '}
                    {selectedItem.source}
                  </p>
                  <p>
                    <strong>{t('informationGrid.detailModal.type')}:</strong>
                    <Tag color={getTypeColor(selectedItem.type)}>
                      {selectedItem.type}
                    </Tag>
                  </p>
                </Col>
                <Col span={12}>
                  <p>
                    <strong>
                      {t('informationGrid.detailModal.priority')}:
                    </strong>
                    <Tag color={getPriorityColor(selectedItem.priority)}>
                      {t(`common.priority.${selectedItem.priority}`)}
                    </Tag>
                  </p>
                  <p>
                    <strong>{t('informationGrid.detailModal.status')}:</strong>
                    <Tag color={getStatusColor(selectedItem.status)}>
                      {t(`informationGrid.status.${selectedItem.status}`)}
                    </Tag>
                  </p>
                  <p>
                    <strong>
                      {t('informationGrid.detailModal.createdAt')}:
                    </strong>{' '}
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>
                      {t('informationGrid.detailModal.updatedAt')}:
                    </strong>{' '}
                    {new Date(selectedItem.updatedAt).toLocaleString()}
                  </p>
                </Col>
              </Row>

              <div style={{ marginTop: 16 }}>
                <strong>{t('informationGrid.detailModal.content')}:</strong>
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  {renderContent(selectedItem.content, selectedItem.type)}
                </div>
              </div>

              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>{t('informationGrid.detailModal.tags')}:</strong>
                  <div style={{ marginTop: 8 }}>
                    {selectedItem.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.metadata && (
                <div style={{ marginTop: 16 }}>
                  <strong>{t('informationGrid.detailModal.metadata')}:</strong>
                  <pre
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: '#f5f5f5',
                      borderRadius: 4,
                    }}
                  >
                    {JSON.stringify(selectedItem.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* 编辑模态框 */}
        <Modal
          title={t('informationGrid.editModal.title')}
          open={editModalVisible}
          onOk={handleConfirmEdit}
          onCancel={() => setEditModalVisible(false)}
          okText={t('common.actions.save')}
          cancelText={t('common.actions.cancel')}
          width={600}
        >
          <Form form={editForm} layout='vertical'>
            <Form.Item
              label={t('informationGrid.editModal.titleLabel')}
              name='title'
              rules={[
                {
                  required: true,
                  message: t('informationGrid.editModal.titleRequired'),
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label={t('informationGrid.editModal.contentLabel')}
              name='content'
              rules={[
                {
                  required: true,
                  message: t('informationGrid.editModal.contentRequired'),
                },
              ]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={t('informationGrid.editModal.categoryLabel')}
                  name='category'
                >
                  <Select>
                    <Option value='系统监控'>
                      {t('informationGrid.categories.systemMonitoring')}
                    </Option>
                    <Option value='businessData'>
                      {t('informationGrid.categories.businessData')}
                    </Option>
                    <Option value='userFeedback'>
                      {t('informationGrid.categories.userFeedback')}
                    </Option>
                    <Option value='productInfo'>
                      {t('informationGrid.categories.productInfo')}
                    </Option>
                    <Option value='systemMaintenance'>
                      {t('informationGrid.categories.systemMaintenance')}
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('informationGrid.editModal.priorityLabel')}
                  name='priority'
                >
                  <Select>
                    <Option value='urgent'>
                      {t('common.priority.urgent')}
                    </Option>
                    <Option value='high'>{t('common.priority.high')}</Option>
                    <Option value='medium'>
                      {t('common.priority.medium')}
                    </Option>
                    <Option value='low'>{t('common.priority.low')}</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={t('informationGrid.editModal.statusLabel')}
              name='status'
            >
              <Select>
                <Option value='active'>
                  {t('informationGrid.status.active')}
                </Option>
                <Option value='archived'>
                  {t('informationGrid.status.archived')}
                </Option>
                <Option value='draft'>
                  {t('informationGrid.status.draft')}
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={t('informationGrid.editModal.tagsLabel')}
              name='tags'
            >
              <Select
                mode='tags'
                placeholder={t('informationGrid.editModal.tagsPlaceholder')}
              >
                <Option value='system'>
                  {t('informationGrid.tags.system')}
                </Option>
                <Option value='monitoring'>
                  {t('informationGrid.tags.monitoring')}
                </Option>
                <Option value='user'>{t('informationGrid.tags.user')}</Option>
                <Option value='product'>
                  {t('informationGrid.tags.product')}
                </Option>
                <Option value='data'>{t('informationGrid.tags.data')}</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <ErrorModal
          visible={isVisible}
          {...(errorInfo?.title && { title: errorInfo.title })}
          message={errorInfo?.message || ''}
          {...(errorInfo?.details && { details: errorInfo.details })}
          onClose={hideError}
        />
      </div>
    );
  }
);

InformationGrid.displayName = 'InformationGrid';

export default InformationGrid;
