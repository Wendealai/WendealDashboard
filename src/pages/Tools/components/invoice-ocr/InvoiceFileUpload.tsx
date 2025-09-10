/**
 * Invoice File Upload Component
 *
 * A comprehensive file upload component specifically designed for invoice processing.
 * Supports multiple file formats (PDF, images) with drag-and-drop functionality,
 * progress tracking, and real-time validation.
 *
 * Features:
 * - Drag-and-drop file upload interface
 * - Support for PDF, JPG, JPEG, PNG, TIFF formats
 * - File size validation (max 10MB per file)
 * - Real-time upload progress tracking
 * - File preview and management
 * - Error handling and user feedback
 * - Integration with n8n webhook for processing
 *
 * @component
 * @example
 * ```tsx
 * <InvoiceFileUpload
 *   onFilesUploaded={(files) => console.log('Uploaded:', files)}
 *   maxFileSize={10 * 1024 * 1024}
 *   acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png']}
 * />
 * ```
 *
 * @see {@link InvoiceOCRWorkflow} - Parent workflow component
 * @see {@link invoiceOCRService} - Service for file processing
 * @see {@link n8nWebhookService} - Webhook integration service
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  Upload,
  Button,
  Progress,
  Card,
  List,
  Space,
  Typography,
  Modal,
  Image,
  Tag,
  Tooltip,
  Row,
  Col,
  Alert,
  notification,
} from 'antd';
import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import { useTranslation } from 'react-i18next';
import ErrorModal from '@/components/common/ErrorModal';
import {
  InboxOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { invoiceOCRService } from '../../../../services/invoiceOCRService';
import { n8nWebhookService } from '../../../../services/n8nWebhookService';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRSettings,
  InvoiceOCRBatchTask,
  InvoiceOCRUploadRequest,
  InvoiceFileType,
  InvoiceOCRLanguage,
  InvoiceOCROutputFormat,
  InvoiceOCRProcessingOptions,
} from '../../../pages/InformationDashboard/types/invoiceOCR';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { confirm } = Modal;

// CSS样式定义
const styles = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

/**
 * Invoice OCR 文件上传组件属性接口
 */
interface InvoiceFileUploadProps {
  /** 工作流 ID */
  workflowId: string;
  /** 处理选项 */
  processingOptions?: Partial<InvoiceOCRProcessingOptions>;
  /** 批处理名称 */
  batchName?: string;
  /** 最大文件数量 */
  maxFiles?: number;
  /** 最大文件大小 (MB) */
  maxFileSize?: number;
  /** 上传成功回调 */
  onUploadSuccess?: (batchTask: InvoiceOCRBatchTask) => void;
  /** 上传失败回调 */
  onUploadError?: (error: Error) => void;
  /** 文件列表变化回调 */
  onFileListChange?: (fileList: UploadFile[]) => void;
  /** OCR识别处理回调 */
  onOCRProcess?: (files: File[]) => void;
  /** OCR识别处理中状态 */
  ocrProcessing?: boolean;
  /** OCR处理完成回调 */
  onOCRCompleted?: (data: {
    executionId?: string;
    googleSheetsUrl?: string;
    processedFiles?: number;
    totalFiles?: number;
  }) => void;
}

/**
 * 支持的文件类型配置
 */
const SUPPORTED_FILE_TYPES = {
  'application/pdf': { icon: FilePdfOutlined, color: '#ff4d4f', name: 'PDF' },
  'image/jpeg': { icon: FileImageOutlined, color: '#52c41a', name: 'JPEG' },
  'image/jpg': { icon: FileImageOutlined, color: '#52c41a', name: 'JPG' },
  'image/png': { icon: FileImageOutlined, color: '#1890ff', name: 'PNG' },
  'image/tiff': { icon: FileImageOutlined, color: '#722ed1', name: 'TIFF' },
  'image/bmp': { icon: FileImageOutlined, color: '#fa8c16', name: 'BMP' },
} as const;

/**
 * 获取文件类型图标和颜色
 */
