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
  Descriptions,
  Tag,
  List,
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
  CopyOutlined,
} from '@ant-design/icons';
import { getInvoiceOcrConfig } from '@/config/invoiceOcrConfig';
import {
  invoiceOCRService,
  type InvoiceOcrClientHealthSnapshot,
  type InvoiceOcrResultSyncCheckResult,
  type InvoiceOcrSupabaseCheckResult,
} from '../../../services/invoiceOCRService';
import { trackInvoiceOcrEvent } from '@/services/invoiceOcrTelemetry';
import {
  n8nWebhookService,
  type WebhookConnectionCheckResult,
} from '@/services/n8nWebhookService';
import {
  appendInvoiceOcrDiagnosticHistory,
  buildInvoiceOcrTraceId,
  getInvoiceOcrDiagnosticHistory,
  redactSensitiveData,
  type InvoiceOcrDiagnosticHistoryEntry,
} from '@/services/invoiceOcrDiagnosticToolkit';
import { normalizeInvoiceOcrError } from '@/services/invoiceOcrErrorMap';
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
type InvoiceOcrTelemetryRuntime = typeof globalThis & {
  __WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__?: unknown[];
};

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
  const postSuccessDiagnosticsTimerRef = useRef<number | null>(null);
  const diagnosticsArchiveTimerRef = useRef<number | null>(null);
  const autoDiagnosticsDoneRef = useRef(false);
  const currentTraceIdRef = useRef('');
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
  const [testingResultSync, setTestingResultSync] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [diagnosticHistory, setDiagnosticHistory] = useState<
    InvoiceOcrDiagnosticHistoryEntry[]
  >([]);
  const [pollingErrorHint, setPollingErrorHint] = useState<string | null>(null);
  const [webhookHealth, setWebhookHealth] =
    useState<WebhookConnectionCheckResult | null>(null);
  const [resultSyncHealth, setResultSyncHealth] =
    useState<InvoiceOcrResultSyncCheckResult | null>(null);
  const [supabaseHealth, setSupabaseHealth] =
    useState<InvoiceOcrSupabaseCheckResult | null>(null);

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
    traceId?: string;
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
      traceparent?: string;
      backendTraceparent?: string;
      signatureVerified?: boolean;
    };
    rawResponse?: unknown;
    clientHealth?: InvoiceOcrClientHealthSnapshot;
    /** 增强版webhook响应数据 */
    enhancedData?: EnhancedWebhookResponse;
  } | null>(null);

  const stopResultPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      window.clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsPollingResults(false);
  }, []);

  const clearPostSuccessDiagnosticsTimer = useCallback(() => {
    if (postSuccessDiagnosticsTimerRef.current) {
      window.clearTimeout(postSuccessDiagnosticsTimerRef.current);
      postSuccessDiagnosticsTimerRef.current = null;
    }
  }, []);

  const clearDiagnosticsArchiveTimer = useCallback(() => {
    if (diagnosticsArchiveTimerRef.current) {
      window.clearInterval(diagnosticsArchiveTimerRef.current);
      diagnosticsArchiveTimerRef.current = null;
    }
  }, []);

  const buildClientHealthSnapshot = useCallback(
    (): InvoiceOcrClientHealthSnapshot => ({
      capturedAt: new Date().toISOString(),
      webhook: webhookHealth
        ? {
            reachable: webhookHealth.reachable,
            checkedAt: webhookHealth.checkedAt,
            latencyMs: webhookHealth.latencyMs,
            ...(typeof webhookHealth.status === 'number'
              ? { status: webhookHealth.status }
              : {}),
            ...(webhookHealth.statusText
              ? { statusText: webhookHealth.statusText }
              : {}),
            ...(webhookHealth.errorMessage
              ? { errorMessage: webhookHealth.errorMessage }
              : {}),
            ...(webhookHealth.requestUrl
              ? { requestUrl: webhookHealth.requestUrl }
              : {}),
          }
        : null,
      resultSync: resultSyncHealth || null,
      supabase: supabaseHealth || null,
    }),
    [resultSyncHealth, supabaseHealth, webhookHealth]
  );

  const runFullDiagnostics = useCallback(
    async (options?: {
      silent?: boolean;
      source?: InvoiceOcrDiagnosticHistoryEntry['source'];
    }) => {
      const silent = Boolean(options?.silent);
      const source = options?.source || 'manual_diagnostics';
      setRunningDiagnostics(true);

      try {
        const [webhook, resultSync, supabase] = await Promise.all([
          n8nWebhookService.testWebhookConnectionDetailed(
            invoiceOcrConfig.webhookUrl
          ),
          invoiceOCRService.testResultSyncConnection(
            invoiceOcrConfig.workflowId
          ),
          invoiceOCRService.testSupabaseConnection(),
        ]);

        setWebhookHealth(webhook);
        setResultSyncHealth(resultSync);
        setSupabaseHealth(supabase);

        trackInvoiceOcrEvent('invoice_ocr_webhook_health_checked', {
          workflowId: invoiceOcrConfig.workflowId,
          reachable: webhook.reachable,
          status: webhook.status || 0,
          latencyMs: webhook.latencyMs,
          errorMessage: webhook.errorMessage || '',
        });
        trackInvoiceOcrEvent('invoice_ocr_result_sync_health_checked', {
          workflowId: invoiceOcrConfig.workflowId,
          reachable: resultSync.reachable,
          latencyMs: resultSync.latencyMs,
          httpStatus: resultSync.httpStatus || 0,
          resultCount: resultSync.resultCount || 0,
          totalCount: resultSync.totalCount || 0,
          errorMessage: resultSync.errorMessage || '',
        });
        trackInvoiceOcrEvent('invoice_ocr_supabase_health_checked', {
          workflowId: invoiceOcrConfig.workflowId,
          configured: supabase.configured,
          reachable: supabase.reachable,
          latencyMs: supabase.latencyMs,
          httpStatus: supabase.httpStatus || 0,
          errorMessage: supabase.errorMessage || '',
        });

        const allHealthy =
          webhook.reachable &&
          resultSync.reachable &&
          supabase.configured &&
          supabase.reachable;

        const snapshot = redactSensitiveData({
          capturedAt: new Date().toISOString(),
          webhook,
          resultSync,
          supabase,
          traceId: currentTraceIdRef.current || '',
        }) as Record<string, unknown>;
        const history = appendInvoiceOcrDiagnosticHistory({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          capturedAt: new Date().toISOString(),
          workflowId: invoiceOcrConfig.workflowId,
          source,
          healthy: allHealthy,
          snapshot,
        });
        setDiagnosticHistory(history);

        if (!silent) {
          if (allHealthy) {
            message.success('诊断通过：Webhook、结果同步、Supabase 均正常');
          } else {
            message.warning('诊断完成：检测到异常，请查看状态徽标或诊断中心');
          }
        }
      } catch (diagnosticError) {
        console.error(
          'Failed to run full invoice OCR diagnostics:',
          diagnosticError
        );
        const mapped = normalizeInvoiceOcrError(diagnosticError, 'unknown');
        if (!silent) {
          message.error(`${mapped.title}：${mapped.message}`);
        }
      } finally {
        setRunningDiagnostics(false);
      }
    },
    [
      invoiceOcrConfig.webhookUrl,
      invoiceOcrConfig.workflowId,
      message,
      currentTraceIdRef,
      setResultSyncHealth,
      setSupabaseHealth,
      setWebhookHealth,
    ]
  );

  const handleExportPageDiagnostics = useCallback(() => {
    const runtime = globalThis as InvoiceOcrTelemetryRuntime;
    const telemetryBuffer = Array.isArray(
      runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__
    )
      ? runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.slice(-200)
      : [];

    const payload = redactSensitiveData({
      exportedAt: new Date().toISOString(),
      workflowId: invoiceOcrConfig.workflowId,
      traceId: currentTraceIdRef.current || '',
      processingStatus,
      isPollingResults,
      pollingErrorHint,
      pageError: error,
      currentHealth: buildClientHealthSnapshot(),
      latestExecution: completedData
        ? {
            executionId: completedData.executionId || '',
            requestKey: completedData.idempotencyKey || '',
            hasBusinessData: Boolean(completedData.hasBusinessData),
            schemaWarnings: completedData.schemaWarnings || [],
            diagnostics: completedData.diagnostics || {},
          }
        : null,
      stats,
      resultCount: ocrResults.length,
      diagnosticHistory,
      telemetryBuffer,
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice-ocr-page-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success('页面诊断快照已导出');
  }, [
    buildClientHealthSnapshot,
    completedData,
    currentTraceIdRef,
    diagnosticHistory,
    error,
    invoiceOcrConfig.workflowId,
    isPollingResults,
    message,
    ocrResults.length,
    pollingErrorHint,
    processingStatus,
    stats,
  ]);

  const handleCopyPageDiagnostics = useCallback(async () => {
    try {
      const runtime = globalThis as InvoiceOcrTelemetryRuntime;
      const telemetryBuffer = Array.isArray(
        runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__
      )
        ? runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.slice(-200)
        : [];
      const payload = redactSensitiveData({
        exportedAt: new Date().toISOString(),
        workflowId: invoiceOcrConfig.workflowId,
        traceId: currentTraceIdRef.current || '',
        processingStatus,
        isPollingResults,
        pollingErrorHint,
        pageError: error,
        currentHealth: buildClientHealthSnapshot(),
        latestExecution: completedData
          ? {
              executionId: completedData.executionId || '',
              requestKey: completedData.idempotencyKey || '',
              hasBusinessData: Boolean(completedData.hasBusinessData),
              schemaWarnings: completedData.schemaWarnings || [],
              diagnostics: completedData.diagnostics || {},
            }
          : null,
        stats,
        resultCount: ocrResults.length,
        diagnosticHistory,
        telemetryBuffer,
      });
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      message.success('诊断 JSON 已复制到剪贴板');
    } catch (copyError) {
      console.error('Failed to copy diagnostics:', copyError);
      message.error('复制失败，请使用“导出诊断”');
    }
  }, [
    buildClientHealthSnapshot,
    completedData,
    currentTraceIdRef,
    diagnosticHistory,
    error,
    invoiceOcrConfig.workflowId,
    isPollingResults,
    message,
    ocrResults.length,
    pollingErrorHint,
    processingStatus,
    stats,
  ]);

  const pollForLatestResults = useCallback(
    (executionId?: string) => {
      stopResultPolling();
      const pollStartedAt = Date.now();
      let pollingBusy = false;
      let consecutiveFailures = 0;
      let pollingStopped = false;
      const failureThreshold = Math.max(
        1,
        invoiceOcrConfig.resultPollingFailureThreshold
      );

      setIsPollingResults(true);
      setPollingErrorHint(null);
      trackInvoiceOcrEvent('invoice_ocr_polling_started', {
        workflowId: invoiceOcrConfig.workflowId,
        executionId: executionId || '',
      });

      const getNextInterval = (): number => {
        if (
          typeof document !== 'undefined' &&
          document.visibilityState === 'hidden'
        ) {
          return invoiceOcrConfig.resultPollingHiddenIntervalMs;
        }
        return invoiceOcrConfig.resultPollingIntervalMs;
      };

      const scheduleNextPoll = () => {
        if (pollingStopped) {
          return;
        }
        if (pollingTimerRef.current) {
          window.clearTimeout(pollingTimerRef.current);
        }
        pollingTimerRef.current = window.setTimeout(
          () => void tryLoadResults(),
          getNextInterval()
        );
      };

      const tryLoadResults = async () => {
        if (pollingBusy || pollingStopped) {
          return;
        }
        pollingBusy = true;
        try {
          const latestResults = await invoiceOCRService.getResultsListWithRetry(
            invoiceOcrConfig.workflowId,
            { page: 1, pageSize: 100 },
            { maxAttempts: 3, baseDelayMs: 250 }
          );
          consecutiveFailures = 0;
          setPollingErrorHint(null);
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
            pollingStopped = true;
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
            pollingStopped = true;
            stopResultPolling();
            setPollingErrorHint(
              '轮询结果超时，请点击“刷新结果”或执行“一键诊断”定位问题。'
            );
            trackInvoiceOcrEvent('invoice_ocr_polling_timeout', {
              workflowId: invoiceOcrConfig.workflowId,
              executionId: executionId || '',
              elapsedMs: elapsed,
            });
            if (
              invoiceOCRService.shouldEmitAlert(
                'invoice_ocr_polling_timeout',
                invoiceOcrConfig.alertQuietWindowMinutes
              )
            ) {
              message.warning(
                '识别已提交，但结果尚未落库。请稍后点击“刷新结果”或查看 n8n 执行日志。'
              );
            }
            void runFullDiagnostics({
              silent: true,
              source: 'auto_polling_timeout',
            });
          }
        } catch (pollError) {
          console.error('Invoice OCR result polling failed:', pollError);
          const mappedError = normalizeInvoiceOcrError(
            pollError,
            'result_sync'
          );
          consecutiveFailures += 1;
          const pollErrorMessage =
            pollError instanceof Error ? pollError.message : 'unknown_error';
          setPollingErrorHint(
            `结果轮询失败（${consecutiveFailures}/${failureThreshold}）：${mappedError.message}`
          );

          if (consecutiveFailures >= failureThreshold) {
            pollingStopped = true;
            stopResultPolling();
            setPollingErrorHint(
              '连续轮询失败，无法同步最新结果。请检查 Supabase 连通性或点击“检查Webhook”。'
            );
            trackInvoiceOcrEvent('invoice_ocr_polling_failed', {
              workflowId: invoiceOcrConfig.workflowId,
              executionId: executionId || '',
              attempts: consecutiveFailures,
              reason: pollErrorMessage,
            });
            void runFullDiagnostics({
              silent: true,
              source: 'auto_polling_failure',
            });
            if (
              invoiceOCRService.shouldEmitAlert(
                'invoice_ocr_polling_failure',
                invoiceOcrConfig.alertQuietWindowMinutes
              )
            ) {
              message.error('结果同步失败，请检查数据连接并稍后重试。');
            }
          }
        } finally {
          pollingBusy = false;
          if (!pollingStopped) {
            scheduleNextPoll();
          }
        }
      };

      void tryLoadResults();
    },
    [
      invoiceOcrConfig.resultPollingFailureThreshold,
      invoiceOcrConfig.resultPollingHiddenIntervalMs,
      invoiceOcrConfig.resultPollingIntervalMs,
      invoiceOcrConfig.resultPollingTimeoutMs,
      invoiceOcrConfig.alertQuietWindowMinutes,
      invoiceOcrConfig.workflowId,
      message,
      normalizeInvoiceOcrError,
      runFullDiagnostics,
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

      currentTraceIdRef.current = buildInvoiceOcrTraceId(
        invoiceOcrConfig.workflowId
      );

      stopResultPolling();
      clearPostSuccessDiagnosticsTimer();
      processStartIsoRef.current = new Date().toISOString();
      baselineResultCountRef.current = ocrResults.length;
      setCompletedData(null);
      setPollingErrorHint(null);
      setProcessingStatus('processing');
      setLoading(true);
      setError(null);
      setCurrentStep(2);
      message.info(t('invoiceOCR.upload.processing'));

      trackInvoiceOcrEvent('invoice_ocr_upload_started', {
        workflowId: invoiceOcrConfig.workflowId,
        fileCount: files.length,
        traceId: currentTraceIdRef.current,
      });
    },
    [
      t,
      message,
      invoiceOcrConfig.workflowId,
      ocrResults.length,
      clearPostSuccessDiagnosticsTimer,
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
      traceId?: string;
      hasBusinessData?: boolean;
      schemaWarnings?: string[];
      idempotencyKey?: string;
      diagnostics?: {
        httpStatus?: number;
        contentType?: string;
        attemptCount?: number;
        elapsedMs?: number;
        transportWarnings?: string[];
        traceparent?: string;
        backendTraceparent?: string;
        signatureVerified?: boolean;
      };
      rawResponse?: unknown;
      clientHealth?: InvoiceOcrClientHealthSnapshot;
      /** 增强版webhook响应数据 */
      enhancedData?: EnhancedWebhookResponse;
    }) => {
      console.log('OCR处理完成，接收到数据:', data);
      if (data.traceId) {
        currentTraceIdRef.current = data.traceId;
      }
      setCompletedData({
        ...data,
        clientHealth: buildClientHealthSnapshot(),
      });
      setProcessingStatus('completed');
      setCurrentStep(3);
      setLoading(false);
      setPollingErrorHint(null);

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
      clearPostSuccessDiagnosticsTimer();
      postSuccessDiagnosticsTimerRef.current = window.setTimeout(() => {
        void runFullDiagnostics({
          silent: true,
          source: 'auto_post_success',
        });
      }, invoiceOcrConfig.postSuccessRediagnoseDelayMs);
    },
    [
      buildClientHealthSnapshot,
      clearPostSuccessDiagnosticsTimer,
      invoiceOcrConfig.postSuccessRediagnoseDelayMs,
      message,
      pollForLatestResults,
      runFullDiagnostics,
    ]
  );

  const handleOCRFailed = useCallback(
    (err: Error) => {
      const errorMessage = err.message || t('invoiceOCR.upload.processFailed');
      stopResultPolling();
      clearPostSuccessDiagnosticsTimer();
      setError(errorMessage);
      setPollingErrorHint(null);
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
    [
      clearPostSuccessDiagnosticsTimer,
      invoiceOcrConfig.workflowId,
      message,
      showError,
      stopResultPolling,
      t,
    ]
  );

  const handleTestWebhookConnection = useCallback(async () => {
    setTestingWebhook(true);
    try {
      const health = await n8nWebhookService.testWebhookConnectionDetailed(
        invoiceOcrConfig.webhookUrl
      );

      setWebhookHealth(health);
      trackInvoiceOcrEvent('invoice_ocr_webhook_health_checked', {
        workflowId: invoiceOcrConfig.workflowId,
        reachable: health.reachable,
        status: health.status || 0,
        latencyMs: health.latencyMs,
        errorMessage: health.errorMessage || '',
      });

      if (health.reachable) {
        const statusLabel =
          typeof health.status === 'number' ? `HTTP ${health.status}` : 'OK';
        message.success(
          `Webhook 连通性检查通过（${statusLabel}，${health.latencyMs}ms）`
        );
      } else if (typeof health.status === 'number') {
        const mapped = normalizeInvoiceOcrError(
          new Error(`HTTP ${health.status} ${health.statusText || ''}`),
          'webhook'
        );
        message.warning(`Webhook 异常：${mapped.message}`);
      } else {
        const mapped = normalizeInvoiceOcrError(
          new Error(health.errorMessage || 'webhook_unreachable'),
          'webhook'
        );
        message.error(`Webhook 不可达：${mapped.message}`);
      }
    } catch (testError) {
      console.error('Webhook health check failed:', testError);
      const mapped = normalizeInvoiceOcrError(testError, 'webhook');
      message.error(`${mapped.title}：${mapped.message}`);
    } finally {
      setTestingWebhook(false);
    }
  }, [
    invoiceOcrConfig.webhookUrl,
    invoiceOcrConfig.workflowId,
    message,
    normalizeInvoiceOcrError,
  ]);

  const handleTestResultSyncConnection = useCallback(async () => {
    setTestingResultSync(true);
    try {
      const health = await invoiceOCRService.testResultSyncConnection(
        invoiceOcrConfig.workflowId
      );
      setResultSyncHealth(health);

      trackInvoiceOcrEvent('invoice_ocr_result_sync_health_checked', {
        workflowId: invoiceOcrConfig.workflowId,
        reachable: health.reachable,
        latencyMs: health.latencyMs,
        httpStatus: health.httpStatus || 0,
        resultCount: health.resultCount || 0,
        totalCount: health.totalCount || 0,
        errorMessage: health.errorMessage || '',
      });

      if (health.reachable) {
        message.success(
          `结果同步接口正常（${health.latencyMs}ms，当前返回 ${health.resultCount || 0} 条）`
        );
      } else {
        const mapped = normalizeInvoiceOcrError(
          new Error(health.errorMessage || 'result_sync_unreachable'),
          'result_sync'
        );
        message.error(`结果同步接口异常：${mapped.message}`);
      }
    } catch (checkError) {
      console.error('Result sync health check failed:', checkError);
      const mapped = normalizeInvoiceOcrError(checkError, 'result_sync');
      message.error(`${mapped.title}：${mapped.message}`);
    } finally {
      setTestingResultSync(false);
    }
  }, [invoiceOcrConfig.workflowId, message, normalizeInvoiceOcrError]);

  const handleTestSupabaseConnection = useCallback(async () => {
    setTestingSupabase(true);
    try {
      const health = await invoiceOCRService.testSupabaseConnection();
      setSupabaseHealth(health);

      trackInvoiceOcrEvent('invoice_ocr_supabase_health_checked', {
        workflowId: invoiceOcrConfig.workflowId,
        configured: health.configured,
        reachable: health.reachable,
        latencyMs: health.latencyMs,
        httpStatus: health.httpStatus || 0,
        errorMessage: health.errorMessage || '',
      });

      if (!health.configured) {
        message.error(
          'Supabase 未配置，请检查 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'
        );
      } else if (health.reachable) {
        const statusText =
          typeof health.httpStatus === 'number'
            ? `HTTP ${health.httpStatus}`
            : 'OK';
        message.success(
          `Supabase 连通性正常（${statusText}，${health.latencyMs}ms）`
        );
      } else {
        const mapped = normalizeInvoiceOcrError(
          new Error(health.errorMessage || 'supabase_unreachable'),
          'supabase'
        );
        message.error(`Supabase 异常：${mapped.message}`);
      }
    } catch (checkError) {
      console.error('Supabase health check failed:', checkError);
      const mapped = normalizeInvoiceOcrError(checkError, 'supabase');
      message.error(`${mapped.title}：${mapped.message}`);
    } finally {
      setTestingSupabase(false);
    }
  }, [invoiceOcrConfig.workflowId, message, normalizeInvoiceOcrError]);

  /**
   * Load data when component initializes
   */
  useEffect(() => {
    void loadInitialData();
  }, [invoiceOcrConfig.workflowId]);

  useEffect(() => {
    if (autoDiagnosticsDoneRef.current) {
      return;
    }
    autoDiagnosticsDoneRef.current = true;
    void runFullDiagnostics({ silent: true });
  }, [runFullDiagnostics]);

  useEffect(() => {
    setDiagnosticHistory(getInvoiceOcrDiagnosticHistory());
  }, []);

  useEffect(
    () => () => {
      stopResultPolling();
      clearPostSuccessDiagnosticsTimer();
      clearDiagnosticsArchiveTimer();
    },
    [
      clearDiagnosticsArchiveTimer,
      clearPostSuccessDiagnosticsTimer,
      stopResultPolling,
    ]
  );

  useEffect(() => {
    clearDiagnosticsArchiveTimer();
    const intervalMs = Math.max(
      60000,
      invoiceOcrConfig.diagnosticsArchiveIntervalMs
    );
    diagnosticsArchiveTimerRef.current = window.setInterval(() => {
      void runFullDiagnostics({
        silent: true,
        source: 'scheduled_archive',
      });
    }, intervalMs);
    return () => {
      clearDiagnosticsArchiveTimer();
    };
  }, [
    clearDiagnosticsArchiveTimer,
    invoiceOcrConfig.diagnosticsArchiveIntervalMs,
    runFullDiagnostics,
  ]);

  /**
   * Load initial data
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resultsData, statsData] = await Promise.all([
        invoiceOCRService.getResultsListWithRetry(invoiceOcrConfig.workflowId),
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
    clearPostSuccessDiagnosticsTimer();
    setUploadedFiles([]);
    setOcrResults([]);
    setProcessingStatus('idle');
    setCurrentStep(0);
    setError(null);
    setPollingErrorHint(null);
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

  const renderWebhookHealthBadge = () => {
    if (!webhookHealth) {
      return <Badge status='default' text='Webhook 未检查' />;
    }

    const checkedTime = new Date(webhookHealth.checkedAt).toLocaleTimeString(
      'zh-CN',
      { hour12: false }
    );
    if (webhookHealth.reachable) {
      return (
        <Badge
          status='success'
          text={`Webhook 正常 (${webhookHealth.latencyMs}ms @ ${checkedTime})`}
        />
      );
    }

    const statusText =
      typeof webhookHealth.status === 'number'
        ? `HTTP ${webhookHealth.status}`
        : '不可达';
    return (
      <Badge
        status='error'
        text={`Webhook 异常 (${statusText} @ ${checkedTime})`}
      />
    );
  };

  const renderResultSyncHealthBadge = () => {
    if (!resultSyncHealth) {
      return <Badge status='default' text='结果同步未检查' />;
    }

    const checkedTime = new Date(resultSyncHealth.checkedAt).toLocaleTimeString(
      'zh-CN',
      { hour12: false }
    );
    if (resultSyncHealth.reachable) {
      return (
        <Badge
          status='success'
          text={`结果同步正常 (${resultSyncHealth.latencyMs}ms @ ${checkedTime})`}
        />
      );
    }

    const statusText =
      typeof resultSyncHealth.httpStatus === 'number'
        ? `HTTP ${resultSyncHealth.httpStatus}`
        : '不可达';
    return (
      <Badge
        status='error'
        text={`结果同步异常 (${statusText} @ ${checkedTime})`}
      />
    );
  };

  const renderSupabaseHealthBadge = () => {
    if (!supabaseHealth) {
      return <Badge status='default' text='Supabase 未检查' />;
    }

    const checkedTime = new Date(supabaseHealth.checkedAt).toLocaleTimeString(
      'zh-CN',
      { hour12: false }
    );
    if (!supabaseHealth.configured) {
      return <Badge status='error' text='Supabase 未配置' />;
    }

    if (supabaseHealth.reachable) {
      return (
        <Badge
          status='success'
          text={`Supabase 正常 (${supabaseHealth.latencyMs}ms @ ${checkedTime})`}
        />
      );
    }

    const statusText =
      typeof supabaseHealth.httpStatus === 'number'
        ? `HTTP ${supabaseHealth.httpStatus}`
        : '不可达';
    return (
      <Badge
        status='error'
        text={`Supabase 异常 (${statusText} @ ${checkedTime})`}
      />
    );
  };

  const allDiagnosticsHealthy = Boolean(
    webhookHealth?.reachable &&
      resultSyncHealth?.reachable &&
      supabaseHealth?.configured &&
      supabaseHealth?.reachable
  );

  const formatCheckTime = (value?: string): string =>
    value
      ? new Date(value).toLocaleString('zh-CN', { hour12: false })
      : '未检查';

  const formatDiagnosticSource = (
    source: InvoiceOcrDiagnosticHistoryEntry['source']
  ): string => {
    switch (source) {
      case 'manual_diagnostics':
        return '手动诊断';
      case 'auto_polling_timeout':
        return '轮询超时自动诊断';
      case 'auto_polling_failure':
        return '轮询失败自动诊断';
      case 'auto_post_success':
        return '识别完成后复检';
      case 'scheduled_archive':
        return '定时归档快照';
      default:
        return source;
    }
  };

  const handleCopyExecutionBundle = useCallback(async () => {
    if (!completedData?.executionId && !completedData?.idempotencyKey) {
      message.warning('当前没有可复制的执行信息');
      return;
    }
    const bundle = {
      executionId: completedData?.executionId || '',
      requestKey: completedData?.idempotencyKey || '',
      traceId: completedData?.traceId || currentTraceIdRef.current || '',
      exportedAt: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      message.success('执行信息组合已复制');
    } catch (copyError) {
      console.error('Failed to copy execution bundle:', copyError);
      message.error('复制失败，请稍后重试');
    }
  }, [completedData, message]);

  /**
   * Render page header
   */
  const renderHeader = () => (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[12, 12]} justify='space-between' align='top'>
        <Col xs={24} md={8}>
          <Space align='center'>
            <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
              {t('invoiceOCR.title')}
            </Title>
          </Space>
        </Col>
        <Col xs={24} md={16}>
          <Space
            wrap
            size={[8, 8]}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
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
            <Button
              loading={testingResultSync}
              onClick={handleTestResultSyncConnection}
            >
              检查结果同步
            </Button>
            <Button
              loading={testingSupabase}
              onClick={handleTestSupabaseConnection}
            >
              检查Supabase
            </Button>
            <Button
              type='primary'
              loading={runningDiagnostics}
              onClick={() => void runFullDiagnostics()}
            >
              一键诊断
            </Button>
            <Button onClick={() => setDiagnosticsVisible(true)}>
              诊断中心
            </Button>
            <Button onClick={handleExportPageDiagnostics}>导出诊断</Button>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                void handleCopyPageDiagnostics();
              }}
            >
              复制诊断JSON
            </Button>
            {renderWebhookHealthBadge()}
            {renderResultSyncHealthBadge()}
            {renderSupabaseHealthBadge()}
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
      {pollingErrorHint && (
        <Alert
          message='结果同步异常'
          description={pollingErrorHint}
          type='warning'
          showIcon
          style={{ marginTop: 16 }}
          action={
            <Space>
              <Button
                size='small'
                onClick={() => void handleTestResultSyncConnection()}
              >
                检查结果同步
              </Button>
              <Button
                size='small'
                onClick={() => void handleTestWebhookConnection()}
              >
                检查Webhook
              </Button>
              <Button
                size='small'
                onClick={() => void handleTestSupabaseConnection()}
              >
                检查Supabase
              </Button>
              <Button size='small' onClick={() => void runFullDiagnostics()}>
                一键诊断
              </Button>
              <Button size='small' onClick={() => setDiagnosticsVisible(true)}>
                诊断中心
              </Button>
            </Space>
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

        <Modal
          title='Invoice OCR 诊断中心'
          open={diagnosticsVisible}
          onCancel={() => setDiagnosticsVisible(false)}
          width={920}
          footer={
            <Space>
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  void handleCopyPageDiagnostics();
                }}
              >
                复制诊断JSON
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  void handleCopyExecutionBundle();
                }}
              >
                复制执行信息
              </Button>
              <Button onClick={handleExportPageDiagnostics}>导出诊断</Button>
              <Button
                type='primary'
                loading={runningDiagnostics}
                onClick={() => void runFullDiagnostics()}
              >
                重新诊断
              </Button>
            </Space>
          }
        >
          <Alert
            type={allDiagnosticsHealthy ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              allDiagnosticsHealthy
                ? '当前链路健康：Webhook、结果同步、Supabase 均可用'
                : '检测到链路异常，请结合下方状态排查'
            }
            description={
              pollingErrorHint
                ? `当前轮询提示：${pollingErrorHint}`
                : '可优先检查最近一次异常状态和延迟峰值。'
            }
          />

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {completedData?.executionId && (
              <Tag color='blue'>Execution ID: {completedData.executionId}</Tag>
            )}
            {completedData?.idempotencyKey && (
              <Tag color='purple'>
                Request Key: {completedData.idempotencyKey}
              </Tag>
            )}
            {(completedData?.traceId || currentTraceIdRef.current) && (
              <Tag color='geekblue'>
                Trace ID: {completedData?.traceId || currentTraceIdRef.current}
              </Tag>
            )}
          </Space>

          <Card
            size='small'
            title='最近诊断历史（最多 50 条）'
            style={{ marginBottom: 16 }}
          >
            {diagnosticHistory.length === 0 ? (
              <Text type='secondary'>暂无历史记录</Text>
            ) : (
              <List
                size='small'
                dataSource={diagnosticHistory.slice(0, 10)}
                renderItem={item => (
                  <List.Item>
                    <Space size='middle' wrap>
                      <Tag color={item.healthy ? 'success' : 'error'}>
                        {item.healthy ? '健康' : '异常'}
                      </Tag>
                      <Text>{formatDiagnosticSource(item.source)}</Text>
                      <Text type='secondary'>
                        {formatCheckTime(item.capturedAt)}
                      </Text>
                      <Text type='secondary'>ID: {item.id}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Descriptions bordered size='small' column={1}>
            <Descriptions.Item label='Webhook'>
              <Space size='middle' wrap>
                {webhookHealth ? (
                  webhookHealth.reachable ? (
                    <Tag color='success'>正常</Tag>
                  ) : (
                    <Tag color='error'>异常</Tag>
                  )
                ) : (
                  <Tag>未检查</Tag>
                )}
                <Text type='secondary'>
                  {webhookHealth
                    ? `耗时 ${webhookHealth.latencyMs}ms，状态 ${typeof webhookHealth.status === 'number' ? `HTTP ${webhookHealth.status}` : 'N/A'}`
                    : '暂无数据'}
                </Text>
                <Text type='secondary'>
                  检查时间：{formatCheckTime(webhookHealth?.checkedAt)}
                </Text>
                {webhookHealth?.errorMessage && (
                  <Text type='danger'>{webhookHealth.errorMessage}</Text>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label='结果同步 API'>
              <Space size='middle' wrap>
                {resultSyncHealth ? (
                  resultSyncHealth.reachable ? (
                    <Tag color='success'>正常</Tag>
                  ) : (
                    <Tag color='error'>异常</Tag>
                  )
                ) : (
                  <Tag>未检查</Tag>
                )}
                <Text type='secondary'>
                  {resultSyncHealth
                    ? `耗时 ${resultSyncHealth.latencyMs}ms，状态 ${typeof resultSyncHealth.httpStatus === 'number' ? `HTTP ${resultSyncHealth.httpStatus}` : 'N/A'}`
                    : '暂无数据'}
                </Text>
                <Text type='secondary'>
                  检查时间：{formatCheckTime(resultSyncHealth?.checkedAt)}
                </Text>
                {resultSyncHealth && (
                  <Text type='secondary'>
                    返回条目：{resultSyncHealth.resultCount || 0}
                    {typeof resultSyncHealth.totalCount === 'number'
                      ? ` / 总量 ${resultSyncHealth.totalCount}`
                      : ''}
                  </Text>
                )}
                {resultSyncHealth?.errorMessage && (
                  <Text type='danger'>{resultSyncHealth.errorMessage}</Text>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label='Supabase REST'>
              <Space size='middle' wrap>
                {supabaseHealth ? (
                  !supabaseHealth.configured ? (
                    <Tag color='error'>未配置</Tag>
                  ) : supabaseHealth.reachable ? (
                    <Tag color='success'>正常</Tag>
                  ) : (
                    <Tag color='error'>异常</Tag>
                  )
                ) : (
                  <Tag>未检查</Tag>
                )}
                <Text type='secondary'>
                  {supabaseHealth
                    ? `耗时 ${supabaseHealth.latencyMs}ms，状态 ${typeof supabaseHealth.httpStatus === 'number' ? `HTTP ${supabaseHealth.httpStatus}` : 'N/A'}`
                    : '暂无数据'}
                </Text>
                <Text type='secondary'>
                  检查时间：{formatCheckTime(supabaseHealth?.checkedAt)}
                </Text>
                {supabaseHealth?.requestUrl && (
                  <Text type='secondary'>
                    请求地址：{supabaseHealth.requestUrl}
                  </Text>
                )}
                {supabaseHealth?.errorMessage && (
                  <Text type='danger'>{supabaseHealth.errorMessage}</Text>
                )}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Alert
            style={{ marginTop: 16 }}
            type='info'
            showIcon
            message='排查建议'
            description='若 Webhook 正常但结果同步异常，优先检查 API 服务日志与数据库写入链路；若 Supabase 异常，优先核对运行时密钥与网络连通性。'
          />
        </Modal>

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
