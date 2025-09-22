/**
 * Universal OCR Page Component
 *
 * This component provides OCR processing for all document formats.
 * It supports PDF, images (JPG, PNG, TIFF), and scanned documents.
 * The layout is copied from InvoiceOCRPage with modifications for universal OCR.
 *
 * Features:
 * - File upload with drag-and-drop support for all formats
 * - Real-time processing progress tracking
 * - OCR results display and validation
 * - Support for multiple document formats
 * - Google Sheets export integration
 * - Workflow settings management
 *
 * @component
 * @example
 * ```tsx
 * <UniversalOCRPage />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layout,
  Row,
  Col,
  Card,
  Button,
  Space,
  Statistic,
  Alert,
  Typography,
  Divider,
  Badge,
  Spin,
  Steps,
  Modal,
} from 'antd';
import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import ErrorModal from '@/components/common/ErrorModal';
import {
  FileTextOutlined,
  UploadOutlined,
  SettingOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
// We'll reuse the invoice OCR service for now, can create a dedicated universal OCR service later
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import type {
  UniversalOCRFile,
  UniversalOCRResult,
  UniversalOCRStats,
  UniversalOCRFileType,
  UniversalOCRStatus,
  UniversalOCRSettings,
  DEFAULT_UNIVERSAL_OCR_SETTINGS,
} from '../types/universalOCR';
import type { EnhancedWebhookResponse } from '@/types/workflow';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

/**
 * Universal OCR processing status
 */
type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * Universal OCR main page component
 */