const getFileTypeInfo = (fileType: string) => {
  return (
    SUPPORTED_FILE_TYPES[fileType as keyof typeof SUPPORTED_FILE_TYPES] || {
      icon: FileTextOutlined,
      color: '#8c8c8c',
      name: 'Unknown',
    }
  );
};

/**
 * Invoice OCR 文件上传组件
 * 支持多文件上传、进度显示、文件预览和删除功能
 */
const InvoiceFileUpload: React.FC<InvoiceFileUploadProps> = memo(
  ({
    workflowId,
    processingOptions = {},
    batchName,
    maxFiles = 20,
    maxFileSize = 10,
    onUploadSuccess,
    onUploadError,
    onFileListChange,
    onOCRProcess,
    ocrProcessing = false,
    onOCRCompleted,
  }) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
    const message = useMessage();
    const { isVisible, errorInfo, showError, hideError } = useErrorModal();
    const { t } = useTranslation();

    // Cache processing options to avoid creating new objects on each render
    const memoizedProcessingOptions = useMemo(
      () => ({
        language: 'zh-CN',
        outputFormat: 'json',
        extractTables: true,
        extractLineItems: true,
        validateData: true,
        ...processingOptions,
      }),
      [processingOptions]
    );

    // Cache file statistics
    const fileStats = useMemo(
      () => ({
        count: fileList.length,
        totalSize: fileList.reduce(
          (total, file) => total + (file.size || 0),
          0
        ),
        hasFiles: fileList.length > 0,
        canUpload: fileList.length > 0 && !uploading,
      }),
      [fileList, uploading]
    );

    /**
     * Validate file type
     */
    const validateFileType = useCallback(
      (file: File): boolean => {
        const isSupported = invoiceOCRService.validateFileType(file);
        if (!isSupported) {
          showError(
            'Unsupported file type',
            `${file.type}. Supported formats: PDF, JPEG, PNG, TIFF, BMP`
          );
        }
        return isSupported;
      },
      [showError]
    );

    /**
     * Validate file size
     */
    const validateFileSize = useCallback(
      (file: File): boolean => {
        const isValidSize = invoiceOCRService.validateFileSize(
          file,
          maxFileSize
        );
        if (!isValidSize) {
          showError(
            'File size exceeds limit',
            `${invoiceOCRService.formatFileSize(
              file.size
            )}. Maximum allowed: ${maxFileSize}MB`
          );
        }
        return isValidSize;
      },
      [maxFileSize, showError]
    );

    /**
     * Validation before file upload
     */
    const beforeUpload = useCallback(
      (file: File, fileList: File[]): boolean => {
        // Validate file type
        if (!validateFileType(file)) {
          return false;
        }

        // Validate file size
        if (!validateFileSize(file)) {
          return false;
        }

        // Validate file count
        if (fileList.length > maxFiles) {
          showError(
            'Upload limit exceeded',
            `Maximum ${maxFiles} files can be uploaded`
          );
          return false;
        }

        // Check for duplicate files
        const isDuplicate = fileList.some(
          (existingFile, index) =>
            index !== fileList.indexOf(file) &&
            existingFile.name === file.name &&
            existingFile.size === file.size
        );

        if (isDuplicate) {
          message.warning(`File "${file.name}" already exists`);
          return false;
        }

        return false; // Prevent auto upload, manual control
      },
      [validateFileType, validateFileSize, maxFiles, message]
    );

    /**
     * Handle file list changes
     */
    const handleFileListChange: UploadProps['onChange'] = useCallback(
      info => {
        let newFileList = [...info.fileList];

        // Limit file count
        newFileList = newFileList.slice(-maxFiles);

        // Update file status
        newFileList = newFileList.map(file => {
          if (file.response) {
            file.url = file.response.url;
          }
          return file;
        });

        setFileList(newFileList);
        onFileListChange?.(newFileList);
      },
      [maxFiles, onFileListChange]
    );

    /**
     * Remove file
     */
    const handleRemoveFile = useCallback(
      (file: UploadFile) => {
        const newFileList = fileList.filter(item => item.uid !== file.uid);
        setFileList(newFileList);
        onFileListChange?.(newFileList);
      },
      [fileList, onFileListChange]
    );

    /**
     * Preview file
     */
    const handlePreviewFile = useCallback((file: UploadFile) => {
      setPreviewFile(file);
      setPreviewVisible(true);
    }, []);

    /**
     * Clear file list
     */
    const handleClearFiles = useCallback(() => {
      confirm({
        title: 'Confirm Clear',
        icon: <ExclamationCircleOutlined />,
        content: 'Are you sure you want to clear all files?',
        onOk() {
          setFileList([]);
          onFileListChange?.([]);
        },
      });
    }, [onFileListChange]);

    /**
     * Handle OCR recognition with real n8n webhook
     */
    const handleOCRProcess = useCallback(async () => {
      if (fileList.length === 0) {
        message.warning('Please select files to recognize first');
        return;
      }

      // 设置上传状态
      setUploading(true);
      setUploadProgress(0);

      let progressInterval: NodeJS.Timeout | null = null;

      try {
        const files = fileList.map(file => file.originFileObj as File);
        const webhookUrl = 'https://n8n.wendealai.com/webhook/invoiceOCR';

        console.log('开始上传PDF文件到n8n webhook:', {
          fileCount: files.length,
          webhookUrl,
          workflowId,
        });

        // 模拟上传进度
        progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              return prev;
            }
            return prev + Math.random() * 15;
          });
        }, 300);

        // 直接发送文件到n8n webhook
        const webhookResponse = await n8nWebhookService.uploadFilesToWebhook(
          webhookUrl,
          {
            files,
            workflowId,
            batchName:
              batchName ||
              invoiceOCRService.generateBatchName('invoice-upload'),
            metadata: {
              processingOptions: memoizedProcessingOptions,
              timestamp: new Date().toISOString(),
              source: 'wendeal-dashboard',
            },
          }
        );

        // 完成上传进度
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        setUploadProgress(100);

        console.log('n8n webhook响应:', webhookResponse);

        if (webhookResponse.success) {
          console.log('=== WEBHOOK 响应成功 ===');
          console.log(
            '完整的webhookResponse:',
            JSON.stringify(webhookResponse, null, 2)
          );

          // 显示成功消息
          message.success('Files successfully sent to workflow!');

          // 处理工作流返回的数据
          console.log('=== 分析 WEBHOOK 响应数据结构 ===');
          console.log(
            'webhookResponse.data 类型:',
            typeof webhookResponse.data
          );
          console.log(
            'webhookResponse.data 是否为数组:',
            Array.isArray(webhookResponse.data)
          );
          console.log('webhookResponse.data 内容:', webhookResponse.data);

          const hasDetailedData =
            webhookResponse.data && Array.isArray(webhookResponse.data);
          const workflowData = hasDetailedData ? webhookResponse.data : [];

          console.log('hasDetailedData:', hasDetailedData);
          console.log('workflowData:', workflowData);

          // 提取增强版数据（如果存在）
          let enhancedData = null;
          if (hasDetailedData && workflowData.length > 0) {
            enhancedData = workflowData[0];
            console.log('从数组第一个元素提取 enhancedData:', enhancedData);
          } else if (
            webhookResponse.data &&
            typeof webhookResponse.data === 'object' &&
            !Array.isArray(webhookResponse.data)
          ) {
            // 如果data不是数组，但是是对象，直接使用
            enhancedData = webhookResponse.data;
            console.log(
              '直接使用 webhookResponse.data 作为 enhancedData:',
              enhancedData
            );
          } else {
            console.log('未找到有效的 enhancedData');
          }

          // 准备完成数据
          const completedData = {
            executionId: webhookResponse.executionId,
            googleSheetsUrl:
              webhookResponse.googleSheetsUrl ||
              'https://docs.google.com/spreadsheets/d/1K8VGSofJUBK7yCTqtaPNQvSZ1HeGDNZOvO2UQ6SRJzg/edit?usp=sharing',
            processedFiles: files.length,
            totalFiles: files.length,
            enhancedData: enhancedData,
          };

          console.log('准备调用onOCRCompleted回调:', completedData);

          // 安全地调用处理完成回调，传递完成数据
          try {
            onOCRCompleted?.(completedData);
            console.log('onOCRCompleted回调执行成功');
          } catch (callbackError) {
            console.error('onOCRCompleted回调执行失败:', callbackError);
            // 即使回调失败，也不应该影响主流程
          }

          // 安全地调用父组件回调
          try {
            onOCRProcess?.(files);
            console.log('onOCRProcess回调执行成功');
          } catch (callbackError) {
            console.error('onOCRProcess回调执行失败:', callbackError);
            // 即使回调失败，也不应该影响主流程
          }

          // 清空文件列表
          setFileList([]);
          onFileListChange?.([]);

          console.log('=== OCR处理流程完成 ===');
        } else {
          throw new Error(webhookResponse.message || 'n8n工作流处理失败');
        }
      } catch (error) {
        // 清理进度状态
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        console.error('发送文件到n8n失败:', error);

        // 获取更详细的错误信息
        let errorTitle = 'File upload failed';
        let errorMessage = 'Unknown error';
        let errorDetails = undefined;

        if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails = error.stack;

          // 检查是否是网络错误
          if (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')
          ) {
            errorTitle = 'Network connection failed';
            errorMessage =
              'Unable to connect to the workflow service. Please check your network connection and try again.';
          }
          // 检查是否是超时错误
          else if (
            error.message.includes('timeout') ||
            error.message.includes('AbortError')
          ) {
            errorTitle = 'Request timeout';
            errorMessage =
              'The request took too long to complete. This may be due to large files or slow network. Please try again with smaller files or check your connection.';
          }
          // 检查是否是服务器错误
          else if (
            error.message.includes('500') ||
            error.message.includes('Internal Server Error')
          ) {
            errorTitle = 'Server error';
            errorMessage =
              'The workflow service encountered an internal error. Please try again later or contact support if the problem persists.';
          }
          // 检查是否是认证错误
          else if (
            error.message.includes('401') ||
            error.message.includes('403')
          ) {
            errorTitle = 'Authentication failed';
            errorMessage =
              'Access denied. Please check your workflow configuration and ensure the webhook URL is correct.';
          }
          // 检查是否是文件格式错误
          else if (
            error.message.includes('format') ||
            error.message.includes('type')
          ) {
            errorTitle = 'File format error';
            errorMessage =
              'One or more files have an unsupported format. Please ensure all files are PDF, JPEG, PNG, TIFF, or BMP format.';
          }
          // 检查是否是n8n工作流错误
          else if (
            error.message.includes('n8n工作流处理失败') ||
            error.message.includes('Error in workflow')
          ) {
            errorTitle = 'Workflow execution error';
            errorMessage =
              'The n8n workflow encountered an error during execution. This could be due to: 1) Workflow configuration issues, 2) Missing required nodes or credentials, 3) Invalid file processing logic. Please check the n8n workflow logs and ensure all nodes are properly configured.';
          }
        }

        // 显示错误消息 - 使用更显眼的样式
        message.error({
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ExclamationCircleOutlined
                style={{
                  fontSize: '20px',
                  color: '#ff4d4f',
                }}
              />
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ff4d4f',
                }}
              >
                ❌ {errorTitle}: {errorMessage}
              </span>
            </div>
          ),
          duration: 6,
          style: {
            marginTop: '20vh',
            fontSize: '16px',
          },
        });

        // 为n8n工作流错误提供更详细的解决建议
        let troubleshootingSteps = undefined;
        if (
          error instanceof Error &&
          (error.message.includes('n8n工作流处理失败') ||
            error.message.includes('Error in workflow'))
        ) {
          troubleshootingSteps = [
            '1. 检查n8n工作流是否正在运行',
            '2. 验证工作流中所有节点的配置是否正确',
            '3. 确认webhook节点的设置和路径匹配',
            '4. 检查工作流中是否有必需的凭据配置',
            '5. 查看n8n执行日志以获取详细错误信息',
            '6. 确保文件处理节点支持当前的文件格式',
            '7. 验证Google Sheets或其他输出服务的连接',
          ];
        }

        showError({
          title: errorTitle,
          message: errorMessage,
          details: errorDetails,
          troubleshooting: troubleshootingSteps,
        });
      } finally {
        // 重置上传状态
        setUploading(false);
        setUploadProgress(0);
      }
    }, [
      fileList,
      onOCRProcess,
      onFileListChange,
      workflowId,
      batchName,
      memoizedProcessingOptions,
      message,
      showError,
    ]);

    /**
     * Start upload
     */
    const handleStartUpload = useCallback(async () => {
      if (fileList.length === 0) {
        message.warning('Please select files to upload first');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        // Prepare upload request
        const files = fileList.map(file => file.originFileObj as File);
        const uploadRequest: InvoiceOCRUploadRequest = {
          workflowId,
          files,
          batchName:
            batchName || invoiceOCRService.generateBatchName('invoice-upload'),
          processingOptions: memoizedProcessingOptions,
        };

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 10;
          });
        }, 500);

        // Execute upload
        const batchTask = await invoiceOCRService.uploadFiles(uploadRequest);

        // Complete upload
        clearInterval(progressInterval);
        setUploadProgress(100);

        message.success(
          `Files uploaded successfully! Batch task ID: ${batchTask.id}`
        );

        // Clear file list
        setFileList([]);
        onFileListChange?.([]);
        onUploadSuccess?.(batchTask);
      } catch (error) {
        showError(
          'Upload failed',
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error.stack : undefined
        );
        onUploadError?.(
          error instanceof Error ? error : new Error('Upload failed')
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }, [
      fileList,
      workflowId,
      batchName,
      memoizedProcessingOptions,
      onUploadSuccess,
      onUploadError,
      onFileListChange,
      message,
    ]);

    /**
     * Render file list item
     */
    const renderFileListItem = useCallback(
      (file: UploadFile) => {
        const fileTypeInfo = getFileTypeInfo(file.type || '');
        const FileIcon = fileTypeInfo.icon;

        return (
          <List.Item
            actions={[
              <Tooltip key='preview' title='Preview'>
                <Button
                  type='text'
                  size='small'
                  icon={<EyeOutlined />}
                  onClick={() => handlePreviewFile(file)}
                />
              </Tooltip>,
              <Tooltip key='delete' title='Delete'>
                <Button
                  type='text'
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveFile(file)}
                  disabled={uploading}
                />
              </Tooltip>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <FileIcon
                  style={{ fontSize: '24px', color: fileTypeInfo.color }}
                />
              }
              title={
                <Space>
                  <Text strong>{file.name}</Text>
                  <Tag color={fileTypeInfo.color}>{fileTypeInfo.name}</Tag>
                </Space>
              }
              description={
                <Text type='secondary'>
                  {invoiceOCRService.formatFileSize(file.size || 0)}
                </Text>
              }
            />
          </List.Item>
        );
      },
      [handlePreviewFile, handleRemoveFile, uploading]
    );

    /**
     * Get file preview content
     */
    const getPreviewContent = useCallback(() => {
      if (!previewFile) return null;

      const fileType = previewFile.type || '';
      const isImage = fileType.startsWith('image/');

      if (isImage && previewFile.url) {
        return (
          <Image
            src={previewFile.url}
            alt={previewFile.name}
            style={{ maxWidth: '100%', maxHeight: '500px' }}
          />
        );
      }

      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <FilePdfOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />
          <div style={{ marginTop: '16px' }}>
            <Text strong>{previewFile.name}</Text>
            <br />
            <Text type='secondary'>
              {invoiceOCRService.formatFileSize(previewFile.size || 0)}
            </Text>
          </div>
        </div>
      );
    }, [previewFile]);

    return (
      <div className='invoice-file-upload'>
        <Card title='File Upload' className='upload-card'>
          {/* Upload area */}
          <Dragger
            multiple
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleFileListChange}
            onRemove={handleRemoveFile}
            onPreview={handlePreviewFile}
            disabled={uploading}
            accept='.pdf,.jpg,.jpeg,.png,.tiff,.bmp'
            className='upload-dragger'
          >
            <p className='ant-upload-drag-icon'>
              <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className='ant-upload-text'>
              Click or drag files to this area to upload
            </p>
            <p className='ant-upload-hint'>
              Supports PDF, JPEG, PNG, TIFF, BMP formats, max {maxFileSize}MB
              per file, up to {maxFiles} files
            </p>
          </Dragger>

          {/* Upload progress */}
          {uploading && (
            <div
              style={{
                marginTop: '20px',
                padding: '20px',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                border: '2px solid #1890ff',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <CloudUploadOutlined
                  style={{
                    fontSize: '24px',
                    color: '#1890ff',
                    animation: 'spin 2s linear infinite',
                  }}
                />
                <Text
                  strong
                  style={{
                    fontSize: '18px',
                    color: '#1890ff',
                  }}
                >
                  🚀 Uploading files to workflow...
                </Text>
              </div>
              <Progress
                percent={Math.round(uploadProgress)}
                status={uploadProgress === 100 ? 'success' : 'active'}
                strokeColor={{
                  '0%': '#1890ff',
                  '50%': '#40a9ff',
                  '100%': '#52c41a',
                }}
                strokeWidth={8}
                showInfo={true}
                format={percent => (
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1890ff',
                    }}
                  >
                    {percent}%
                  </span>
                )}
              />
              <Text
                type='secondary'
                style={{
                  marginTop: '12px',
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontStyle: 'italic',
                }}
              >
                Please wait while we process your files... OCR processing may
                take 1-2 minutes depending on file size and complexity.
              </Text>
            </div>
          )}

          {/* File list */}
          {fileStats.hasFiles && (
            <div style={{ marginTop: '16px' }}>
              <Row
                justify='space-between'
                align='middle'
                style={{ marginBottom: '12px' }}
              >
                <Col>
                  <Title level={5} style={{ margin: 0 }}>
                    Selected Files ({fileStats.count}/{maxFiles})
                  </Title>
                </Col>
                <Col>
                  <Space>
                    <Button
                      type='primary'
                      icon={<ScanOutlined />}
                      onClick={handleOCRProcess}
                      loading={ocrProcessing}
                      disabled={!fileStats.hasFiles || ocrProcessing}
                    >
                      Upload & Recognize
                    </Button>
                    <Button
                      icon={<CloudUploadOutlined />}
                      onClick={handleStartUpload}
                      loading={uploading}
                      disabled={!fileStats.canUpload}
                    >
                      Upload Only
                    </Button>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={handleClearFiles}
                      disabled={
                        uploading || !fileStats.hasFiles || ocrProcessing
                      }
                    >
                      Clear
                    </Button>
                  </Space>
                </Col>
              </Row>

              <List
                size='small'
                bordered
                dataSource={fileList}
                renderItem={renderFileListItem}
              />
            </div>
          )}

          {/* Usage tips */}
          {!fileStats.hasFiles && (
            <Alert
              message='Usage Tips'
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Support batch upload of multiple invoice files</li>
                  <li>
                    Support PDF and common image formats (JPEG, PNG, TIFF, BMP)
                  </li>
                  <li>
                    Recommend uploading clear, complete invoice images for best
                    recognition results
                  </li>
                  <li>
                    OCR recognition and data extraction will be performed
                    automatically after upload
                  </li>
                </ul>
              }
              type='info'
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}
        </Card>

        {/* File preview modal */}
        <Modal
          title={previewFile?.name}
          open={previewVisible}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          width={800}
          centered
        >
          {getPreviewContent()}
        </Modal>

        {/* Error modal */}
        <ErrorModal
          visible={isVisible}
          errorInfo={errorInfo}
          onClose={hideError}
        />
      </div>
    );
  }
);

export default InvoiceFileUpload;

// Display name for debugging
InvoiceFileUpload.displayName = 'InvoiceFileUpload';
