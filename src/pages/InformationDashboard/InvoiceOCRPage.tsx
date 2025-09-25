/**
 * Invoice OCR Main Page Component
 *
 * This is the main page component for Invoice OCR functionality.
 * It integrates file upload, workflow execution, and result display components
 * to provide a complete invoice processing experience.
 *
 * Features:
 * - File upload with drag-and-drop support
 * - Real-time processing progress tracking
 * - OCR results display and validation
 * - Google Sheets export integration
 * - Workflow settings management
 *
 * @component
 * @example
 * ```tsx
 * <InvoiceOCRPage />
 * ```
 *
 * @see {@link InvoiceFileUpload} - File upload component
 * @see {@link InvoiceOCRResults} - Results display component
 * @see {@link InvoiceOCRSettings} - Settings management component
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
  Alert,
  Typography,
  Divider,
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
  InfoCircleOutlined,
} from '@ant-design/icons';
import InvoiceFileUpload from './components/InvoiceFileUpload';
import InvoiceOCRResults from './components/InvoiceOCRResults';
import InvoiceOCRSettings from './components/InvoiceOCRSettings';
import type { EnhancedWebhookResponse } from '../../types/workflow';
const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * Invoice OCR processing status
 */
type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * Invoice OCR main page component
 */
const InvoiceOCRPage: React.FC = () => {
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
  const [error, setError] = useState<string | null>(null);
  const [completedData, setCompletedData] = useState<{
    executionId: string;
    googleSheetsUrl?: string;
    processedFiles?: number;
    totalFiles?: number;
    /** 增强版webhook响应数据 */
    enhancedData?: EnhancedWebhookResponse;
  } | null>(null);

  /**
   * Handle OCR recognition with webhook
   * This function is called from InvoiceFileUpload component after files are uploaded
   */
  const handleProcessOCR = useCallback(
    async (_files: File[]) => {
      setProcessingStatus('processing');
      setLoading(true);
      setError(null);
      setCurrentStep(2);

      try {
        // Files are already uploaded by InvoiceFileUpload component
        // Just update the UI to show processing status
        message.success(t('invoiceOCR.upload.processSuccess'));
        setProcessingStatus('completed');
        setCurrentStep(3);
      } catch (err: any) {
        const errorMessage =
          err.message || t('invoiceOCR.upload.processFailed');
        setError(errorMessage);
        setProcessingStatus('error');
        showError(t('invoiceOCR.upload.processFailed'));
      } finally {
        setLoading(false);
      }
    },
    [t, message, showError]
  );

  /**
   * Handle OCR processing completion
   * This function is called when OCR processing is completed with results
   */
  const handleOCRCompleted = useCallback(
    (data: {
      executionId?: string | undefined;
      googleSheetsUrl?: string | undefined;
      processedFiles?: number | undefined;
      totalFiles?: number | undefined;
      /** 增强版webhook响应数据 */
      enhancedData?: EnhancedWebhookResponse;
    }) => {
      console.log('OCR处理完成，接收到数据:', data);
      // Only set completedData if we have executionId (required)
      if (data.executionId) {
        setCompletedData({
          executionId: data.executionId,
          ...(data.googleSheetsUrl && {
            googleSheetsUrl: data.googleSheetsUrl,
          }),
          ...(data.processedFiles && { processedFiles: data.processedFiles }),
          ...(data.totalFiles && { totalFiles: data.totalFiles }),
          ...(data.enhancedData && { enhancedData: data.enhancedData }),
        });
      }
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
      // Load initial data if needed
      console.log('Loading initial data...');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showError(t('globalMessages.refreshFailed'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restart processing
   */
  const handleRestart = () => {
    setProcessingStatus('idle');
    setCurrentStep(0);
    setError(null);
  };

  /**
   * Get processing steps configuration
   */
  const getSteps = () => [
    {
      title: t('informationDashboard.uploadDocument'),
      description: t('informationDashboard.uploadFiles'),
      icon: <UploadOutlined />,
    },
    {
      title: t('informationDashboard.documentValidation'),
      description: t('informationDashboard.supportedFormats'),
      icon: <CheckCircleOutlined />,
    },
    {
      title: t('informationDashboard.ocrProcessing'),
      description: t('invoiceOCR.upload.processing'),
      icon: <FileTextOutlined />,
    },
    {
      title: t('informationDashboard.viewResults'),
      description: t('invoiceOCR.results.title'),
      icon: <EyeOutlined />,
    },
  ];

  /**
   * Get status color
   */
  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'finish';
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
              {t('invoiceOCR.title')}
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              {t('common.settings')}
            </Button>
            {processingStatus !== 'idle' && (
              <Button onClick={handleRestart}>{t('common.reset')}</Button>
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
          message={t('invoiceOCR.errors.processFailed')}
          description={error}
          type='error'
          showIcon
          style={{ marginTop: 16 }}
          action={
            <Button size='small' onClick={handleRestart}>
              {t('common.reset')}
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
    if (
      processingStatus === 'idle' ||
      processingStatus === 'uploading' ||
      processingStatus === 'processing'
    ) {
      return (
        <Card
          title={t('invoiceOCR.upload.title')}
          extra={
            <Space>
              <InfoCircleOutlined />
              <Text type='secondary'>
                {t('invoiceOCR.upload.supportedFormats')}
              </Text>
            </Space>
          }
        >
          <InvoiceFileUpload
            workflowId='default-workflow'
            onUploadSuccess={batchTask => {
              console.log('Upload success:', batchTask);
            }}
            onUploadError={error => {
              console.error('Upload error:', error);
            }}
            onOCRProcess={handleProcessOCR}
            onOCRCompleted={handleOCRCompleted}
            ocrProcessing={processingStatus === 'processing'}
          />
        </Card>
      );
    }

    return (
      <InvoiceOCRResults
        workflowId='default-workflow'
        showStats={true}
        showHistory={true}
        processingStatus={processingStatus}
        {...(completedData && { completedData })}
        onResultSelect={result => {
          console.log('Selected result:', result);
        }}
        onGoogleSheetsRedirect={results => {
          console.log('Redirecting to Google Sheets with results:', results);
        }}
        onProcessNewFiles={handleRestart}
      />
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        {renderHeader()}

        <Spin spinning={loading}>
          {renderSteps()}
          {renderMainContent()}
        </Spin>

        {/* Settings modal */}
        <Modal
          title={t('invoiceOCR.settings.title')}
          open={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          footer={null}
          width={800}
          destroyOnHidden
        >
          <InvoiceOCRSettings />
        </Modal>

        {/* Error Modal */}
        <ErrorModal
          visible={isVisible}
          message={errorInfo?.message || 'An error occurred'}
          onClose={hideError}
        />

        {/* Page footer information */}
        <Divider />
        <div style={{ textAlign: 'center', color: '#999' }}>
          <Text type='secondary'>{t('informationDashboard.version')}</Text>
        </div>
      </Content>
    </Layout>
  );
};

export default InvoiceOCRPage;
