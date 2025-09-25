/**
 * CategoryManager Component
 * Manage report categories with full CRUD operations
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  ColorPicker,
  Space,
  Typography,
  Tooltip,
  Popconfirm,
  Tag,
  Empty,
  message,
  Avatar,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// Import types
import type { Category } from '../../../types/rndReport';
import type { RNDReportService } from '../../../services/rndReportService';

const { Text, Title } = Typography;
const { confirm } = Modal;

/**
 * CategoryManager Props Interface
 */
export interface CategoryManagerProps {
  /** Array of categories to display */
  categories: Category[];
  /** Category statistics (category ID -> report count) */
  categoryStats: Map<string, number>;
  /** Callback when category is selected */
  onCategorySelect: (categoryId: string) => void;
  /** Callback when categories are updated */
  onCategoriesChange: (categories: Category[]) => void;
  /** RNDReport service instance */
  service?: RNDReportService;
  /** Custom class name */
  className?: string;
}

/**
 * Category Form Values Interface
 */
interface CategoryFormValues {
  name: string;
  description?: string;
  color?: string;
}

/**
 * CategoryManager Component
 * Comprehensive category management with CRUD operations
 */
const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  categoryStats,
  onCategorySelect,
  onCategoriesChange,
  service,
  className,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<CategoryFormValues>();

  // State
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Handle add new category
   */
  const handleAddCategory = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      name: '',
      description: '',
      color: '#666',
    });
    setModalVisible(true);
  };

  /**
   * Handle edit category
   */
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description || '',
      color: category.color || '#666',
    });
    setModalVisible(true);
  };

  /**
   * Handle delete category
   */
  const handleDeleteCategory = async (category: Category) => {
    const reportCount = categoryStats.get(category.id) || 0;

    confirm({
      title: t('rndReport.category.delete.title'),
      content: (
        <div>
          <p>
            {t('rndReport.category.delete.confirm', { name: category.name })}
          </p>
          {reportCount > 0 && (
            <p style={{ color: '#ff4d4f', marginTop: '8px' }}>
              {t('rndReport.category.delete.warning', { count: reportCount })}
            </p>
          )}
        </div>
      ),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (!service) return;

        try {
          setLoading(true);
          await service.deleteCategory(category.id);

          // Update local state
          const updatedCategories = categories.filter(
            c => c.id !== category.id
          );
          onCategoriesChange(updatedCategories);

          message.success(t('rndReport.category.delete.success'));
        } catch (error) {
          console.error('Failed to delete category:', error);
          message.error(t('rndReport.category.delete.error'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /**
   * Handle form submit
   */
  const handleFormSubmit = async (values: CategoryFormValues) => {
    if (!service) return;

    try {
      setSubmitting(true);

      if (editingCategory) {
        // Update existing category
        const updateData: Partial<Category> = {
          name: values.name,
        };
        if (values.description !== undefined) {
          updateData.description = values.description;
        }
        if (values.color !== undefined) {
          updateData.color = values.color;
        }
        const updatedCategory = await service.updateCategory(
          editingCategory.id,
          updateData
        );

        // Update local state
        const updatedCategories = categories.map(cat =>
          cat.id === editingCategory.id ? updatedCategory : cat
        );
        onCategoriesChange(updatedCategories);

        message.success(t('rndReport.category.update.success'));
      } else {
        // Create new category
        const createData: Omit<Category, 'id' | 'reportCount' | 'createdDate'> =
          {
            name: values.name,
          };
        if (values.description !== undefined) {
          createData.description = values.description;
        }
        if (values.color !== undefined) {
          createData.color = values.color;
        }
        const newCategory = await service.createCategory(createData);

        // Update local state
        onCategoriesChange([...categories, newCategory]);

        message.success(t('rndReport.category.create.success'));
      }

      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save category:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      message.error(
        editingCategory
          ? t('rndReport.category.update.error')
          : t('rndReport.category.create.error') + ': ' + errorMessage
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle modal cancel
   */
  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingCategory(null);
  };

  /**
   * Validate category name uniqueness
   */
  const validateCategoryName = async (_: any, value: string) => {
    if (!value || !value.trim()) {
      throw new Error(t('rndReport.category.validation.nameRequired'));
    }

    const trimmedValue = value.trim();
    const existingCategory = categories.find(
      cat =>
        cat.name.toLowerCase() === trimmedValue.toLowerCase() &&
        cat.id !== editingCategory?.id
    );

    if (existingCategory) {
      throw new Error(t('rndReport.category.validation.nameExists'));
    }

    return true;
  };

  /**
   * Get category display color
   */
  const getCategoryColor = (category: Category): string => {
    return category.color || '#666';
  };

  /**
   * Render category item
   */
  const renderCategoryItem = (category: Category) => {
    const reportCount = categoryStats.get(category.id) || 0;
    const isSystemCategory =
      category.name === t('rndReport.category.default.uncategorized.name') ||
      category.name === 'Uncategorized'; // fallback for backward compatibility

    return (
      <List.Item
        key={category.id}
        actions={[
          <Tooltip title={t('rndReport.category.actions.select')}>
            <Button
              type='text'
              icon={<FolderOpenOutlined />}
              onClick={() => onCategorySelect(category.id)}
            />
          </Tooltip>,
          !isSystemCategory && (
            <Tooltip title={t('rndReport.category.actions.edit')}>
              <Button
                type='text'
                icon={<EditOutlined />}
                onClick={() => handleEditCategory(category)}
              />
            </Tooltip>
          ),
          !isSystemCategory && (
            <Popconfirm
              title={t('rndReport.category.delete.confirm', {
                name: category.name,
              })}
              onConfirm={() => handleDeleteCategory(category)}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              disabled={loading}
            >
              <Tooltip title={t('rndReport.category.actions.delete')}>
                <Button
                  type='text'
                  danger
                  icon={<DeleteOutlined />}
                  disabled={loading}
                />
              </Tooltip>
            </Popconfirm>
          ),
        ].filter(Boolean)}
        style={{ cursor: 'pointer' }}
        onClick={() => onCategorySelect(category.id)}
      >
        <List.Item.Meta
          avatar={
            <Avatar
              icon={<FolderOutlined />}
              style={{
                backgroundColor: getCategoryColor(category),
              }}
            />
          }
          title={
            <Space>
              <Text strong>{category.name}</Text>
              {isSystemCategory && (
                <Tag color='default'>{t('rndReport.category.system')}</Tag>
              )}
            </Space>
          }
          description={
            <Space direction='vertical' size={2}>
              {category.description && (
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {category.description}
                </Text>
              )}
              <Space size={8}>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('rndReport.category.reports', { count: reportCount })}
                </Text>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('rndReport.category.created')}:{' '}
                  {new Date(category.createdDate).toLocaleDateString()}
                </Text>
              </Space>
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <div className={className}>
      <Card
        title={
          <Space>
            <SettingOutlined />
            {t('rndReport.category.title')}
          </Space>
        }
        extra={
          <Button
            type='default'
            icon={<PlusOutlined />}
            onClick={handleAddCategory}
            disabled={loading}
            style={{
              backgroundColor: '#666',
              borderColor: '#666',
              color: 'white',
            }}
          >
            {t('rndReport.category.add')}
          </Button>
        }
      >
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          {/* Statistics */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Card size='small' style={{ minWidth: '120px' }}>
              <Space direction='vertical' size={0} align='center'>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('rndReport.category.stats.total')}
                </Text>
                <Text strong style={{ fontSize: '24px' }}>
                  {categories.length}
                </Text>
              </Space>
            </Card>
            <Card size='small' style={{ minWidth: '120px' }}>
              <Space direction='vertical' size={0} align='center'>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('rndReport.category.stats.withReports')}
                </Text>
                <Text strong style={{ fontSize: '24px' }}>
                  {
                    categories.filter(
                      cat => (categoryStats.get(cat.id) || 0) > 0
                    ).length
                  }
                </Text>
              </Space>
            </Card>
            <Card size='small' style={{ minWidth: '120px' }}>
              <Space direction='vertical' size={0} align='center'>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('rndReport.category.stats.totalReports')}
                </Text>
                <Text strong style={{ fontSize: '24px' }}>
                  {Array.from(categoryStats.values()).reduce(
                    (sum, count) => sum + count,
                    0
                  )}
                </Text>
              </Space>
            </Card>
          </div>

          {/* Categories List */}
          {categories.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('rndReport.category.empty')}
            >
              <Button
                type='default'
                icon={<PlusOutlined />}
                onClick={handleAddCategory}
                style={{
                  backgroundColor: '#666',
                  borderColor: '#666',
                  color: 'white',
                }}
              >
                {t('rndReport.category.addFirst')}
              </Button>
            </Empty>
          ) : (
            <List
              loading={loading}
              dataSource={categories}
              renderItem={renderCategoryItem}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) =>
                  t('rndReport.list.pagination', {
                    range0: range[0],
                    range1: range[1],
                    total,
                  }),
              }}
            />
          )}
        </Space>
      </Card>

      {/* Category Edit Modal */}
      <Modal
        title={
          <Space>
            {editingCategory ? <EditOutlined /> : <PlusOutlined />}
            {editingCategory
              ? t('rndReport.category.edit.title')
              : t('rndReport.category.add.title')}
          </Space>
        }
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleFormSubmit}
          initialValues={{
            name: '',
            description: '',
            color: '#666',
          }}
        >
          <Form.Item
            name='name'
            label={t('rndReport.category.form.name')}
            rules={[
              {
                required: true,
                message: t('rndReport.category.validation.nameRequired'),
              },
              { validator: validateCategoryName },
            ]}
          >
            <Input
              placeholder={t('rndReport.category.form.namePlaceholder')}
              maxLength={50}
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item
            name='description'
            label={t('rndReport.category.form.description')}
          >
            <Input.TextArea
              placeholder={t('rndReport.category.form.descriptionPlaceholder')}
              maxLength={200}
              rows={3}
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item name='color' label={t('rndReport.category.form.color')}>
            <ColorPicker
              disabled={submitting}
              presets={[
                {
                  label: t('rndReport.category.colors.default'),
                  colors: [
                    '#666',
                    '#52c41a',
                    '#faad14',
                    '#f5222d',
                    '#722ed1',
                    '#13c2c2',
                    '#eb2f96',
                    '#fa8c16',
                  ],
                },
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button
                type='default'
                htmlType='submit'
                loading={submitting}
                style={{
                  backgroundColor: '#666',
                  borderColor: '#666',
                  color: 'white',
                }}
              >
                {editingCategory ? t('common.update') : t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryManager;