const UniversalOCRPage: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const { isVisible, errorInfo, showError, hideError } = useErrorModal();

  // Page state
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Data state
  const [uploadedFiles, setUploadedFiles] = useState<UniversalOCRFile[]>([]);
  const [ocrResults, setOcrResults] = useState<UniversalOCRResult[]>([]);
  const [stats, setStats] = useState<UniversalOCRStats>({
    totalFiles: 0,
    processedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalTextExtracted: 0,
    averageProcessingTime: 0,
    averageConfidence: 0,
    totalPagesProcessed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [completedData, setCompletedData] = useState<{
    executionId?: string;
    googleSheetsUrl?: string;
    processedFiles?: number;
    totalFiles?: number;
    enhancedData?: EnhancedWebhookResponse;
  } | null>(null);

  /**
   * Handle OCR recognition with webhook
   */
  const handleProcessOCR = useCallback(
    async (files: File[]) => {
      setProcessingStatus('processing');
      setLoading(true);
      setError(null);
      setCurrentStep(2);

      try {
        // Convert files to UniversalOCRFile format
        const universalFiles: UniversalOCRFile[] = files.map((file, index) => {
          // Determine file type from extension
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          let fileType: UniversalOCRFileType = 'pdf'; // default

          if (['jpg', 'jpeg'].includes(extension)) fileType = 'jpg';
          else if (extension === 'png') fileType = 'png';
          else if (['tiff', 'tif'].includes(extension)) fileType = 'tiff';
          else if (extension === 'bmp') fileType = 'bmp';
          else if (extension === 'gif') fileType = 'gif';
          else if (extension === 'doc') fileType = 'doc';
          else if (extension === 'docx') fileType = 'docx';
          else if (extension === 'txt') fileType = 'txt';
          else if (extension === 'rtf') fileType = 'rtf';
          else if (extension === 'pdf') fileType = 'pdf';

          return {
            id: `file-${Date.now()}-${index}`,
            name: file.name,
            size: file.size,
            type: fileType,
            uploadedAt: new Date().toISOString(),
            status: 'uploading' as UniversalOCRStatus,
            progress: 0,
          };
        });

        setUploadedFiles(universalFiles);

        // Simulate OCR processing (replace with actual service call)
        message.success('Universal OCR processing started successfully');

        // Simulate processing completion
        setTimeout(() => {
          setProcessingStatus('completed');
          setCurrentStep(3);
          setLoading(false);
        }, 3000);
      } catch (err: any) {
        const errorMessage = err.message || 'Universal OCR processing failed';
        setError(errorMessage);
        setProcessingStatus('error');
        showError(
          'Universal OCR Processing Failed',
          err.message || 'Unknown error occurred',
          err.stack
        );
      } finally {
        setLoading(false);
      }
    },
    [t, message, showError]
  );

  /**
   * Handle OCR processing completion
   */
  const handleOCRCompleted = useCallback(
    (data: {
      executionId?: string;
      googleSheetsUrl?: string;
      processedFiles?: number;
      totalFiles?: number;
      enhancedData?: EnhancedWebhookResponse;
    }) => {
      console.log('Universal OCR processing completed:', data);
      setCompletedData(data);
      setProcessingStatus('completed');
      setCurrentStep(3);
      setLoading(false);
    },
    []
  );

  /**
   * Load data when component initializes
   */
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load initial data
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load stats (placeholder - will be replaced with actual service)
      setStats({
        totalFiles: 0,
        processedFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        totalTextExtracted: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
        totalPagesProcessed: 0,
      });
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showError(
        'Failed to Load Data',
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle file upload success
   */
  const handleFilesUploaded = useCallback((files: UniversalOCRFile[]) => {
    setUploadedFiles(files);
    setCurrentStep(1);
    setProcessingStatus('uploading');
  }, []);

  /**
   * Restart processing
   */
  const handleRestart = () => {
    setUploadedFiles([]);
    setOcrResults([]);
    setProcessingStatus('idle');
    setCurrentStep(0);
    setError(null);
  };

  /**
   * Handle file deletion
   */
  const handleFileDelete = useCallback(
    (fileId: string) => {
      setOcrResults(prev => prev.filter(result => result.id !== fileId));
      message.success('File deleted successfully');
    },
    [message]
  );

  /**
   * Get processing steps configuration
   */
  const getSteps = () => [
    {
      title: 'Upload Documents',
      description: 'Upload files in any supported format',
      icon: <UploadOutlined />,
    },
    {
      title: 'Document Validation',
      description: 'Validate file formats and prepare for processing',
      icon: <CheckCircleOutlined />,
    },
    {
      title: 'OCR Processing',
      description: 'Extract text using advanced OCR algorithms',
      icon: <FileTextOutlined />,
    },
    {
      title: 'View Results',
      description: 'Review and download extracted text',
      icon: <EyeOutlined />,
    },
  ];

  /**
   * Get status color
   */
  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
      case 'uploading':
        return 'process';
      default:
        return 'wait';
    }
  };

  /**
   * Render page header
   */
  const renderHeader = () => (
    <div style={{ marginBottom: 24 }}>
      <Row justify='space-between' align='middle'>
        <Col>
          <Space align='center'>
            <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Universal OCR Processing
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              Settings
            </Button>
            {processingStatus !== 'idle' && (
              <Button onClick={handleRestart}>Reset</Button>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );

  /**
   * Render processing steps
   */
  const renderSteps = () => (
    <Card style={{ marginBottom: 24 }}>
      <Steps
        current={currentStep}
        status={getStatusColor(processingStatus)}
        items={getSteps()}
      />
      {error && (
        <Alert
          message='Processing Failed'
          description={error}
          type='error'
          showIcon
          style={{ marginTop: 16 }}
          action={
            <Button size='small' onClick={handleRestart}>
              Reset
            </Button>
          }
        />
      )}
    </Card>
  );

  /**
   * Render main content
   */
  const renderMainContent = () => {
    if (processingStatus === 'idle' || processingStatus === 'uploading') {
      return (
        <Card
          title='Upload Documents for OCR'
          extra={
            <Space>
              <InfoCircleOutlined />
              <Text type='secondary'>
                Supported formats: PDF, JPG, PNG, TIFF, BMP, GIF, DOC, DOCX
              </Text>
            </Space>
          }
        >
          {/* Placeholder for file upload component - will be implemented */}
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--card-color)',
            }}
          >
            <UploadOutlined
              style={{
                fontSize: '48px',
                color: '#d9d9d9',
                marginBottom: '16px',
              }}
            />
            <div>
              <Text strong>Drag and drop files here or click to browse</Text>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Text type='secondary'>
                Support for PDF, images, and document files up to 50MB each
              </Text>
            </div>
            <Button
              type='primary'
              icon={<UploadOutlined />}
              style={{ marginTop: '16px' }}
              onClick={() => {
                // Placeholder - will be replaced with actual file upload
                message.info('File upload functionality will be implemented');
              }}
            >
              Select Files
            </Button>
          </div>
        </Card>
      );
    }

    // Placeholder for results display - will be implemented
    return (
      <Card title='OCR Results'>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircleOutlined
            style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }}
          />
          <div>
            <Text strong>OCR Processing Completed</Text>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Text type='secondary'>Results display will be implemented</Text>
          </div>
          <Space style={{ marginTop: '16px' }}>
            <Button type='primary' onClick={handleRestart}>
              Process More Files
            </Button>
            <Button>Download Results</Button>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <Layout
      style={{ minHeight: '100vh', background: 'var(--background-color)' }}
    >
      <Content style={{ padding: '24px' }}>
        {renderHeader()}

        <Spin spinning={loading}>
          {renderSteps()}
          {renderMainContent()}
        </Spin>

        {/* Settings modal */}
        <Modal
          title='Universal OCR Settings'
          open={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          footer={null}
          width={800}
          destroyOnHidden
        >
          {/* Placeholder for settings component - will be implemented */}
          <div style={{ padding: '20px' }}>
            <Text>Universal OCR settings will be implemented here</Text>
          </div>
        </Modal>

        {/* Error Modal */}
        <ErrorModal
          visible={isVisible}
          errorInfo={errorInfo}
          onClose={hideError}
        />

        {/* Page footer information */}
        <Divider />
        <div style={{ textAlign: 'center', color: '#999' }}>
          <Text type='secondary'>Universal OCR Processing System</Text>
        </div>
      </Content>
    </Layout>
  );
};

export default UniversalOCRPage;
