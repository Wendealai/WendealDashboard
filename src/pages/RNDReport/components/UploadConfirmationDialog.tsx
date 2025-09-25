/**
 * UploadConfirmationDialog Component
 * Confirmation dialog for file upload with category selection
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  List,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Divider,
  Alert,
  Card,
} from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// Import types and utilities
import type { Category } from '../../../types/rndReport';
import { FileProcessingUtils } from '../../../utils/rndReportUtils';

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * UploadConfirmationDialog Props Interface
 */
export interface UploadConfirmationDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Files to be uploaded */
  files: File[];
  /** Available categories */
  categories: Category[];
  /** Whether upload is in progress */
  uploading: boolean;
  /** Upload progress percentage */
  progress: number;
  /** Callback when user confirms upload */
  onConfirm: (files: File[], selectedCategoryId: string) => Promise<void>;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Callback when dialog is closed */
  onClose: () => void;
}

/**
 * UploadConfirmationDialog Component
 * Provides confirmation dialog with category selection before file upload
 */
const UploadConfirmationDialog: React.FC<UploadConfirmationDialogProps> = ({
  visible,
  files,
  categories,
  uploading,
  progress,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const { t } = useTranslation();

  // Component state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Reset selected category when dialog opens
  useEffect(() => {
    if (visible && categories.length > 0) {
      // Default to first category or uncategorized
      const defaultCategory =
        categories.find(cat => cat.name === 'Uncategorized') || categories[0];
      setSelectedCategoryId(defaultCategory?.id || '');
    }
  }, [visible, categories]);

  /**
   * Handle confirm upload
   */
  const handleConfirm = async () => {
    if (!selectedCategoryId || files.length === 0) {
      return;
    }

    try {
      await onConfirm(files, selectedCategoryId);
    } catch (error) {
      console.error('Upload confirmation failed:', error);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setSelectedCategoryId('');
    onCancel();
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    setSelectedCategoryId('');
    onClose();
  };

  /**
   * Get selected category name
   */
  const getSelectedCategoryName = () => {
    const category = categories.find(cat => cat.id === selectedCategoryId);
    return category?.name || t('rndReport.category.uncategorized');
  };

  /**
   * Calculate total file size
   */
  const getTotalFileSize = () => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined />
          {t('rndReport.upload.confirm.title', '确认上传')}
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={600}
      footer={[
        <Button key='cancel' onClick={handleCancel} disabled={uploading}>
          {t('common.cancel', '取消')}
        </Button>,
        <Button
          key='confirm'
          type='primary'
          onClick={handleConfirm}
          loading={uploading}
          disabled={!selectedCategoryId || files.length === 0}
        >
          {uploading
            ? t('rndReport.upload.confirm.uploading', '上传中...')
            : t('rndReport.upload.confirm.upload', '确认上传')}
        </Button>,
      ]}
      maskClosable={!uploading}
      closable={!uploading}
      destroyOnClose
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        {/* Upload Summary */}
        <Card size='small'>
          <Space direction='vertical' size='small'>
            <Text strong>
              {t('rndReport.upload.confirm.summary', '上传摘要')}
            </Text>
            <Space wrap>
              <Text>
                {t('rndReport.upload.confirm.filesCount', '文件数量')}:{' '}
                {files.length}
              </Text>
              <Text>
                {t('rndReport.upload.confirm.totalSize', '总大小')}:{' '}
                {FileProcessingUtils.formatFileSize(getTotalFileSize())}
              </Text>
            </Space>
          </Space>
        </Card>

        {/* Category Selection */}
        <div>
          <Text strong style={{ marginBottom: '8px', display: 'block' }}>
            {t('rndReport.upload.confirm.selectCategory', '选择分类')} *
          </Text>
          <Select
            placeholder={t(
              'rndReport.upload.confirm.selectCategoryPlaceholder',
              '请选择分类'
            )}
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            style={{ width: '100%' }}
            disabled={uploading}
            showSearch
            optionFilterProp='children'
          >
            {categories.map(category => (
              <Option key={category.id} value={category.id}>
                <Space>
                  <FolderOutlined />
                  {category.name}
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    ({category.reportCount || 0}{' '}
                    {t('rndReport.category.reports', '报告')})
                  </Text>
                </Space>
              </Option>
            ))}
          </Select>

          {selectedCategoryId && (
            <Text
              type='secondary'
              style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}
            >
              {t('rndReport.upload.confirm.selectedCategory', '已选择')}:{' '}
              {getSelectedCategoryName()}
            </Text>
          )}
        </div>

        <Divider />

        {/* File List */}
        <div>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}>
            {t('rndReport.upload.confirm.files', '待上传文件')}
          </Text>
          <List
            size='small'
            dataSource={files}
            renderItem={file => (
              <List.Item>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Space>
                    <FileTextOutlined />
                    <div>
                      <Text>{file.name}</Text>
                      <br />
                      <Text type='secondary' style={{ fontSize: '12px' }}>
                        {FileProcessingUtils.formatFileSize(file.size)}
                      </Text>
                    </div>
                  </Space>
                  <Tag color='processing'>
                    {t('rndReport.upload.confirm.ready', '准备上传')}
                  </Tag>
                </Space>
              </List.Item>
            )}
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <>
            <Divider />
            <Card size='small'>
              <Space direction='vertical' style={{ width: '100%' }}>
                <Text strong>
                  {t(
                    'rndReport.upload.confirm.uploadingFiles',
                    '正在上传文件...'
                  )}
                </Text>
                <div>
                  <Text type='secondary'>
                    {t('rndReport.upload.confirm.progress', '进度')}: {progress}
                    %
                  </Text>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      marginTop: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        backgroundColor: '#666',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </>
        )}

        {/* Warning for large uploads */}
        {files.length > 5 && (
          <Alert
            message={t(
              'rndReport.upload.confirm.largeUploadWarning',
              '批量上传提醒'
            )}
            description={t(
              'rndReport.upload.confirm.largeUploadMessage',
              '您正在上传多个文件，这可能需要一些时间。请不要关闭页面。'
            )}
            type='info'
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default UploadConfirmationDialog;
