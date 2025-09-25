/**
 * ReportSettings Component
 * Manage individual report properties and settings
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Progress,
  Alert,
  Descriptions,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  DeleteOutlined,
  SaveOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// Import types
import type {
  Report,
  Category,
  ReadingProgress,
} from '../../../types/rndReport';
import type { RNDReportService } from '../../../services/rndReportService';

// Import utilities
import { FileProcessingUtils } from '../../../utils/rndReportUtils';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { confirm } = Modal;

/**
 * ReportSettings Props Interface
 */
export interface ReportSettingsProps {
  /** Report to edit */
  report: Report;
  /** Available categories */
  categories: Category[];
  /** Whether modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when report is updated */
  onReportUpdate: (report: Report) => void;
  /** Callback when report is deleted */
  onReportDelete: (reportId: string) => void;
  /** RNDReport service instance */
  service?: RNDReportService;
}

/**
 * Report Form Values Interface
 */
interface ReportFormValues {
  name: string;
  description?: string;
  categoryId: string;
}

/**
 * ReportSettings Component
 * Comprehensive report settings management
 */
const ReportSettings: React.FC<ReportSettingsProps> = ({
  report,
  categories,
  visible,
  onClose,
  onReportUpdate,
  onReportDelete,
  service,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ReportFormValues>();

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingProgress, setReadingProgress] =
    useState<ReadingProgress | null>(null);

  /**
   * Load reading progress when modal opens
   */
  useEffect(() => {
    if (visible && service) {
      loadReadingProgress();
    }
  }, [visible, service, report.id]);

  /**
   * Reset form when report changes
   */
  useEffect(() => {
    if (visible && report) {
      form.setFieldsValue({
        name: report.name,
        description: report.metadata?.description || '',
        categoryId: report.categoryId,
      });
    }
  }, [visible, report, form]);

  /**
   * Load reading progress
   */
  const loadReadingProgress = async () => {
    if (!service) return;

    try {
      const progress = await service.getReadingProgress(report.id);
      setReadingProgress(progress);
    } catch (error) {
      console.error('Failed to load reading progress:', error);
    }
  };

  /**
   * Handle form submit
   */
  const handleFormSubmit = async (values: ReportFormValues) => {
    if (!service) return;

    try {
      setSaving(true);

      const updates: Partial<Report> = {
        name: values.name,
        categoryId: values.categoryId,
      };

      if (values.description !== undefined) {
        updates.metadata = {
          ...report.metadata,
          description: values.description,
        };
      }

      const updatedReport = await service.updateReport(report.id, updates);
      onReportUpdate(updatedReport);

      // Reload reading progress in case category change affected it
      await loadReadingProgress();
    } catch (error) {
      console.error('Failed to update report:', error);
      // Error handling is done by the service
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle report deletion
   */
  const handleDeleteReport = () => {
    confirm({
      title: t('rndReport.settings.delete.title'),
      content: (
        <div>
          <p>{t('rndReport.settings.delete.confirm', { name: report.name })}</p>
          <Alert
            message={t('rndReport.settings.delete.warning')}
            description={t('rndReport.settings.delete.warningDesc')}
            type='warning'
            showIcon
            style={{ marginTop: '16px' }}
          />
        </div>
      ),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (!service) return;

        try {
          setLoading(true);
          await service.deleteReport(report.id);
          onReportDelete(report.id);
          onClose();
        } catch (error) {
          console.error('Failed to delete report:', error);
          // Error handling is done by the service
        } finally {
          setLoading(false);
        }
      },
    });
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    form.resetFields();
    setReadingProgress(null);
    onClose();
  };

  /**
   * Validate report name
   */
  const validateReportName = async (_: any, value: string) => {
    if (!value || !value.trim()) {
      throw new Error(t('rndReport.settings.validation.nameRequired'));
    }

    if (value.length > 255) {
      throw new Error(t('rndReport.settings.validation.nameTooLong'));
    }

    return true;
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          {t('rndReport.settings.title')} - {report.name}
        </Space>
      }
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={800}
      destroyOnClose
      maskClosable={!saving && !loading}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleFormSubmit}
          initialValues={{
            name: report.name,
            description: report.metadata?.description || '',
            categoryId: report.categoryId,
          }}
        >
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            {/* Basic Information */}
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  {t('rndReport.settings.basic.title')}
                </Space>
              }
              size='small'
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name='name'
                    label={t('rndReport.settings.basic.name')}
                    rules={[
                      {
                        required: true,
                        message: t(
                          'rndReport.settings.validation.nameRequired'
                        ),
                      },
                      { validator: validateReportName },
                    ]}
                  >
                    <Input
                      placeholder={t(
                        'rndReport.settings.basic.namePlaceholder'
                      )}
                      maxLength={255}
                      disabled={saving}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name='categoryId'
                    label={t('rndReport.settings.basic.category')}
                  >
                    <Select
                      placeholder={t(
                        'rndReport.settings.basic.categoryPlaceholder'
                      )}
                      disabled={saving}
                    >
                      {categories.map(category => (
                        <Option key={category.id} value={category.id}>
                          <Space>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: category.color || '#666',
                              }}
                            />
                            {category.name}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name='description'
                label={t('rndReport.settings.basic.description')}
              >
                <Input.TextArea
                  placeholder={t(
                    'rndReport.settings.basic.descriptionPlaceholder'
                  )}
                  maxLength={1000}
                  rows={3}
                  disabled={saving}
                />
              </Form.Item>
            </Card>

            {/* Metadata Information */}
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  {t('rndReport.settings.metadata.title')}
                </Space>
              }
              size='small'
            >
              <Descriptions size='small' column={2}>
                <Descriptions.Item
                  label={t('rndReport.settings.metadata.originalName')}
                >
                  {report.originalName}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('rndReport.settings.metadata.fileSize')}
                >
                  {FileProcessingUtils.formatFileSize(report.fileSize)}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('rndReport.settings.metadata.uploadDate')}
                >
                  {FileProcessingUtils.formatDate(report.uploadDate)}
                </Descriptions.Item>
                <Descriptions.Item
                  label={t('rndReport.settings.metadata.lastRead')}
                >
                  {report.lastReadDate
                    ? FileProcessingUtils.formatDate(report.lastReadDate)
                    : t('rndReport.settings.metadata.neverRead')}
                </Descriptions.Item>
                {report.metadata?.author && (
                  <Descriptions.Item
                    label={t('rndReport.settings.metadata.author')}
                    span={2}
                  >
                    {report.metadata.author}
                  </Descriptions.Item>
                )}
                {report.metadata?.title && (
                  <Descriptions.Item
                    label={t('rndReport.settings.metadata.title')}
                    span={2}
                  >
                    {report.metadata.title}
                  </Descriptions.Item>
                )}
                {report.metadata?.version && (
                  <Descriptions.Item
                    label={t('rndReport.settings.metadata.version')}
                  >
                    {report.metadata.version}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Reading Progress */}
            {readingProgress && (
              <Card
                title={
                  <Space>
                    <EyeOutlined />
                    {t('rndReport.settings.progress.title')}
                  </Space>
                }
                size='small'
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={t('rndReport.settings.progress.percentage')}
                      value={readingProgress.currentPosition}
                      suffix='%'
                      valueStyle={{ color: '#666' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={t('rndReport.settings.progress.pages')}
                      value={`${readingProgress.currentPage} / ${readingProgress.totalPages}`}
                    />
                  </Col>
                </Row>

                <Divider />

                <div>
                  <Text
                    strong
                    style={{ marginBottom: '8px', display: 'block' }}
                  >
                    {t('rndReport.settings.progress.visual')}
                  </Text>
                  <Progress
                    percent={readingProgress.currentPosition}
                    status='active'
                    strokeColor='#666'
                  />
                </div>

                {readingProgress.bookmarks.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <Text
                      strong
                      style={{ marginBottom: '8px', display: 'block' }}
                    >
                      {t('rndReport.settings.progress.bookmarks')}
                    </Text>
                    <Space direction='vertical' style={{ width: '100%' }}>
                      {readingProgress.bookmarks.map((bookmark, index) => (
                        <Card key={bookmark.id || index} size='small'>
                          <Space direction='vertical' size={2}>
                            <Text strong>
                              {bookmark.title ||
                                `${t('rndReport.settings.progress.bookmark')} ${index + 1}`}
                            </Text>
                            <Text type='secondary' style={{ fontSize: '12px' }}>
                              {t('rndReport.settings.progress.position')}:{' '}
                              {bookmark.position}%
                            </Text>
                            {bookmark.notes && (
                              <Paragraph
                                ellipsis={{ rows: 2 }}
                                style={{ fontSize: '12px', margin: 0 }}
                              >
                                {bookmark.notes}
                              </Paragraph>
                            )}
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  </div>
                )}
              </Card>
            )}

            {/* Actions */}
            <Card size='small'>
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <Alert
                  message={t('rndReport.settings.danger.title')}
                  description={t('rndReport.settings.danger.description')}
                  type='warning'
                  showIcon
                />

                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteReport}
                    disabled={loading || saving}
                  >
                    {t('rndReport.settings.delete.button')}
                  </Button>

                  <Space>
                    <Button onClick={handleModalClose} disabled={saving}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type='default'
                      icon={<SaveOutlined />}
                      htmlType='submit'
                      loading={saving}
                      disabled={loading}
                      style={{
                        backgroundColor: '#666',
                        borderColor: '#666',
                        color: 'white',
                      }}
                    >
                      {t('common.save')}
                    </Button>
                  </Space>
                </Space>
              </Space>
            </Card>
          </Space>
        </Form>
      </div>
    </Modal>
  );
};

export default ReportSettings;
