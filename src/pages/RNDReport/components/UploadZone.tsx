/**
 * UploadZone Component
 * Drag-and-drop file upload interface for R&D Reports
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Card,
  Progress,
  Typography,
  Space,
  Button,
  Alert,
  List,
  Tag,
  Select,
  notification,
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  InboxOutlined,
  CheckCircleFilled,
  FolderOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// Import utilities
import { FileProcessingUtils } from '../../../utils/rndReportUtils';

// Import types
import type { Category } from '../../../types/rndReport';

const { Text } = Typography;
const { Option } = Select;

/**
 * UploadZone Props Interface
 */
export interface UploadZoneProps {
  /** Callback when files are confirmed for upload with categories */
  onFilesConfirmed: (
    files: File[],
    categoryId: string,
    fileCategories?: Map<string, string>
  ) => Promise<void>;
  /** Available categories for selection */
  categories: Category[];
  /** Whether files are currently being uploaded */
  isUploading: boolean;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Whether to allow multiple file selection */
  multiple?: boolean;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Accepted file types */
  acceptedFileTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * UploadZone Component
 * Provides drag-and-drop file upload interface with visual feedback
 */
const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesConfirmed,
  categories,
  isUploading,
  progress,
  multiple = true,
  maxFiles = 10,
  acceptedFileTypes = ['text/html', 'application/xhtml+xml'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  className,
  style,
}) => {
  const { t } = useTranslation();

  // Component state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<File[]>([]);
  const [fileCategories, setFileCategories] = useState<Map<string, string>>(
    new Map()
  );

  /**
   * Handle file drop and validation
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: any[]) => {
      // Clear previous errors
      setValidationErrors([]);
      setAcceptedFiles([]);
      setRejectedFiles([]);

      const errors: string[] = [];
      const validFiles: File[] = [];

      // Validate accepted files
      for (const file of acceptedFiles) {
        try {
          const validation = await FileProcessingUtils.validateHtmlFile(file, {
            maxFileSize,
            allowedFileTypes: acceptedFileTypes,
            storagePath: 'rnd-reports',
            autoExtractMetadata: true,
            enableReadingProgress: true,
            enableBookmarks: true,
            enableSearch: true,
            enableCategories: true,
            defaultViewMode: 'list',
            itemsPerPage: 20,
            enableOfflineMode: true,
          });

          if (validation.isValid) {
            validFiles.push(file);
          } else {
            errors.push(`${file.name}: ${validation.error}`);
          }
        } catch (error) {
          errors.push(
            `${file.name}: ${error instanceof Error ? error.message : 'Validation failed'}`
          );
        }
      }

      // Handle rejected files
      fileRejections.forEach((rejection: any) => {
        const errorMessages =
          rejection.errors?.map((err: any) => err.message).join(', ') ||
          'Unknown error';
        errors.push(
          `${rejection.file?.name || 'Unknown file'}: ${errorMessages}`
        );
      });

      // Update state
      setAcceptedFiles(validFiles);
      setRejectedFiles(
        fileRejections.map((rejection: any) => rejection.file).filter(Boolean)
      );
      setValidationErrors(errors);

      // Initialize category selection for each file (default to first category or uncategorized)
      if (validFiles.length > 0) {
        const defaultCategory =
          categories.length > 0 && categories[0] ? categories[0].id : '';
        const newFileCategories = new Map(fileCategories);

        validFiles.forEach(file => {
          newFileCategories.set(file.name, defaultCategory);
        });

        setFileCategories(newFileCategories);
      }
    },
    [maxFileSize, acceptedFileTypes, t]
  );

  /**
   * Handle category change for a specific file
   */
  const handleFileCategoryChange = (fileName: string, categoryId: string) => {
    const newFileCategories = new Map(fileCategories);
    newFileCategories.set(fileName, categoryId);
    setFileCategories(newFileCategories);
  };

  /**
   * Show detailed upload success notification
   */
  const showUploadSuccessNotification = (
    uploadedFiles: File[],
    fileCategories: Map<string, string>
  ) => {
    const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    const categoryStats = new Map<string, number>();

    // Count files per category
    uploadedFiles.forEach(file => {
      const categoryId = fileCategories.get(file.name) || '';
      const category = categories.find(cat => cat.id === categoryId);
      const categoryName = category?.name || 'Uncategorized';
      categoryStats.set(
        categoryName,
        (categoryStats.get(categoryName) || 0) + 1
      );
    });

    const categoryList = Array.from(categoryStats.entries())
      .map(([name, count]) => `${name}: ${count} file${count > 1 ? 's' : ''}`)
      .join('\n');

    notification.success({
      message: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircleFilled style={{ color: '#888888', fontSize: '20px' }} />
          <span style={{ fontWeight: 'bold', color: '#212529' }}>
            Upload Completed Successfully
          </span>
        </div>
      ),
      description: (
        <div style={{ color: '#6c757d', fontSize: '14px', lineHeight: '1.5' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>{uploadedFiles.length}</strong> file
            {uploadedFiles.length > 1 ? 's' : ''} uploaded successfully
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Total size:</strong>{' '}
            {FileProcessingUtils.formatFileSize(totalSize)}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>Categories:</strong>
          </div>
          <div
            style={{
              paddingLeft: '8px',
              borderLeft: '2px solid #dee2e6',
              marginLeft: '8px',
            }}
          >
            {categoryList.split('\n').map((line, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                }}
              >
                <FolderOutlined
                  style={{ color: '#666666', fontSize: '12px' }}
                />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      duration: 8,
      style: {
        backgroundColor: '#ffffff',
        border: '1px solid #dee2e6',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      icon: null, // Remove default icon since we added custom one in message
    });
  };

  const handleUploadAll = async () => {
    if (acceptedFiles.length === 0) return;

    try {
      // 确保所有文件都有分类（如果用户没有选择，使用默认分类）
      const defaultCategoryId =
        categories.length > 0 && categories[0] ? categories[0].id : '';
      const completeFileCategories = new Map(fileCategories);

      acceptedFiles.forEach(file => {
        if (!completeFileCategories.has(file.name)) {
          completeFileCategories.set(file.name, defaultCategoryId);
          console.log(
            `📂 为文件 "${file.name}" 设置默认分类: ${defaultCategoryId}`
          );
        }
      });

      console.log(
        '📋 文件分类映射:',
        Object.fromEntries(completeFileCategories)
      );

      // Pass all files with their category mappings
      await onFilesConfirmed(acceptedFiles, '', completeFileCategories);

      // Show detailed upload success notification
      showUploadSuccessNotification(acceptedFiles, completeFileCategories);

      // Reset state after successful upload
      setAcceptedFiles([]);
      setRejectedFiles([]);
      setValidationErrors([]);
      setFileCategories(new Map());
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  /**
   * Handle remove file
   */
  const handleRemoveFile = (fileToRemove: File) => {
    const newAcceptedFiles = acceptedFiles.filter(
      file => file !== fileToRemove
    );
    const newFileCategories = new Map(fileCategories);
    newFileCategories.delete(fileToRemove.name);

    setAcceptedFiles(newAcceptedFiles);
    setFileCategories(newFileCategories);
  };

  /**
   * Dropzone configuration
   */
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
      'application/xhtml+xml': ['.xhtml'],
    },
    multiple,
    maxFiles,
    maxSize: maxFileSize,
    disabled: isUploading,
  });

  /**
   * Get dropzone styles based on state
   */
  const getDropzoneStyles = () => {
    let baseStyles: React.CSSProperties = {
      border: '2px dashed #d9d9d9',
      borderRadius: '8px',
      padding: '40px 20px',
      textAlign: 'center',
      cursor: isUploading ? 'not-allowed' : 'pointer',
      backgroundColor: '#fafafa',
      transition: 'all 0.3s ease',
      ...style,
    };

    if (isDragActive) {
      if (isDragAccept) {
        baseStyles = {
          ...baseStyles,
          borderColor: '#52c41a',
          backgroundColor: '#f6ffed',
        };
      } else if (isDragReject) {
        baseStyles = {
          ...baseStyles,
          borderColor: '#ff4d4f',
          backgroundColor: '#fff2f0',
        };
      }
    }

    return baseStyles;
  };

  /**
   * Get dropzone content based on state
   */
  const getDropzoneContent = () => {
    if (isUploading) {
      return (
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          <LoadingOutlined style={{ fontSize: '48px', color: '#666' }} />
          <div>
            <Text strong>{t('rndReport.upload.uploading')}</Text>
            <div style={{ marginTop: '16px' }}>
              <Progress
                percent={progress}
                status={progress === 100 ? 'success' : 'active'}
                strokeColor='#666'
              />
            </div>
          </div>
        </Space>
      );
    }

    if (isDragActive) {
      if (isDragAccept) {
        return (
          <Space direction='vertical' size='large'>
            <CheckCircleOutlined
              style={{ fontSize: '48px', color: '#52c41a' }}
            />
            <Text strong style={{ color: '#52c41a' }}>
              Drop to upload files
            </Text>
          </Space>
        );
      } else if (isDragReject) {
        return (
          <Space direction='vertical' size='large'>
            <CloseCircleOutlined
              style={{ fontSize: '48px', color: '#ff4d4f' }}
            />
            <Text strong style={{ color: '#ff4d4f' }}>
              Invalid file types
            </Text>
          </Space>
        );
      }
    }

    return (
      <Space direction='vertical' size='large'>
        <InboxOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
        <div>
          <Text strong>Drag and drop files here</Text>
          <br />
          <Text type='secondary'>or click to select files</Text>
        </div>
        <Button
          type='default'
          icon={<UploadOutlined />}
          disabled={isUploading}
          style={{
            backgroundColor: '#666',
            borderColor: '#666',
            color: 'white',
          }}
        >
          Select Files
        </Button>
      </Space>
    );
  };

  return (
    <div className={className}>
      <Card
        size='small'
        title={
          <Space>
            <UploadOutlined />
            {t('rndReport.upload.title')}
          </Space>
        }
      >
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          {/* Dropzone */}
          <div {...getRootProps()} style={getDropzoneStyles()}>
            <input {...getInputProps()} />
            {getDropzoneContent()}
          </div>

          {/* File Type Info */}
          <div style={{ textAlign: 'center' }}>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              Accepted formats: HTML (.html, .htm)
              <br />
              Maximum file size:{' '}
              {FileProcessingUtils.formatFileSize(maxFileSize)}
              {multiple && (
                <>
                  <br />
                  Maximum files: {maxFiles}
                </>
              )}
            </Text>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <Card size='small'>
              <Space direction='vertical' style={{ width: '100%' }}>
                <Text strong>Processing files...</Text>
                <Progress percent={progress} status='active' />
                {acceptedFiles.length > 0 && (
                  <List
                    size='small'
                    dataSource={acceptedFiles}
                    renderItem={file => (
                      <List.Item>
                        <Space>
                          <FileTextOutlined />
                          <Text>{file.name}</Text>
                          <Tag color='processing'>
                            {FileProcessingUtils.formatFileSize(file.size)}
                          </Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert
              message='Validation errors'
              description={
                <List
                  size='small'
                  dataSource={validationErrors}
                  renderItem={error => (
                    <List.Item>
                      <Text type='danger' style={{ fontSize: '12px' }}>
                        {error}
                      </Text>
                    </List.Item>
                  )}
                />
              }
              type='error'
              showIcon
              closable
              onClose={() => setValidationErrors([])}
            />
          )}

          {/* Upload Summary */}
          {(acceptedFiles.length > 0 || rejectedFiles.length > 0) &&
            !isUploading && (
              <Card size='small'>
                <Space direction='vertical' size='small'>
                  {acceptedFiles.length > 0 && (
                    <Text type='success'>
                      <CheckCircleOutlined style={{ marginRight: '8px' }} />
                      Accepted files: {acceptedFiles.length}
                    </Text>
                  )}
                  {rejectedFiles.length > 0 && (
                    <Text type='danger'>
                      <CloseCircleOutlined style={{ marginRight: '8px' }} />
                      Rejected files: {rejectedFiles.length}
                    </Text>
                  )}
                </Space>
              </Card>
            )}

          {/* File List with Category Selection */}
          {acceptedFiles.length > 0 && !isUploading && (
            <Card size='small' title='Files to Upload'>
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                <List
                  size='small'
                  dataSource={acceptedFiles}
                  renderItem={file => (
                    <List.Item
                      actions={[
                        <Button
                          key='remove'
                          type='text'
                          danger
                          size='small'
                          onClick={() => handleRemoveFile(file)}
                        >
                          Remove
                        </Button>,
                      ]}
                    >
                      <Space direction='vertical' style={{ width: '100%' }}>
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
                        <div style={{ marginTop: '8px' }}>
                          <Text
                            style={{
                              fontSize: '12px',
                              marginBottom: '4px',
                              display: 'block',
                            }}
                          >
                            Category:
                          </Text>
                          <Select
                            size='small'
                            style={{ minWidth: '200px' }}
                            value={fileCategories.get(file.name) || ''}
                            onChange={value =>
                              handleFileCategoryChange(file.name, value)
                            }
                          >
                            {categories.map(category => (
                              <Option key={category.id} value={category.id}>
                                {category.name}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />

                {/* Upload Button */}
                <div style={{ textAlign: 'right' }}>
                  <Button
                    type='default'
                    onClick={handleUploadAll}
                    disabled={acceptedFiles.length === 0}
                    style={{
                      backgroundColor: '#666',
                      borderColor: '#666',
                      color: 'white',
                    }}
                  >
                    Upload All Files ({acceptedFiles.length})
                  </Button>
                </div>
              </Space>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default UploadZone;
