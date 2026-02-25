/**
 * Tools Invoice OCR Main Page Component
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

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
import { getInvoiceOcrConfig } from '@/config/invoiceOcrConfig';
import { invoiceOCRService } from '../../../services/invoiceOCRService';
import { trackInvoiceOcrEvent } from '@/services/invoiceOcrTelemetry';
import { n8nWebhookService } from '@/services/n8nWebhookService';
import InvoiceFileUpload from './invoice-ocr/InvoiceFileUpload';
import InvoiceOCRResults from './invoice-ocr/InvoiceOCRResults';
import InvoiceOCRSettings from './invoice-ocr/InvoiceOCRSettings';
import type {
  InvoiceOCRFile,
  InvoiceOCRResult,
  InvoiceOCRStats,
  InvoiceOCRBatchTask,
} from '../../../pages/InformationDashboard/types/invoiceOCR';
import type { EnhancedWebhookResponse } from '@/types/workflow';
const { Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

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
 * Tools Invoice OCR main page component
 */
const InvoiceOCRPage: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const { isVisible, errorInfo, showError, hideError } = useErrorModal();
  const invoiceOcrConfig = useMemo(() => getInvoiceOcrConfig(), []);
  const pollingTimerRef = useRef<number | null>(null);
  const processStartIsoRef = useRef<string>('');
  const baselineResultCountRef = useRef<number>(0);

  // Page state
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isPollingResults, setIsPollingResults] = useState(false);
  const [resultsRefreshToken, setResultsRefreshToken] = useState(0);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Data state
  const [uploadedFiles, setUploadedFiles] = useState<InvoiceOCRFile[]>([]);
  const [ocrResults, setOcrResults] = useState<InvoiceOCRResult[]>([]);
  const [stats, setStats] = useState<InvoiceOCRStats>({
    totalFiles: 0,
    processedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalAmount: 0,
    averageProcessingTime: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [completedData, setCompletedData] = useState<{
    executionId?: string;
    googleSheetsUrl?: string;
    processedFiles?: number;
    totalFiles?: number;
    hasBusinessData?: boolean;
    schemaWarnings?: string[];
    idempotencyKey?: string;
    diagnostics?: {
      httpStatus?: number;
      contentType?: string;
      attemptCount?: number;
      elapsedMs?: number;
      transportWarnings?: string[];
    };
    rawResponse?: unknown;
    /** 增强版webhook响应数据 */
    enhancedData?: EnhancedWebhookResponse;
  } | null>(null);

  const stopResultPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsPollingResults(false);
  }, []);

  const pollForLatestResults = useCallback(
    (executionId?: string) => {
      stopResultPolling();
      const pollStartedAt = Date.now();
      let pollingBusy = false;

      setIsPollingResults(true);
      trackInvoiceOcrEvent('invoice_ocr_polling_started', {
        workflowId: invoiceOcrConfig.workflowId,
        executionId: executionId || '',
      });

      const tryLoadResults = async () => {
        if (pollingBusy) {
          return;
        }
        pollingBusy = true;
        try {
          const latestResults = await invoiceOCRService.getResultsList(
            invoiceOcrConfig.workflowId,
            { page: 1, pageSize: 100 }
          );
          setOcrResults(latestResults);

          const hasExecutionMatch = executionId
            ? latestResults.some(
                result =>
                  typeof result.executionId === 'string' &&
                  result.executionId === executionId
              )
            : false;

          const hasFreshResult = latestResults.some(result => {
            const startedAt = result.startedAt || result.completedAt;
            if (!startedAt || !processStartIsoRef.current) {
              return false;
            }
            return startedAt >= processStartIsoRef.current;
          });

          const hasIncrementalResults =
            latestResults.length > baselineResultCountRef.current;

          if (hasExecutionMatch || hasFreshResult || hasIncrementalResults) {
            stopResultPolling();
            setResultsRefreshToken(prev => prev + 1);
            trackInvoiceOcrEvent('invoice_ocr_polling_completed', {
              workflowId: invoiceOcrConfig.workflowId,
              executionId: executionId || '',
              resultCount: latestResults.length,
            });
            message.success('识别结果已同步更新');
            return;
          }

          const elapsed = Date.now() - pollStartedAt;
          if (elapsed >= invoiceOcrConfig.resultPollingTimeoutMs) {
            stopResultPolling();
            trackInvoiceOcrEvent('invoice_ocr_polling_timeout', {
              workflowId: invoiceOcrConfig.workflowId,
              executionId: executionId || '',
              elapsedMs: elapsed,
            });
            message.warning(
              '识别已提交，但结果尚未落库。请稍后点击“刷新结果”或查看 n8n 执行日志。'
            );
          }
        } catch (pollError) {
          console.error('Invoice OCR result polling failed:', pollError);
        } finally {
          pollingBusy = false;
        }
      };

      void tryLoadResults();
      pollingTimerRef.current = window.setInterval(
        () => void tryLoadResults(),
        invoiceOcrConfig.resultPollingIntervalMs
      );
    },
    [
      invoiceOcrConfig.resultPollingIntervalMs,
      invoiceOcrConfig.resultPollingTimeoutMs,
      invoiceOcrConfig.workflowId,
      message,
      stopResultPolling,
    ]
  );

  /**
   * Handle OCR recognition with webhook
   * This function is called from InvoiceFileUpload component after files are uploaded
   */
  const handleProcessOCR = useCallback(
    (files: File[]) => {
      if (!files.length) {
        message.warning(t('invoiceOCR.upload.selectFilesFirst'));
        return;
      }

      stopResultPolling();
      processStartIsoRef.current = new Date().toISOString();
      baselineResultCountRef.current = ocrResults.length;
      setCompletedData(null);
      setProcessingStatus('processing');
      setLoading(true);
      setError(null);
      setCurrentStep(2);
      message.info(t('invoiceOCR.upload.processing'));

      trackInvoiceOcrEvent('invoice_ocr_upload_started', {
        workflowId: invoiceOcrConfig.workflowId,
        fileCount: files.length,
      });
    },
    [
      t,
      message,
      invoiceOcrConfig.workflowId,
      ocrResults.length,
      stopResultPolling,
    ]
  );

  /**
   * Handle OCR processing completion
   * This function is called when OCR processing is completed with results
   */
  const handleOCRCompleted = useCallback(
    (data: {
      executionId?: string;
      googleSheetsUrl?: string;
      processedFiles?: number;
      totalFiles?: number;
      hasBusinessData?: boolean;
      schemaWarnings?: string[];
      idempotencyKey?: string;
      diagnostics?: {
        httpStatus?: number;
        contentType?: string;
        attemptCount?: number;
        elapsedMs?: number;
        transportWarnings?: string[];
      };
      rawResponse?: unknown;
      /** 增强版webhook响应数据 */
      enhancedData?: EnhancedWebhookResponse;
    }) => {
      console.log('OCR处理完成，接收到数据:', data);
      setCompletedData(data);
      setProcessingStatus('completed');
      setCurrentStep(3);
      setLoading(false);

      const hasResultPayload = Boolean(
        data?.hasBusinessData ||
          data?.enhancedData ||
          data?.executionId ||
          data?.googleSheetsUrl
      );
      if (!hasResultPayload) {
        message.warning(
          '识别请求已提交，但未返回可展示结果。请稍后点击“刷新结果”，或检查 n8n 执行日志。'
        );
      }

      setResultsRefreshToken(prev => prev + 1);
      pollForLatestResults(data.executionId);
    },
    [message, pollForLatestResults]
  );

  const handleOCRFailed = useCallback(
    (err: Error) => {
      const errorMessage = err.message || t('invoiceOCR.upload.processFailed');
      stopResultPolling();
      setError(errorMessage);
      setProcessingStatus('error');
      setLoading(false);
      message.error(errorMessage);
      showError({
        title: t('invoiceOCR.upload.processFailed'),
        message: errorMessage,
        details: err.stack,
      });

      trackInvoiceOcrEvent('invoice_ocr_upload_failed', {
        workflowId: invoiceOcrConfig.workflowId,
        reason: errorMessage,
      });
    },
    [invoiceOcrConfig.workflowId, message, showError, stopResultPolling, t]
  );

  const handleTestWebhookConnection = useCallback(async () => {
    setTestingWebhook(true);
    try {
      const isReachable = await n8nWebhookService.testWebhookConnection(
        invoiceOcrConfig.webhookUrl
      );
      if (isReachable) {
        message.success('Webhook 连通性检查通过');
      } else {
        message.warning('Webhook 不可达，请检查 URL、网络或 n8n 服务状态');
      }
    } catch (testError) {
      console.error('Webhook health check failed:', testError);
      message.error('Webhook 连通性检查失败');
    } finally {
      setTestingWebhook(false);
    }
  }, [invoiceOcrConfig.webhookUrl, message]);

  /**
   * Load data when component initializes
   */
  useEffect(() => {
    void loadInitialData();
  }, [invoiceOcrConfig.workflowId]);

  useEffect(
    () => () => {
      stopResultPolling();
    },
    [stopResultPolling]
  );

  /**
   * Load initial data
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resultsData, statsData] = await Promise.all([
        invoiceOCRService.getResultsList(invoiceOcrConfig.workflowId),
        invoiceOCRService.getStats(invoiceOcrConfig.workflowId),
      ]);

      setOcrResults(resultsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showError({
        title: t('globalMessages.refreshFailed'),
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle file upload success
   */
  const handleFilesUploaded = useCallback((files: InvoiceOCRFile[]) => {
    setUploadedFiles(files);
    setCurrentStep(1);
    setProcessingStatus('uploading');
  }, []);

  /**
   * Restart processing
   */
  const handleRestart = () => {
    stopResultPolling();
    setUploadedFiles([]);
    setOcrResults([]);
    setProcessingStatus('idle');
    setCurrentStep(0);
    setError(null);
    setCompletedData(null);
  };

  /**
   * Handle file deletion
   */
  const handleFileDelete = useCallback((fileId: string) => {
    setOcrResults(prev => prev.filter(result => result.id !== fileId));
    message.success(t('globalMessages.deleteSuccess'));
  }, []);

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
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'process';
      case 'uploading':
        return 'process';
      case 'idle':
        return 'wait';
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
            <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
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
            <Button
              loading={testingWebhook}
              onClick={handleTestWebhookConnection}
            >
              检查Webhook
            </Button>
            {isPollingResults && (
              <Badge status='processing' text='结果同步中' />
            )}
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
        status={
          processingStatus === 'completed'
            ? 'finish'
            : processingStatus === 'error'
              ? 'error'
              : processingStatus === 'processing' ||
                  processingStatus === 'uploading'
                ? 'process'
                : 'wait'
        }
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
      {isPollingResults && (
        <Alert
          message='识别完成，正在同步结果'
          description='系统正在自动轮询最新 OCR 结果，请稍候。'
          type='info'
          showIcon
          style={{ marginTop: 16 }}
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
          title={
            <span style={{ fontSize: '16px' }}>
              {t('invoiceOCR.upload.title')}
            </span>
          }
          extra={
            <Space>
              <InfoCircleOutlined />
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {t('invoiceOCR.upload.supportedFormats')}
              </Text>
            </Space>
          }
        >
          <InvoiceFileUpload
            workflowId={invoiceOcrConfig.workflowId}
            webhookUrl={invoiceOcrConfig.webhookUrl}
            onUploadSuccess={batchTask => {
              console.log('Upload success:', batchTask);
            }}
            onUploadError={handleOCRFailed}
            onOCRProcess={handleProcessOCR}
            onOCRCompleted={handleOCRCompleted}
            ocrProcessing={loading || isPollingResults}
          />
        </Card>
      );
    }

    return (
      <InvoiceOCRResults
        workflowId={invoiceOcrConfig.workflowId}
        showStats={true}
        showHistory={true}
        processingStatus={processingStatus}
        completedData={completedData || {}}
        refreshToken={resultsRefreshToken}
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
          title={errorInfo?.title}
          message={errorInfo?.message || ''}
          details={errorInfo?.details}
          troubleshooting={errorInfo?.troubleshooting}
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
