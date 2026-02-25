/**
 * Invoice OCR Results Display Component
 *
 * A comprehensive component for displaying OCR processing results with advanced
 * data visualization, export capabilities, and result management features.
 *
 * Features:
 * - Results table with sorting and filtering
 * - Detailed result view with extracted data
 * - Google Sheets export integration
 * - Result validation and editing
 * - Batch operations support
 * - Progress tracking and status updates
 * - Error handling and retry mechanisms
 *
 * @component
 * @example
 * ```tsx
 * <InvoiceOCRResults
 *   results={ocrResults}
 *   loading={false}
 *   onExportToSheets={() => exportToSheets()}
 *   onValidateResult={(resultId, isValid) => validateResult(resultId, isValid)}
 * />
 * ```
 *
 * @see {@link InvoiceOCRResult} - Result data structure
 * @see {@link InvoiceOCRPage} - Parent page component
 * @see {@link invoiceOCRService} - Service for result operations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Badge,
  Tag,
  Tooltip,
  Progress,
  Statistic,
  Row,
  Col,
  Alert,
  Empty,
  Spin,
  Modal,
  Descriptions,
  List,
  Avatar,
  Divider,
  Dropdown,
  Menu,
  Collapse,
  Tabs,
  Input,
  Radio,
  Checkbox,
} from 'antd';

import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import { useTranslation } from 'react-i18next';
import ErrorModal from '@/components/common/ErrorModal';
import { getInvoiceOcrConfig } from '@/config/invoiceOcrConfig';

const { Panel } = Collapse;
const { TabPane } = Tabs;
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  GoogleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  MoreOutlined,
  CloudDownloadOutlined,
  BulbOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  invoiceOCRService,
  type InvoiceOcrClientHealthSnapshot,
  type InvoiceOcrManualCorrectionHistoryEntry,
} from '../../../../services/invoiceOCRService';
import { redactSensitiveData } from '@/services/invoiceOcrDiagnosticToolkit';
import type {
  InvoiceOCRResult,
  InvoiceOCRBatchTask,
} from '../../../../pages/InformationDashboard/types/invoiceOCR';
import type { EnhancedWebhookResponse } from '@/types/workflow';

const { Title, Text } = Typography;
const { confirm } = Modal;
type InvoiceOcrTelemetryRuntime = typeof globalThis & {
  __WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__?: unknown[];
};

/**
 * Invoice OCR 结果展示组件属性接口
 */
interface InvoiceOCRResultsProps {
  /** 工作流 ID */
  workflowId: string;
  /** 批处理任务 ID */
  batchTaskId?: string;
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 是否显示历史记录 */
  showHistory?: boolean;
  /** 处理状态 */
  processingStatus?:
    | 'idle'
    | 'uploading'
    | 'processing'
    | 'completed'
    | 'error';
  /** 处理完成的数据 */
  completedData?: {
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
  };
  /** 外部刷新触发令牌 */
  refreshToken?: number;
  /** 结果选择回调 */
  onResultSelect?: (result: InvoiceOCRResult) => void;
  /** 批处理任务选择回调 */
  onBatchTaskSelect?: (batchTask: InvoiceOCRBatchTask) => void;
  /** Google Sheets 跳转回调 */
  onGoogleSheetsRedirect?: (results: InvoiceOCRResult[]) => void;
  /** 处理新文件回调 - 重置到上传界面 */
  onProcessNewFiles?: () => void;
}

/**
 * 处理状态颜色映射
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'error';
    case 'pending':
      return 'default';
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * 处理状态图标映射
 */
const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'completed':
      return <CheckCircleOutlined />;
    case 'processing':
      return <ClockCircleOutlined />;
    case 'failed':
      return <ExclamationCircleOutlined />;
    case 'pending':
      return <ClockCircleOutlined />;
    case 'cancelled':
      return <ExclamationCircleOutlined />;
    default:
      return <ClockCircleOutlined />;
  }
};

/**
 * 文件类型图标映射
 */
const getFileTypeIcon = (fileName: string): React.ReactNode => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'tiff':
    case 'bmp':
      return <FileImageOutlined style={{ color: '#52c41a' }} />;
    default:
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
  }
};

type ResultQuickFilter = 'all' | 'completed' | 'low_confidence' | 'recent_24h';
type ResultColumnKey =
  | 'fileName'
  | 'status'
  | 'confidence'
  | 'extractedData'
  | 'industryTags'
  | 'risk'
  | 'completedAt';

interface ResultVersionDiffEntry {
  field: string;
  originalValue: string;
  correctedValue: string;
}

type InvoiceOcrAlertSeverity = 'info' | 'warning' | 'critical';

const getAlertSeverity = (alertCode: string): InvoiceOcrAlertSeverity => {
  if (
    alertCode.includes('rbac') ||
    alertCode.includes('signature') ||
    alertCode.includes('data_sync')
  ) {
    return 'critical';
  }
  if (alertCode.includes('duplicate') || alertCode.includes('quarantine')) {
    return 'warning';
  }
  return 'info';
};

const RESULT_COLUMN_STORAGE_PREFIX = 'invoiceOCR_results_columns_v1';
const RESULT_COLUMN_OPTIONS: Array<{ key: ResultColumnKey; label: string }> = [
  { key: 'fileName', label: '文件名' },
  { key: 'status', label: '状态' },
  { key: 'confidence', label: '置信度' },
  { key: 'extractedData', label: '已提取字段' },
  { key: 'industryTags', label: '行业标签' },
  { key: 'risk', label: '风控提示' },
  { key: 'completedAt', label: '处理时间' },
];
const DEFAULT_RESULT_COLUMN_KEYS = RESULT_COLUMN_OPTIONS.map(
  option => option.key
);

const readPersistedResultColumns = (workflowId: string): ResultColumnKey[] => {
  try {
    if (!workflowId) {
      return DEFAULT_RESULT_COLUMN_KEYS;
    }
    const raw = localStorage.getItem(
      `${RESULT_COLUMN_STORAGE_PREFIX}:${workflowId}`
    );
    if (!raw) {
      return DEFAULT_RESULT_COLUMN_KEYS;
    }
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return DEFAULT_RESULT_COLUMN_KEYS;
    }
    const allowed = new Set<ResultColumnKey>(DEFAULT_RESULT_COLUMN_KEYS);
    const next = parsed.filter((key): key is ResultColumnKey =>
      allowed.has(key as ResultColumnKey)
    );
    return next.length > 0 ? next : DEFAULT_RESULT_COLUMN_KEYS;
  } catch {
    return DEFAULT_RESULT_COLUMN_KEYS;
  }
};

const persistResultColumns = (
  workflowId: string,
  columns: ResultColumnKey[]
): void => {
  try {
    if (!workflowId) {
      return;
    }
    localStorage.setItem(
      `${RESULT_COLUMN_STORAGE_PREFIX}:${workflowId}`,
      JSON.stringify(columns)
    );
  } catch {
    // noop
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringField = (
  record: Record<string, unknown>,
  key: string
): string => {
  const value = record[key];
  return typeof value === 'string' ? value : '';
};

const getRecordField = (
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> => {
  const value = record[key];
  return isRecord(value) ? value : {};
};

const getSearchableText = (result: InvoiceOCRResult): string => {
  const fileName = result.originalFile?.name || '';
  const executionId = result.executionId || '';
  const extracted = isRecord(result.extractedData) ? result.extractedData : {};
  const vendor = getRecordField(extracted, 'vendor');
  const basic = getRecordField(extracted, 'basic');
  const vendorCandidates = [
    getStringField(extracted, 'vendorName'),
    getStringField(vendor, 'name'),
    getStringField(extracted, 'supplier'),
  ]
    .filter((item): item is string => typeof item === 'string')
    .join(' ');
  const invoiceCandidates = [
    getStringField(extracted, 'invoiceNumber'),
    getStringField(basic, 'invoiceNumber'),
    getStringField(extracted, 'invoiceNo'),
  ]
    .filter((item): item is string => typeof item === 'string')
    .join(' ');
  return [fileName, executionId, vendorCandidates, invoiceCandidates]
    .join(' ')
    .toLowerCase();
};

const getResultVendorName = (result: InvoiceOCRResult): string => {
  const extracted = isRecord(result.extractedData) ? result.extractedData : {};
  const vendorName = getStringField(extracted, 'vendorName').trim();
  if (vendorName) {
    return vendorName;
  }
  const vendor = getRecordField(extracted, 'vendor');
  const vendorFromNested = getStringField(vendor, 'name').trim();
  if (vendorFromNested) {
    return vendorFromNested;
  }
  const supplier = getStringField(extracted, 'supplier').trim();
  if (supplier) {
    return supplier;
  }
  return '';
};

const getResultInvoiceNumber = (result: InvoiceOCRResult): string => {
  const extracted = isRecord(result.extractedData) ? result.extractedData : {};
  const basic = getRecordField(extracted, 'basic');
  return (
    getStringField(extracted, 'invoiceNumber') ||
    getStringField(extracted, 'invoiceNo') ||
    getStringField(basic, 'invoiceNumber')
  );
};

const getResultInvoiceDate = (result: InvoiceOCRResult): string => {
  const extracted = isRecord(result.extractedData) ? result.extractedData : {};
  const basic = getRecordField(extracted, 'basic');
  return (
    getStringField(extracted, 'invoiceDate') ||
    getStringField(extracted, 'date') ||
    getStringField(basic, 'invoiceDate')
  );
};

const hasValidTotalAmount = (result: InvoiceOCRResult): boolean => {
  const extracted: Record<string, unknown> = isRecord(result.extractedData)
    ? result.extractedData
    : {};
  const basic = getRecordField(extracted, 'basic');
  const amountCandidate =
    extracted['totalAmount'] ||
    basic['totalAmount'] ||
    extracted['amount'] ||
    extracted['invoiceAmount'];
  if (typeof amountCandidate === 'number') {
    return Number.isFinite(amountCandidate);
  }
  if (typeof amountCandidate === 'string') {
    const numeric = Number(amountCandidate.replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric);
  }
  return false;
};

const applyPatchToResult = (
  result: InvoiceOCRResult,
  patch: Record<string, unknown>
): InvoiceOCRResult => {
  const next = { ...result } as InvoiceOCRResult;
  const extracted = isRecord(result.extractedData) ? result.extractedData : {};
  const nextExtracted: Record<string, unknown> = { ...extracted };

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'extractedData' && isRecord(value)) {
      Object.assign(nextExtracted, value);
      continue;
    }
    if (key === 'status' && typeof value === 'string') {
      next.status = value as InvoiceOCRResult['status'];
      continue;
    }
    if (key === 'confidence' && typeof value === 'number') {
      next.confidence = value;
      continue;
    }
    if (key === 'executionId' && typeof value === 'string') {
      next.executionId = value;
      continue;
    }
    if (key === 'startedAt' && typeof value === 'string') {
      next.startedAt = value;
      continue;
    }
    if (key === 'completedAt') {
      if (typeof value === 'string') {
        next.completedAt = value;
      }
      continue;
    }
    nextExtracted[key] = value;
  }

  next.extractedData = nextExtracted as unknown as NonNullable<
    InvoiceOCRResult['extractedData']
  >;
  return next;
};

const stringifyDiffValue = (value: unknown): string => {
  if (typeof value === 'undefined') {
    return '(空)';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value || '(空字符串)';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const buildResultVersionDiffEntries = (
  originalResult: InvoiceOCRResult | null,
  correctedResult: InvoiceOCRResult
): ResultVersionDiffEntry[] => {
  const originalExtracted: Record<string, unknown> = isRecord(
    originalResult?.extractedData
  )
    ? originalResult.extractedData
    : {};
  const correctedExtracted: Record<string, unknown> = isRecord(
    correctedResult.extractedData
  )
    ? correctedResult.extractedData
    : {};
  const keys = Array.from(
    new Set([
      ...Object.keys(originalExtracted),
      ...Object.keys(correctedExtracted),
    ])
  ).sort((left, right) => left.localeCompare(right));
  const diffs: ResultVersionDiffEntry[] = [];
  for (const key of keys) {
    const originalValue = stringifyDiffValue(originalExtracted[key]);
    const correctedValue = stringifyDiffValue(correctedExtracted[key]);
    if (originalValue !== correctedValue) {
      diffs.push({
        field: `extractedData.${key}`,
        originalValue,
        correctedValue,
      });
    }
  }
  if (originalResult?.status !== correctedResult.status) {
    diffs.push({
      field: 'status',
      originalValue: originalResult?.status || '(空)',
      correctedValue: correctedResult.status || '(空)',
    });
  }
  if (originalResult?.confidence !== correctedResult.confidence) {
    diffs.push({
      field: 'confidence',
      originalValue: stringifyDiffValue(originalResult?.confidence),
      correctedValue: stringifyDiffValue(correctedResult.confidence),
    });
  }
  return diffs;
};

/**
 * Invoice OCR 结果展示组件
 * 展示 OCR 处理结果、统计信息和提供后续操作
 */
const InvoiceOCRResults: React.FC<InvoiceOCRResultsProps> = ({
  workflowId,
  batchTaskId,
  showStats = true,
  showHistory = true,
  processingStatus = 'idle',
  completedData,
  refreshToken = 0,
  onResultSelect,
  onBatchTaskSelect,
  onGoogleSheetsRedirect,
  onProcessNewFiles,
}) => {
  const { t } = useTranslation();
  const message = useMessage();
  const { isVisible, errorInfo, showError, hideError } = useErrorModal();
  const invoiceOcrConfig = useMemo(() => getInvoiceOcrConfig(), []);
  const [results, setResults] = useState<InvoiceOCRResult[]>([]);
  const [batchTasks, setBatchTasks] = useState<InvoiceOCRBatchTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResults, setSelectedResults] = useState<InvoiceOCRResult[]>(
    []
  );
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<InvoiceOCRResult | null>(
    null
  );
  const [searchKeyword, setSearchKeyword] = useState('');
  const [quickFilter, setQuickFilter] = useState<ResultQuickFilter>('all');
  const [manualCorrectionVisible, setManualCorrectionVisible] = useState(false);
  const [manualCorrectionDraft, setManualCorrectionDraft] = useState('{}');
  const [manualCorrectionHistory, setManualCorrectionHistory] = useState<
    InvoiceOcrManualCorrectionHistoryEntry[]
  >([]);
  const [originalResultSnapshots, setOriginalResultSnapshots] = useState<
    Record<string, InvoiceOCRResult>
  >({});
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<ResultColumnKey[]>(
    () => readPersistedResultColumns(workflowId)
  );
  const [batchTagModalVisible, setBatchTagModalVisible] = useState(false);
  const [batchTagDraft, setBatchTagDraft] = useState('');
  const manualCorrectionAccess = useMemo(
    () =>
      invoiceOCRService.canPerformManualCorrection(
        invoiceOcrConfig.manualCorrectionAllowedRoles
      ),
    [invoiceOcrConfig.manualCorrectionAllowedRoles]
  );

  const emitTieredAlert = useCallback(
    (alertCode: string, text: string) => {
      const severity = getAlertSeverity(alertCode);
      const allow = invoiceOCRService.shouldEmitAlert(
        `invoice_ocr:${alertCode}:${severity}`,
        invoiceOcrConfig.alertQuietWindowMinutes
      );
      if (!allow) {
        return;
      }
      if (severity === 'critical') {
        message.error(text);
        return;
      }
      if (severity === 'warning') {
        message.warning(text);
        return;
      }
      message.info(text);
    },
    [invoiceOcrConfig.alertQuietWindowMinutes, message]
  );

  /**
   * 加载 OCR 结果数据
   */
  const loadResults = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    try {
      // 加载结果列表
      const resultsData = await invoiceOCRService.getResults(workflowId, {
        ...(batchTaskId && { batchTaskId }),
        page: 1,
        pageSize: 100,
      });
      const baseSnapshots: Record<string, InvoiceOCRResult> = {};
      const normalizedResults = (resultsData.items || []).map(item => {
        const vendorName = getResultVendorName(item);
        const baseExtracted = isRecord(item.extractedData)
          ? { ...item.extractedData }
          : {};
        const withSupplierTemplate =
          vendorName && Object.keys(baseExtracted).length > 0
            ? invoiceOCRService.applySupplierTemplateRule(
                vendorName,
                baseExtracted
              )
            : baseExtracted;

        let baseResult: InvoiceOCRResult = {
          ...item,
          extractedData: withSupplierTemplate as unknown as NonNullable<
            InvoiceOCRResult['extractedData']
          >,
        };

        const extractedForTag: Record<string, unknown> = isRecord(
          baseResult.extractedData
        )
          ? { ...baseResult.extractedData }
          : {};
        const inferredTags =
          invoiceOCRService.inferInvoiceIndustryTags(extractedForTag);
        if (inferredTags.length > 0) {
          const existingTagField = extractedForTag['industryTags'];
          const currentTags = Array.isArray(existingTagField)
            ? existingTagField.filter(
                (itemTag): itemTag is string => typeof itemTag === 'string'
              )
            : [];
          extractedForTag['industryTags'] = Array.from(
            new Set([...currentTags, ...inferredTags])
          );
          const currentIndustry = extractedForTag['industry'];
          if (typeof currentIndustry !== 'string' || !currentIndustry.trim()) {
            extractedForTag['industry'] = inferredTags[0];
          }
          baseResult = {
            ...baseResult,
            extractedData: extractedForTag as unknown as NonNullable<
              InvoiceOCRResult['extractedData']
            >,
          };
        }

        const normalizedFinancial = invoiceOCRService.normalizeCurrencyAndTax(
          isRecord(baseResult.extractedData) ? baseResult.extractedData : {},
          {
            timestamp:
              baseResult.completedAt ||
              baseResult.startedAt ||
              new Date().toISOString(),
          }
        );
        baseResult = {
          ...baseResult,
          extractedData: normalizedFinancial as unknown as NonNullable<
            InvoiceOCRResult['extractedData']
          >,
        };

        baseSnapshots[item.id] = baseResult;

        const correctionEntry = invoiceOCRService.getManualCorrection(
          workflowId,
          item.id
        );
        const patch =
          isRecord(correctionEntry) && isRecord(correctionEntry.patch)
            ? correctionEntry.patch
            : null;
        let mergedResult = baseResult;
        if (patch) {
          mergedResult = applyPatchToResult(baseResult, patch);
        }

        return mergedResult;
      });
      setOriginalResultSnapshots(baseSnapshots);
      setResults(normalizedResults);

      // 加载批处理任务
      const batchTasksData = await invoiceOCRService.getBatchTasks(workflowId, {
        page: 1,
        pageSize: 50,
      });
      setBatchTasks(batchTasksData.items || []);

      // Note: Stats and history loading removed as variables are unused
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [workflowId, batchTaskId, showStats, showHistory]);

  /**
   * 组件挂载时加载数据
   */
  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (refreshToken > 0) {
      void loadResults();
    }
  }, [loadResults, refreshToken]);

  useEffect(() => {
    setVisibleColumnKeys(readPersistedResultColumns(workflowId));
  }, [workflowId]);

  useEffect(() => {
    persistResultColumns(workflowId, visibleColumnKeys);
  }, [workflowId, visibleColumnKeys]);

  /**
   * 查看结果详情
   */
  const handleViewDetail = useCallback(
    (result: InvoiceOCRResult) => {
      setSelectedResult(result);
      setDetailModalVisible(true);
      onResultSelect?.(result);
    },
    [onResultSelect]
  );

  /**
   * 下载结果文件
   */
  const handleDownloadResult = useCallback(
    async (result: InvoiceOCRResult) => {
      try {
        await invoiceOCRService.downloadResult(workflowId, result.id);
        message.success('结果文件下载成功');
      } catch (error) {
        showError({
          title: '下载失败',
          message: error instanceof Error ? error.message : '未知错误',
          details: error instanceof Error ? error.stack : undefined,
        });
      }
    },
    [message, showError, workflowId]
  );

  /**
   * 批量下载结果
   */
  const handleBatchDownload = useCallback(async () => {
    if (selectedResults.length === 0) {
      message.warning('请先选择需要下载的结果');
      return;
    }

    try {
      const resultIds = selectedResults.map(result => result.id);
      await invoiceOCRService.downloadResults(workflowId, resultIds);
      message.success('批量下载成功');
    } catch (error) {
      showError({
        title: '批量下载失败',
        message: error instanceof Error ? error.message : '未知错误',
        details: error instanceof Error ? error.stack : undefined,
      });
    }
  }, [message, selectedResults, showError, workflowId]);

  /**
   * 删除结果
   */
  const handleDeleteResult = useCallback(
    async (result: InvoiceOCRResult) => {
      confirm({
        title: '确认删除',
        content: `确定删除结果「${result.originalFile?.name || result.id}」吗？`,
        onOk: async () => {
          try {
            await invoiceOCRService.deleteResult(workflowId, result.id);
            message.success('删除成功');
            loadResults();
          } catch (error) {
            showError({
              title: '删除失败',
              message: error instanceof Error ? error.message : '未知错误',
              details: error instanceof Error ? error.stack : undefined,
            });
          }
        },
      });
    },
    [loadResults, message, showError, workflowId]
  );

  /**
   * 跳转到 Google Sheets
   */
  const handleGoogleSheetsRedirect = useCallback(() => {
    const targetResults =
      selectedResults.length > 0 ? selectedResults : results;
    if (targetResults.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    onGoogleSheetsRedirect?.(targetResults);

    // 模拟跳转到 Google Sheets
    const sheetsUrl =
      'https://docs.google.com/spreadsheets/d/1K8VGSofJUBK7yCTqtaPNQvSZ1HeGDNZOvO2UQ6SRJzg/edit?usp=sharing';
    window.open(sheetsUrl, '_blank');
    message.success(
      `正在跳转到 Google Sheets，将导出 ${targetResults.length} 条结果`
    );
  }, [onGoogleSheetsRedirect, results, selectedResults]);

  const handleCopyValue = useCallback(
    async (value?: string, label = '内容') => {
      if (!value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        message.success(`${label} 已复制`);
      } catch (copyError) {
        console.error(`Failed to copy ${label}:`, copyError);
        message.error('复制失败，请手动复制');
      }
    },
    [message]
  );

  const handleExportDiagnostics = useCallback(() => {
    if (!completedData) {
      message.warning('暂无可导出的诊断信息');
      return;
    }

    const runtime = globalThis as InvoiceOcrTelemetryRuntime;
    const telemetryBuffer = Array.isArray(
      runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__
    )
      ? runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.slice(-100)
      : [];

    const payload = redactSensitiveData({
      exportedAt: new Date().toISOString(),
      executionId: completedData.executionId || '',
      traceId: completedData.traceId || '',
      requestKey: completedData.idempotencyKey || '',
      hasBusinessData: Boolean(completedData.hasBusinessData),
      schemaWarnings: completedData.schemaWarnings || [],
      diagnostics: completedData.diagnostics || {},
      rawResponse: completedData.rawResponse || null,
      clientHealth: completedData.clientHealth || null,
      telemetryBuffer,
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice-ocr-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success('诊断信息已导出');
  }, [completedData, message]);

  const renderClientHealthAlerts = useCallback(() => {
    const clientHealth = completedData?.clientHealth;
    if (!clientHealth) {
      return null;
    }

    const alerts: React.ReactNode[] = [];
    if (clientHealth.webhook && !clientHealth.webhook.reachable) {
      alerts.push(
        <Alert
          key='client-health-webhook'
          style={{ marginTop: 12, textAlign: 'left' }}
          type='warning'
          showIcon
          message='客户端诊断：Webhook 异常'
          description={
            clientHealth.webhook.errorMessage ||
            (typeof clientHealth.webhook.status === 'number'
              ? `HTTP ${clientHealth.webhook.status} ${clientHealth.webhook.statusText || ''}`
              : 'Webhook 不可达')
          }
        />
      );
    }

    if (clientHealth.resultSync && !clientHealth.resultSync.reachable) {
      alerts.push(
        <Alert
          key='client-health-sync'
          style={{ marginTop: 12, textAlign: 'left' }}
          type='warning'
          showIcon
          message='客户端诊断：结果同步接口异常'
          description={
            clientHealth.resultSync.errorMessage ||
            (typeof clientHealth.resultSync.httpStatus === 'number'
              ? `HTTP ${clientHealth.resultSync.httpStatus}`
              : '结果同步接口不可达')
          }
        />
      );
    }

    if (
      clientHealth.supabase &&
      (!clientHealth.supabase.configured || !clientHealth.supabase.reachable)
    ) {
      alerts.push(
        <Alert
          key='client-health-supabase'
          style={{ marginTop: 12, textAlign: 'left' }}
          type='warning'
          showIcon
          message='客户端诊断：Supabase 异常'
          description={
            !clientHealth.supabase.configured
              ? 'Supabase 未配置'
              : clientHealth.supabase.errorMessage ||
                (typeof clientHealth.supabase.httpStatus === 'number'
                  ? `HTTP ${clientHealth.supabase.httpStatus}`
                  : 'Supabase 不可达')
          }
        />
      );
    }

    return alerts.length > 0 ? <>{alerts}</> : null;
  }, [completedData]);

  const handleOpenManualCorrection = useCallback(() => {
    if (!manualCorrectionAccess.allowed) {
      emitTieredAlert(
        'rbac_manual_correction_denied',
        `当前角色(${manualCorrectionAccess.role})无手动修正权限`
      );
      return;
    }
    if (!selectedResult) {
      return;
    }
    const saved = invoiceOCRService.getManualCorrection(
      workflowId,
      selectedResult.id
    );
    const savedPatch =
      isRecord(saved) && isRecord(saved.patch) ? saved.patch : null;
    const defaultPatch =
      savedPatch ||
      (isRecord(selectedResult.extractedData)
        ? selectedResult.extractedData
        : {});
    setManualCorrectionDraft(JSON.stringify(defaultPatch, null, 2));
    setManualCorrectionHistory(
      invoiceOCRService.getManualCorrectionHistory(
        workflowId,
        selectedResult.id
      )
    );
    setManualCorrectionVisible(true);
  }, [
    emitTieredAlert,
    manualCorrectionAccess.allowed,
    manualCorrectionAccess.role,
    selectedResult,
    workflowId,
  ]);

  const handleSaveManualCorrection = useCallback(() => {
    if (!manualCorrectionAccess.allowed) {
      emitTieredAlert(
        'rbac_manual_correction_denied',
        `当前角色(${manualCorrectionAccess.role})无手动修正权限`
      );
      return;
    }
    if (!selectedResult) {
      return;
    }
    try {
      const parsed = JSON.parse(manualCorrectionDraft) as unknown;
      if (!isRecord(parsed)) {
        throw new Error('手动修正内容必须是 JSON 对象');
      }
      invoiceOCRService.saveManualCorrection(
        workflowId,
        selectedResult.id,
        parsed,
        {
          actor: 'dashboard_user',
          diffKeys: Object.keys(parsed),
        }
      );
      const nextResult = applyPatchToResult(selectedResult, parsed);
      setSelectedResult(nextResult);
      setResults(prev =>
        prev.map(item => (item.id === selectedResult.id ? nextResult : item))
      );
      setManualCorrectionHistory(
        invoiceOCRService.getManualCorrectionHistory(
          workflowId,
          selectedResult.id
        )
      );
      setManualCorrectionVisible(false);
      message.success('手动修正已保存并应用');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      message.error(`手动修正保存失败：${reason}`);
    }
  }, [
    emitTieredAlert,
    manualCorrectionAccess.allowed,
    manualCorrectionAccess.role,
    manualCorrectionDraft,
    message,
    selectedResult,
    workflowId,
  ]);

  const handleSaveSupplierTemplateRule = useCallback(() => {
    if (!selectedResult) {
      return;
    }
    const supplierName = getResultVendorName(selectedResult);
    if (!supplierName) {
      message.warning('未识别到供应商名称，无法保存模板');
      return;
    }
    const extracted: Record<string, unknown> = isRecord(
      selectedResult.extractedData
    )
      ? selectedResult.extractedData
      : {};
    const inferredTags = invoiceOCRService.inferInvoiceIndustryTags(extracted);
    const fieldMappings = Object.keys(extracted).reduce(
      (acc, key) => ({
        ...acc,
        [key]: key,
      }),
      {} as Record<string, string>
    );
    const industryCandidate =
      typeof extracted['industry'] === 'string' && extracted['industry'].trim()
        ? extracted['industry'].trim()
        : inferredTags[0];
    invoiceOCRService.saveSupplierTemplateRule({
      supplierName,
      ...(industryCandidate ? { industry: industryCandidate } : {}),
      defaultTags: inferredTags,
      fieldMappings,
    });
    const applied = invoiceOCRService.applySupplierTemplateRule(
      supplierName,
      extracted
    );
    const nextResult: InvoiceOCRResult = {
      ...selectedResult,
      extractedData: applied as unknown as NonNullable<
        InvoiceOCRResult['extractedData']
      >,
    };
    setSelectedResult(nextResult);
    setResults(prev =>
      prev.map(item => (item.id === selectedResult.id ? nextResult : item))
    );
    message.success(`供应商模板已保存：${supplierName}`);
  }, [message, selectedResult]);

  const filteredResults = useMemo(() => {
    let next = [...results];
    if (quickFilter === 'completed') {
      next = next.filter(item => item.status === 'completed');
    } else if (quickFilter === 'low_confidence') {
      next = next.filter(
        item =>
          typeof item.confidence === 'number' &&
          item.confidence > 0 &&
          item.confidence < 0.8
      );
    } else if (quickFilter === 'recent_24h') {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      next = next.filter(item => {
        const dateValue = item.completedAt || item.startedAt;
        if (!dateValue) {
          return false;
        }
        const timestamp = new Date(dateValue).getTime();
        return Number.isFinite(timestamp) && timestamp >= cutoff;
      });
    }

    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return next;
    }
    return next.filter(item => getSearchableText(item).includes(keyword));
  }, [quickFilter, results, searchKeyword]);

  const duplicateResultIds = useMemo(
    () => new Set(invoiceOCRService.findPotentialDuplicateResultIds(results)),
    [results]
  );

  useEffect(() => {
    if (duplicateResultIds.size > 0) {
      emitTieredAlert(
        'duplicate_risk_detected',
        `检测到 ${duplicateResultIds.size} 条疑似重复发票，请优先核查`
      );
    }
  }, [duplicateResultIds.size, emitTieredAlert]);

  const currentResultDiffEntries = useMemo(() => {
    if (!selectedResult) {
      return [] as ResultVersionDiffEntry[];
    }
    const original = originalResultSnapshots[selectedResult.id] || null;
    return buildResultVersionDiffEntries(original, selectedResult);
  }, [originalResultSnapshots, selectedResult]);

  const handleToggleResultColumn = useCallback(
    (columnKey: ResultColumnKey, checked: boolean) => {
      setVisibleColumnKeys(prev => {
        if (checked) {
          if (prev.includes(columnKey)) {
            return prev;
          }
          return [...prev, columnKey];
        }
        const next = prev.filter(item => item !== columnKey);
        if (next.length === 0) {
          message.warning('至少保留一列结果字段');
          return prev;
        }
        return next;
      });
    },
    [message]
  );

  const handleResetResultColumns = useCallback(() => {
    setVisibleColumnKeys(DEFAULT_RESULT_COLUMN_KEYS);
    message.success('已恢复默认列配置');
  }, [message]);

  const applyLocalBatchPatch = useCallback(
    (
      patchBuilder: (result: InvoiceOCRResult) => Record<string, unknown>,
      actor: string
    ) => {
      if (!manualCorrectionAccess.allowed) {
        emitTieredAlert(
          'rbac_manual_correction_denied',
          `当前角色(${manualCorrectionAccess.role})无批量修正权限`
        );
        return;
      }
      if (selectedResults.length === 0) {
        message.warning('请先选择至少一条结果');
        return;
      }
      const selectedIdSet = new Set(selectedResults.map(item => item.id));
      const nextSelected = selectedResults.map(result => {
        const patch = patchBuilder(result);
        invoiceOCRService.saveManualCorrection(workflowId, result.id, patch, {
          actor,
          diffKeys: Object.keys(patch),
        });
        return applyPatchToResult(result, patch);
      });
      const nextSelectedMap = new Map(
        nextSelected.map(item => [item.id, item])
      );
      setResults(prev =>
        prev.map(item => {
          if (!selectedIdSet.has(item.id)) {
            return item;
          }
          return nextSelectedMap.get(item.id) || item;
        })
      );
      setSelectedResults(nextSelected);
      setSelectedResult(prev =>
        prev && selectedIdSet.has(prev.id)
          ? nextSelectedMap.get(prev.id) || prev
          : prev
      );
    },
    [
      emitTieredAlert,
      manualCorrectionAccess.allowed,
      manualCorrectionAccess.role,
      message,
      selectedResults,
      workflowId,
    ]
  );

  const handleBatchConfirmSelected = useCallback(() => {
    const reviewedAt = new Date().toISOString();
    applyLocalBatchPatch(
      () => ({
        reviewStatus: 'confirmed',
        reviewedAt,
        validationState: 'approved',
      }),
      'batch_confirm_operator'
    );
    if (selectedResults.length > 0) {
      message.success(`已批量确认 ${selectedResults.length} 条记录`);
    }
  }, [applyLocalBatchPatch, message, selectedResults.length]);

  const handleOpenBatchTagModal = useCallback(() => {
    if (selectedResults.length === 0) {
      message.warning('请先选择至少一条结果');
      return;
    }
    setBatchTagDraft('');
    setBatchTagModalVisible(true);
  }, [message, selectedResults.length]);

  const handleBatchApplyTag = useCallback(() => {
    const tag = batchTagDraft.trim();
    if (!tag) {
      message.warning('请输入批量标签');
      return;
    }
    applyLocalBatchPatch(result => {
      const extracted: Record<string, unknown> = isRecord(result.extractedData)
        ? result.extractedData
        : {};
      const existingTagField = extracted['tags'];
      const existingTags = Array.isArray(existingTagField)
        ? existingTagField.filter(
            (item): item is string => typeof item === 'string'
          )
        : [];
      const nextTags = Array.from(new Set([...existingTags, tag]));
      return {
        tags: nextTags,
        batchTag: tag,
      };
    }, 'batch_tag_operator');
    setBatchTagModalVisible(false);
    if (selectedResults.length > 0) {
      message.success(
        `已为 ${selectedResults.length} 条记录打上标签「${tag}」`
      );
    }
  }, [applyLocalBatchPatch, batchTagDraft, message, selectedResults.length]);

  const handleBatchExportSelectedJson = useCallback(() => {
    if (selectedResults.length === 0) {
      message.warning('请先选择至少一条结果');
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      workflowId,
      resultCount: selectedResults.length,
      resultIds: selectedResults.map(item => item.id),
      results: selectedResults.map(item => redactSensitiveData(item)),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice-ocr-selected-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${selectedResults.length} 条选中记录`);
  }, [message, selectedResults, workflowId]);

  const qualityScorecard = useMemo(() => {
    if (results.length === 0) {
      return {
        completeness: 0,
        confidenceAccuracy: 0,
        consistency: 0,
        overall: 0,
      };
    }
    const completenessSum = results.reduce((total, result) => {
      let score = 0;
      if (getResultInvoiceNumber(result)) {
        score += 1;
      }
      if (getResultVendorName(result)) {
        score += 1;
      }
      if (getResultInvoiceDate(result)) {
        score += 1;
      }
      if (hasValidTotalAmount(result)) {
        score += 1;
      }
      return total + score / 4;
    }, 0);
    const completeness = Math.round((completenessSum / results.length) * 100);

    const accuracySum = results.reduce((total, result) => {
      const confidence =
        typeof result.confidence === 'number' &&
        Number.isFinite(result.confidence)
          ? result.confidence
          : 0;
      return total + Math.max(0, Math.min(1, confidence));
    }, 0);
    const confidenceAccuracy = Math.round((accuracySum / results.length) * 100);

    const duplicateCount = duplicateResultIds.size;
    const consistency = Math.max(
      0,
      Math.round(((results.length - duplicateCount) / results.length) * 100)
    );
    const overall = Math.round(
      completeness * 0.4 + confidenceAccuracy * 0.35 + consistency * 0.25
    );
    return {
      completeness,
      confidenceAccuracy,
      consistency,
      overall,
    };
  }, [duplicateResultIds.size, results]);

  const slaMetrics = useMemo(() => {
    const completedResults = results.filter(
      result =>
        result.status === 'completed' && result.startedAt && result.completedAt
    );
    const latencyMs = completedResults
      .map(result => {
        const startedAt = new Date(result.startedAt || '').getTime();
        const completedAt = new Date(result.completedAt || '').getTime();
        return completedAt - startedAt;
      })
      .filter(value => Number.isFinite(value) && value >= 0)
      .sort((left, right) => left - right);
    const quantile = (values: number[], percentile: number): number => {
      if (values.length === 0) {
        return 0;
      }
      const index = Math.min(
        values.length - 1,
        Math.max(0, Math.floor(percentile * (values.length - 1)))
      );
      return Math.round(values[index] || 0);
    };
    const failedCount = results.filter(
      result => result.status === 'failed'
    ).length;
    const failureRate = results.length
      ? Number(((failedCount / results.length) * 100).toFixed(2))
      : 0;
    const retryAttempts = completedData?.diagnostics?.attemptCount || 1;
    const retryRate = completedData?.totalFiles
      ? Number(
          (
            ((Math.max(0, retryAttempts - 1) as number) /
              Math.max(1, completedData.totalFiles)) *
            100
          ).toFixed(2)
        )
      : 0;
    return {
      p50LatencyMs: quantile(latencyMs, 0.5),
      p95LatencyMs: quantile(latencyMs, 0.95),
      failureRate,
      retryRate,
    };
  }, [
    completedData?.diagnostics?.attemptCount,
    completedData?.totalFiles,
    results,
  ]);

  /**
   * 结果表格列定义
   */
  const fullResultColumns: ColumnsType<InvoiceOCRResult> = [
    {
      title: '文件名',
      dataIndex: 'originalFile',
      key: 'fileName',
      render: (originalFile: any) => (
        <Space>
          {getFileTypeIcon(originalFile?.name || '')}
          <Text strong>{originalFile?.name || '-'}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={getStatusColor(status) as any}
          text={
            <Space>
              {getStatusIcon(status)}
              {status === 'completed'
                ? '已完成'
                : status === 'processing'
                  ? '处理中'
                  : status === 'failed'
                    ? '失败'
                    : status === 'pending'
                      ? '等待中'
                      : '已取消'}
            </Space>
          }
        />
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Progress
          percent={Math.round(confidence * 100)}
          size='small'
          status={
            confidence >= 0.8
              ? 'success'
              : confidence >= 0.6
                ? 'normal'
                : 'exception'
          }
        />
      ),
    },
    {
      title: '已提取字段',
      dataIndex: 'extractedData',
      key: 'extractedData',
      render: (fields: any) => (
        <Tag color='blue'>{Object.keys(fields || {}).length} 项</Tag>
      ),
    },
    {
      title: '行业标签',
      key: 'industryTags',
      render: (_, record) => {
        const extracted: Record<string, unknown> = isRecord(
          record.extractedData
        )
          ? record.extractedData
          : {};
        const tagField = extracted['industryTags'];
        const tags = Array.isArray(tagField)
          ? tagField.filter((tag): tag is string => typeof tag === 'string')
          : [];
        return tags.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {tags.slice(0, 3).map(tag => (
              <Tag key={`${record.id}-${String(tag)}`} color='geekblue'>
                {tag}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type='secondary'>-</Text>
        );
      },
    },
    {
      title: '风控提示',
      key: 'risk',
      render: (_, record) => {
        const riskTags: string[] = [];
        if (duplicateResultIds.has(record.id)) {
          riskTags.push('疑似重复');
        }
        if (
          typeof record.confidence === 'number' &&
          record.confidence > 0 &&
          record.confidence < 0.8
        ) {
          riskTags.push('低置信度');
        }
        return riskTags.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {riskTags.map(risk => (
              <Tag key={`${record.id}-${risk}`} color='warning'>
                {risk}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type='secondary'>-</Text>
        );
      },
    },
    {
      title: '处理时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (completedAt: string) => (
        <Text type='secondary'>
          {completedAt ? new Date(completedAt).toLocaleString('zh-CN') : 'N/A'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title='查看详情'>
            <Button
              type='text'
              size='small'
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title='下载结果'>
            <Button
              type='text'
              size='small'
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadResult(record)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key='delete'
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteResult(record)}
                  danger
                >
                  删除
                </Menu.Item>
              </Menu>
            }
          >
            <Button type='text' size='small' icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const resultColumns = useMemo(() => {
    const visibility = new Set<ResultColumnKey>(visibleColumnKeys);
    const filtered = fullResultColumns.filter(column => {
      const key = String(column.key || '');
      if (key === 'actions') {
        return true;
      }
      return visibility.has(key as ResultColumnKey);
    });
    const actionsColumn = filtered.find(
      column => String(column.key) === 'actions'
    );
    if (!actionsColumn) {
      const fallback = fullResultColumns.find(
        column => String(column.key) === 'actions'
      );
      if (fallback) {
        filtered.push(fallback);
      }
    }
    return filtered;
  }, [fullResultColumns, visibleColumnKeys]);

  /**
   * 渲染财务统计摘要
   */
  const renderFinancialSummary = () => {
    if (!completedData?.enhancedData?.results?.[0]?.financialSummary)
      return null;

    const { financialSummary } = completedData.enhancedData.results[0];

    return (
      <Card title='💰 财务统计' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Statistic
              title='平均金额'
              value={parseFloat(financialSummary.averageAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title='发票数量'
              value={financialSummary.count}
              prefix={<FileTextOutlined />}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic
              title='最小金额'
              value={parseFloat(financialSummary.minAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title='最大金额'
              value={parseFloat(financialSummary.maxAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#eb2f96' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title='中位数金额'
              value={parseFloat(financialSummary.medianAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  /**
   * 渲染处理详情视图
   */
  const renderProcessingDetails = () => {
    if (!completedData?.enhancedData?.results?.[0]?.processingDetails)
      return null;

    const { processingDetails } = completedData.enhancedData.results[0];
    const { successfulInvoices, failedExtractions, qualityIssues, duplicates } =
      processingDetails;

    const successColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '发票号',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        width: 200,
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '供应商',
        dataIndex: 'vendorName',
        key: 'vendorName',
        width: 200,
      },
      {
        title: '金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        align: 'right' as const,
        render: (amount: number) => (
          <Text strong style={{ color: '#52c41a' }}>
            ${amount.toFixed(2)}
          </Text>
        ),
      },
    ];

    const failureColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '错误信息',
        dataIndex: 'error',
        key: 'error',
        render: (text: string) => (
          <Text type='danger' style={{ fontSize: '12px' }}>
            {text}
          </Text>
        ),
      },
    ];

    const qualityColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '发票号',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        width: 200,
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '质量问题',
        dataIndex: 'issues',
        key: 'issues',
        render: (issues: string[]) => (
          <div>
            {issues.map((issue, idx) => (
              <Tag key={idx} color='orange' style={{ marginBottom: 4 }}>
                {issue}
              </Tag>
            ))}
          </div>
        ),
      },
    ];

    const duplicateColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '重复发票号',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        render: (text: string) => (
          <Text code type='warning'>
            {text}
          </Text>
        ),
      },
    ];

    return (
      <Card title='📋 处理详情' size='small' style={{ marginBottom: 16 }}>
        <Collapse ghost>
          <Panel
            header={
              <span>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', marginRight: 8 }}
                />
                成功处理的发票 ({successfulInvoices.length})
              </span>
            }
            key='successful'
          >
            <Table
              columns={successColumns}
              dataSource={successfulInvoices}
              rowKey='index'
              size='small'
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Panel>

          {failedExtractions.length > 0 && (
            <Panel
              header={
                <span>
                  <ExclamationCircleOutlined
                    style={{ color: '#ff4d4f', marginRight: 8 }}
                  />
                  失败提取记录 ({failedExtractions.length})
                </span>
              }
              key='failed'
            >
              <Table
                columns={failureColumns}
                dataSource={failedExtractions}
                rowKey='index'
                size='small'
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Panel>
          )}

          {qualityIssues.length > 0 && (
            <Panel
              header={
                <span>
                  <ExclamationCircleOutlined
                    style={{ color: '#fa8c16', marginRight: 8 }}
                  />
                  质量问题 ({qualityIssues.length})
                </span>
              }
              key='quality'
            >
              <Table
                columns={qualityColumns}
                dataSource={qualityIssues}
                rowKey='index'
                size='small'
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Panel>
          )}

          {duplicates.length > 0 && (
            <Panel
              header={
                <span>
                  <ExclamationCircleOutlined
                    style={{ color: '#fa8c16', marginRight: 8 }}
                  />
                  重复记录 ({duplicates.length})
                </span>
              }
              key='duplicates'
            >
              <Table
                columns={duplicateColumns}
                dataSource={duplicates}
                rowKey='index'
                size='small'
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Panel>
          )}
        </Collapse>
      </Card>
    );
  };

  /**
   * 渲染处理建议部分
   */
  const renderRecommendations = () => {
    if (!completedData?.enhancedData?.results?.[0]?.recommendations)
      return null;

    const { recommendations } = completedData.enhancedData.results[0];

    return (
      <Card title='💡 处理建议' size='small' style={{ marginBottom: 16 }}>
        <List
          dataSource={recommendations}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar
                    size='small'
                    style={{
                      backgroundColor: item.includes('正常')
                        ? '#52c41a'
                        : '#fa8c16',
                      fontSize: '12px',
                    }}
                  >
                    {index + 1}
                  </Avatar>
                }
                description={
                  <Text
                    style={{
                      color: item.includes('正常') ? '#52c41a' : '#fa8c16',
                      fontSize: '14px',
                    }}
                  >
                    {item}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  /**
   * 渲染统计信息
   */
  const renderStats = () => {
    // 优先显示增强版数据
    if (completedData?.enhancedData?.results?.[0]) {
      return (
        <>
          {renderFinancialSummary()}
          {renderProcessingDetails()}
          {renderRecommendations()}
        </>
      );
    }

    // 后备：显示原有统计信息 (removed as stats variable is unused)
    return null;
  };

  /**
   * 渲染批处理任务列表
   */
  const renderBatchTasks = () => {
    if (batchTasks.length === 0) return null;

    return (
      <Card title='批处理任务' size='small' style={{ marginBottom: 16 }}>
        <List
          size='small'
          dataSource={batchTasks}
          renderItem={task => (
            <List.Item
              actions={[
                <Button
                  type='link'
                  size='small'
                  onClick={() => onBatchTaskSelect?.(task)}
                >
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getStatusIcon(task.status)}
                    style={{
                      backgroundColor:
                        task.status === 'completed'
                          ? '#52c41a'
                          : task.status === 'processing'
                            ? '#1890ff'
                            : '#ff4d4f',
                    }}
                  />
                }
                title={task.name}
                description={
                  <Space>
                    <Text type='secondary'>
                      {task.files?.length || 0} 个文件
                    </Text>
                    <Text type='secondary'>•</Text>
                    <Text type='secondary'>
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderDataQualityScorecard = () => {
    if (results.length === 0) {
      return null;
    }
    return (
      <Card title='数据质量评分卡' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='完整性'
              value={qualityScorecard.completeness}
              suffix='%'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='准确度(置信度)'
              value={qualityScorecard.confidenceAccuracy}
              suffix='%'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='一致性'
              value={qualityScorecard.consistency}
              suffix='%'
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='综合评分'
              value={qualityScorecard.overall}
              suffix='%'
              valueStyle={{
                color:
                  qualityScorecard.overall >= 80
                    ? '#52c41a'
                    : qualityScorecard.overall >= 60
                      ? '#fa8c16'
                      : '#ff4d4f',
              }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  const renderSlaDashboard = () => {
    if (results.length === 0) {
      return null;
    }
    return (
      <Card title='SLA 仪表盘' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='P50 延迟'
              value={slaMetrics.p50LatencyMs}
              suffix='ms'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='P95 延迟'
              value={slaMetrics.p95LatencyMs}
              suffix='ms'
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='失败率'
              value={slaMetrics.failureRate}
              suffix='%'
              valueStyle={{
                color: slaMetrics.failureRate < 5 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='重试率'
              value={slaMetrics.retryRate}
              suffix='%'
              valueStyle={{
                color: slaMetrics.retryRate < 20 ? '#52c41a' : '#fa8c16',
              }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  /**
   * 渲染结果详情模态框
   */
  const renderDetailModal = () => {
    if (!selectedResult) return null;

    return (
      <Modal
        title={`结果详情 - ${selectedResult.originalFile?.name || selectedResult.id}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key='manual-correction'
            onClick={handleOpenManualCorrection}
            disabled={!manualCorrectionAccess.allowed}
          >
            手动修正
          </Button>,
          <Button
            key='supplier-template'
            onClick={handleSaveSupplierTemplateRule}
          >
            保存供应商模板
          </Button>,
          <Button
            key='download'
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadResult(selectedResult)}
          >
            下载结果
          </Button>,
          <Button key='close' onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label='文件名'>
            {selectedResult.originalFile?.name || selectedResult.id}
          </Descriptions.Item>
          <Descriptions.Item label='处理状态'>
            <Badge
              status={getStatusColor(selectedResult.status) as any}
              text={selectedResult.status}
            />
          </Descriptions.Item>
          <Descriptions.Item label='置信度'>
            <Progress
              percent={
                selectedResult.confidence
                  ? Math.round(selectedResult.confidence * 100)
                  : 0
              }
              size='small'
              status={
                selectedResult.confidence && selectedResult.confidence >= 0.8
                  ? 'success'
                  : 'normal'
              }
            />
          </Descriptions.Item>
          <Descriptions.Item label='处理时间'>
            {selectedResult.completedAt
              ? new Date(selectedResult.completedAt).toLocaleString('zh-CN')
              : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label='行业标签' span={2}>
            {(() => {
              const extracted = isRecord(selectedResult.extractedData)
                ? selectedResult.extractedData
                : {};
              const extractedRecord: Record<string, unknown> = extracted;
              const tagField = extractedRecord['industryTags'];
              const tags = Array.isArray(tagField)
                ? tagField.filter(
                    (tag): tag is string => typeof tag === 'string'
                  )
                : [];
              return tags.length > 0 ? (
                <Space size={[4, 4]} wrap>
                  {tags.map(tag => (
                    <Tag
                      key={`${selectedResult.id}-${String(tag)}`}
                      color='blue'
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type='secondary'>暂无</Text>
              );
            })()}
          </Descriptions.Item>
        </Descriptions>

        <Divider>提取的字段</Divider>
        <Descriptions bordered column={1}>
          {Object.entries(selectedResult.extractedData || {}).map(
            ([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object'
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </Descriptions.Item>
            )
          )}
        </Descriptions>

        <Divider>版本差异（原始 vs 当前）</Divider>
        {currentResultDiffEntries.length === 0 ? (
          <Text type='secondary'>当前记录未检测到手动修正差异</Text>
        ) : (
          <Table
            size='small'
            rowKey='field'
            pagination={false}
            dataSource={currentResultDiffEntries}
            columns={[
              {
                title: '字段',
                dataIndex: 'field',
                key: 'field',
                width: 220,
              },
              {
                title: '原始值',
                dataIndex: 'originalValue',
                key: 'originalValue',
                render: (value: string) => (
                  <Text code style={{ whiteSpace: 'pre-wrap' }}>
                    {value}
                  </Text>
                ),
              },
              {
                title: '修正后',
                dataIndex: 'correctedValue',
                key: 'correctedValue',
                render: (value: string) => (
                  <Text code style={{ whiteSpace: 'pre-wrap' }}>
                    {value}
                  </Text>
                ),
              },
            ]}
          />
        )}
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size='large' />
        <div style={{ marginTop: 16 }}>
          <Text type='secondary'>正在加载 OCR 结果...</Text>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    // 如果处理状态为完成，显示增强的处理完成内容
    if (processingStatus === 'completed' && completedData) {
      console.log('=== InvoiceOCRResults 调试信息 ===');
      console.log('completedData:', completedData);
      console.log('completedData.enhancedData:', completedData.enhancedData);

      const enhancedData = completedData.enhancedData;

      // 如果有增强数据，显示详细的处理结果
      // 检查 enhancedData 是否包含必要的字段（适配实际数据结构）
      if (
        enhancedData &&
        enhancedData.results &&
        enhancedData.results.length > 0 &&
        (enhancedData.results[0]?.summary ||
          enhancedData.results[0]?.financialSummary ||
          enhancedData.results[0]?.processingDetails)
      ) {
        console.log('显示详细的增强数据结果');
        console.log('enhancedData 包含的字段:', Object.keys(enhancedData));
        const stats = invoiceOCRService.extractProcessingStats(enhancedData);

        return (
          <div className='invoice-processing-enhanced'>
            {/* 处理完成标题 */}
            <Card
              style={{
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
                border: '1px solid #b7eb8f',
                borderRadius: '12px',
                padding: '32px 20px',
                marginBottom: 24,
              }}
            >
              <CheckCircleOutlined
                style={{
                  fontSize: 64,
                  color: '#52c41a',
                  marginBottom: 16,
                }}
              />
              <Title level={2} style={{ color: '#52c41a', marginBottom: 8 }}>
                发票识别处理完成
              </Title>
              <Text type='secondary' style={{ fontSize: 16 }}>
                发票已完成识别与结构化分析
              </Text>
              {(completedData.executionId ||
                completedData.idempotencyKey ||
                completedData.traceId) && (
                <div style={{ marginTop: 12 }}>
                  <Space size='middle' wrap>
                    {completedData.executionId && (
                      <Tag color='blue' style={{ padding: '4px 8px' }}>
                        Execution ID: {completedData.executionId}
                      </Tag>
                    )}
                    {completedData.executionId && (
                      <Button
                        size='small'
                        icon={<CopyOutlined />}
                        onClick={() =>
                          void handleCopyValue(
                            completedData.executionId,
                            'Execution ID'
                          )
                        }
                      >
                        复制 ID
                      </Button>
                    )}
                    {completedData.idempotencyKey && (
                      <Tag color='purple' style={{ padding: '4px 8px' }}>
                        Request Key: {completedData.idempotencyKey}
                      </Tag>
                    )}
                    {completedData.traceId && (
                      <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                        Trace ID: {completedData.traceId}
                      </Tag>
                    )}
                    {completedData.idempotencyKey && (
                      <Button
                        size='small'
                        icon={<CopyOutlined />}
                        onClick={() =>
                          void handleCopyValue(
                            completedData.idempotencyKey,
                            'Request Key'
                          )
                        }
                      >
                        复制 Key
                      </Button>
                    )}
                    {typeof completedData.diagnostics?.attemptCount ===
                      'number' && (
                      <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                        重试次数: {completedData.diagnostics.attemptCount}
                      </Tag>
                    )}
                    {typeof completedData.diagnostics?.elapsedMs ===
                      'number' && (
                      <Tag color='cyan' style={{ padding: '4px 8px' }}>
                        耗时: {completedData.diagnostics.elapsedMs}ms
                      </Tag>
                    )}
                    {completedData.diagnostics?.traceparent && (
                      <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                        Traceparent: {completedData.diagnostics.traceparent}
                      </Tag>
                    )}
                    {completedData.diagnostics?.backendTraceparent && (
                      <Tag color='purple' style={{ padding: '4px 8px' }}>
                        Backend Trace:{' '}
                        {completedData.diagnostics.backendTraceparent}
                      </Tag>
                    )}
                    {typeof completedData.diagnostics?.signatureVerified ===
                      'boolean' && (
                      <Tag
                        color={
                          completedData.diagnostics.signatureVerified
                            ? 'success'
                            : 'error'
                        }
                        style={{ padding: '4px 8px' }}
                      >
                        响应签名:
                        {completedData.diagnostics.signatureVerified
                          ? '已校验'
                          : '未通过'}
                      </Tag>
                    )}
                    <Button
                      size='small'
                      icon={<DownloadOutlined />}
                      onClick={handleExportDiagnostics}
                    >
                      导出诊断
                    </Button>
                  </Space>
                </div>
              )}
            </Card>

            {renderClientHealthAlerts()}

            {/* 处理建议 */}
            {enhancedData.results[0]?.recommendations &&
              enhancedData.results[0].recommendations.length > 0 && (
                <Card title='💡 处理建议' style={{ marginBottom: 24 }}>
                  <List
                    dataSource={enhancedData.results[0].recommendations}
                    renderItem={(recommendation: string) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<BulbOutlined style={{ color: '#1890ff' }} />}
                          description={recommendation}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}

            {/* 操作按钮 */}
            <Card>
              <Space
                size='large'
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {(enhancedData.googleSheetsUrl ||
                  completedData?.googleSheetsUrl) && (
                  <Button
                    type='primary'
                    size='large'
                    icon={<GoogleOutlined />}
                    onClick={() => {
                      const url =
                        enhancedData.googleSheetsUrl ||
                        completedData?.googleSheetsUrl;
                      console.log('Opening Google Sheets:', url);
                      window.open(url, '_blank');
                    }}
                    style={{
                      background: '#52c41a',
                      borderColor: '#52c41a',
                      borderRadius: '8px',
                      height: '48px',
                      padding: '0 32px',
                      fontSize: '16px',
                    }}
                  >
                    查看 Google Sheets
                  </Button>
                )}
                <Button
                  type='primary'
                  size='large'
                  icon={<CloudDownloadOutlined />}
                  onClick={() => {
                    const url =
                      'https://drive.google.com/drive/folders/1bF1UhR6cWhaTe_JulYMlQdW_dxVVCzVp?usp=sharing';
                    console.log('Opening Google Drive:', url);
                    window.open(url, '_blank');
                  }}
                  style={{
                    background: '#1890ff',
                    borderColor: '#1890ff',
                    borderRadius: '8px',
                    height: '48px',
                    padding: '0 32px',
                    fontSize: '16px',
                  }}
                >
                  查看 Google Drive
                </Button>
                <Button
                  size='large'
                  onClick={() => {
                    if (onProcessNewFiles) {
                      onProcessNewFiles();
                    } else {
                      window.location.reload();
                    }
                  }}
                  style={{
                    borderRadius: '8px',
                    height: '48px',
                    padding: '0 24px',
                  }}
                >
                  处理新文件
                </Button>
              </Space>
            </Card>

            {/* 财务摘要 */}
            {enhancedData.results[0]?.financialSummary && (
              <Card title='💰 财务汇总' style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={8} md={8}>
                    <Statistic
                      title='平均金额'
                      value={
                        enhancedData.results[0].financialSummary.averageAmount
                      }
                      precision={2}
                      prefix='$'
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={12} sm={8} md={8}>
                    <Statistic
                      title='最小金额'
                      value={enhancedData.results[0].financialSummary.minAmount}
                      precision={2}
                      prefix='$'
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={12} sm={8} md={8}>
                    <Statistic
                      title='最大金额'
                      value={enhancedData.results[0].financialSummary.maxAmount}
                      precision={2}
                      prefix='$'
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* 处理详情 */}
            {enhancedData.results[0]?.processingDetails && (
              <Card title='📋 处理详情' style={{ marginBottom: 24 }}>
                <Tabs defaultActiveKey='successful'>
                  <TabPane
                    tab={`✅ 成功 (${enhancedData.results[0].processingDetails.successfulInvoices?.length || 0})`}
                    key='successful'
                  >
                    {enhancedData.results[0].processingDetails
                      .successfulInvoices?.length > 0 ? (
                      <List
                        dataSource={
                          enhancedData.results[0].processingDetails
                            .successfulInvoices
                        }
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <CheckCircleOutlined
                                  style={{ color: '#52c41a' }}
                                />
                              }
                              title={`发票号 #${item.invoiceNumber || 'N/A'}（序号 ${item.index || 'N/A'}）`}
                              description={
                                <div>
                                  <div>
                                    <strong>供应商：</strong>{' '}
                                    {item.vendorName || 'N/A'}
                                  </div>
                                  <div>
                                    <strong>金额：</strong> $
                                    {item.totalAmount || 'N/A'}
                                  </div>
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description='暂无成功发票' />
                    )}
                  </TabPane>
                  <TabPane
                    tab={`❌ 失败 (${enhancedData.results[0].processingDetails.failedExtractions?.length || 0})`}
                    key='failed'
                  >
                    {enhancedData.results[0].processingDetails.failedExtractions
                      ?.length > 0 ? (
                      <List
                        dataSource={
                          enhancedData.results[0].processingDetails
                            .failedExtractions
                        }
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <CloseCircleOutlined
                                  style={{ color: '#f5222d' }}
                                />
                              }
                              title={item.fileName || item.documentId}
                              description={item.error || '处理失败'}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description='暂无失败记录' />
                    )}
                  </TabPane>
                  <TabPane
                    tab={`⚠️ 质量问题 (${enhancedData.results[0].processingDetails.qualityIssues?.length || 0})`}
                    key='quality'
                  >
                    {enhancedData.results[0].processingDetails.qualityIssues
                      ?.length > 0 ? (
                      <List
                        dataSource={
                          enhancedData.results[0].processingDetails
                            .qualityIssues
                        }
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <ExclamationCircleOutlined
                                  style={{ color: '#fa8c16' }}
                                />
                              }
                              title={item.fileName || item.documentId}
                              description={item.issue || '检测到质量问题'}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description='暂无质量问题' />
                    )}
                  </TabPane>
                </Tabs>
              </Card>
            )}
          </div>
        );
      }

      // 如果只有基础完成数据，显示简化版本
      console.log('显示简化版本的完成界面');
      console.log('enhancedData 检查结果:', {
        enhancedDataExists: !!enhancedData,
        hasResults: !!enhancedData?.results?.length,
        hasSummary: !!enhancedData?.results?.[0]?.summary,
        hasFinancialSummary: !!enhancedData?.results?.[0]?.financialSummary,
        hasProcessingDetails: !!enhancedData?.results?.[0]?.processingDetails,
        availableFields: enhancedData ? Object.keys(enhancedData) : [],
      });

      return (
        <div className='invoice-processing-completed'>
          <Card
            style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
              border: '1px solid #b7eb8f',
              borderRadius: '12px',
              padding: '40px 20px',
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <CheckCircleOutlined
                style={{
                  fontSize: 72,
                  color: '#52c41a',
                  marginBottom: 16,
                }}
              />
              <Title level={2} style={{ color: '#52c41a', marginBottom: 8 }}>
                {t('invoiceOCR.completion.processingCompleted')}
              </Title>
              <Text type='secondary' style={{ fontSize: 16 }}>
                {t('invoiceOCR.completion.processingCompletedMessage')}
              </Text>
            </div>

            {(completedData.executionId ||
              completedData.idempotencyKey ||
              completedData.traceId) && (
              <div style={{ marginBottom: 20 }}>
                <Space size='middle' wrap>
                  {completedData.executionId && (
                    <Tag color='blue' style={{ padding: '4px 8px' }}>
                      Execution ID: {completedData.executionId}
                    </Tag>
                  )}
                  {completedData.executionId && (
                    <Button
                      size='small'
                      icon={<CopyOutlined />}
                      onClick={() =>
                        void handleCopyValue(
                          completedData.executionId,
                          'Execution ID'
                        )
                      }
                    >
                      复制 ID
                    </Button>
                  )}
                  {completedData.idempotencyKey && (
                    <Tag color='purple' style={{ padding: '4px 8px' }}>
                      Request Key: {completedData.idempotencyKey}
                    </Tag>
                  )}
                  {completedData.traceId && (
                    <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                      Trace ID: {completedData.traceId}
                    </Tag>
                  )}
                  {completedData.idempotencyKey && (
                    <Button
                      size='small'
                      icon={<CopyOutlined />}
                      onClick={() =>
                        void handleCopyValue(
                          completedData.idempotencyKey,
                          'Request Key'
                        )
                      }
                    >
                      复制 Key
                    </Button>
                  )}
                  {typeof completedData.diagnostics?.attemptCount ===
                    'number' && (
                    <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                      重试次数: {completedData.diagnostics.attemptCount}
                    </Tag>
                  )}
                  {typeof completedData.diagnostics?.elapsedMs === 'number' && (
                    <Tag color='cyan' style={{ padding: '4px 8px' }}>
                      耗时: {completedData.diagnostics.elapsedMs}ms
                    </Tag>
                  )}
                  {completedData.diagnostics?.traceparent && (
                    <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                      Traceparent: {completedData.diagnostics.traceparent}
                    </Tag>
                  )}
                  {completedData.diagnostics?.backendTraceparent && (
                    <Tag color='purple' style={{ padding: '4px 8px' }}>
                      Backend Trace:{' '}
                      {completedData.diagnostics.backendTraceparent}
                    </Tag>
                  )}
                  {typeof completedData.diagnostics?.signatureVerified ===
                    'boolean' && (
                    <Tag
                      color={
                        completedData.diagnostics.signatureVerified
                          ? 'success'
                          : 'error'
                      }
                      style={{ padding: '4px 8px' }}
                    >
                      响应签名:
                      {completedData.diagnostics.signatureVerified
                        ? '已校验'
                        : '未通过'}
                    </Tag>
                  )}
                  <Button
                    size='small'
                    icon={<DownloadOutlined />}
                    onClick={handleExportDiagnostics}
                  >
                    导出诊断
                  </Button>
                </Space>
              </div>
            )}

            <Space size='large' wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  void loadResults();
                }}
                style={{
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px',
                }}
              >
                刷新结果
              </Button>
              {completedData.googleSheetsUrl && (
                <Button
                  type='primary'
                  size='large'
                  icon={<GoogleOutlined />}
                  onClick={() => {
                    console.log(
                      'Opening Google Sheets:',
                      completedData.googleSheetsUrl
                    );
                    window.open(completedData.googleSheetsUrl, '_blank');
                  }}
                  style={{
                    background: '#52c41a',
                    borderColor: '#52c41a',
                    borderRadius: '8px',
                    height: '48px',
                    padding: '0 32px',
                    fontSize: '16px',
                  }}
                >
                  {t('invoiceOCR.completion.viewGoogleSheets')}
                </Button>
              )}
              <Button
                size='large'
                onClick={() => {
                  if (onProcessNewFiles) {
                    onProcessNewFiles();
                  } else {
                    // 如果没有提供回调函数，则刷新页面作为后备方案
                    window.location.reload();
                  }
                }}
                style={{
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px',
                }}
              >
                {t('invoiceOCR.completion.processNewFiles')}
              </Button>
            </Space>

            <Alert
              style={{ marginTop: 20, textAlign: 'left' }}
              type='warning'
              showIcon
              message='未收到结构化识别结果'
              description='识别请求已提交，但工作流暂未返回可展示数据。请先点击“刷新结果”；若持续为空，请检查 n8n 流程执行日志。'
            />
            {completedData.schemaWarnings &&
              completedData.schemaWarnings.length > 0 && (
                <Alert
                  style={{ marginTop: 12, textAlign: 'left' }}
                  type='info'
                  showIcon
                  message='响应诊断'
                  description={`Schema 警告: ${completedData.schemaWarnings.join(', ')}`}
                />
              )}
            {completedData.diagnostics?.transportWarnings &&
              completedData.diagnostics.transportWarnings.length > 0 && (
                <Alert
                  style={{ marginTop: 12, textAlign: 'left' }}
                  type='info'
                  showIcon
                  message='传输层诊断'
                  description={completedData.diagnostics.transportWarnings.join(
                    ' | '
                  )}
                />
              )}
            {renderClientHealthAlerts()}

            <Divider style={{ margin: '32px 0 16px' }} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              {t('invoiceOCR.completion.tip')}
            </Text>
          </Card>
        </div>
      );
    }

    // 默认空状态
    return (
      <Card>
        <Empty
          image={
            <FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
          }
          description={
            <Space direction='vertical'>
              <Text>暂无 OCR 处理结果</Text>
              <Text type='secondary'>请先上传发票文件进行处理</Text>
            </Space>
          }
        />
        <Alert
          style={{ marginTop: 16 }}
          showIcon
          type='info'
          message='下一步建议'
          description='可先点击“刷新结果”；如果仍为空，请返回上传新文件，或导出诊断信息排查链路。'
        />
        <Space style={{ marginTop: 16 }} wrap>
          <Button icon={<ReloadOutlined />} onClick={loadResults}>
            刷新结果
          </Button>
          <Button
            type='primary'
            onClick={() => {
              if (onProcessNewFiles) {
                onProcessNewFiles();
                return;
              }
              window.location.reload();
            }}
          >
            返回上传
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportDiagnostics}
            disabled={!completedData}
          >
            导出诊断
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <div className='invoice-ocr-results'>
      {/* 统计信息 */}
      {renderStats()}

      {/* 批处理任务 */}
      {renderBatchTasks()}

      {/* 数据质量评分卡 */}
      {renderDataQualityScorecard()}

      {/* SLA 仪表盘 */}
      {renderSlaDashboard()}

      {/* 操作栏 */}
      <Card size='small' style={{ marginBottom: 16 }}>
        <Row justify='space-between' align='middle' gutter={[12, 12]}>
          <Col xs={24} lg={12}>
            <Space wrap>
              <Text strong>OCR 处理结果</Text>
              <Badge count={filteredResults.length} showZero />
              <Text type='secondary'>总计 {results.length} 条</Text>
              <Tag
                color={manualCorrectionAccess.allowed ? 'success' : 'warning'}
              >
                角色: {manualCorrectionAccess.role}
              </Tag>
              {selectedResults.length > 0 && (
                <Text type='secondary'>已选择 {selectedResults.length} 项</Text>
              )}
            </Space>
          </Col>
          <Col xs={24} lg={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button
                type='primary'
                icon={<GoogleOutlined />}
                onClick={handleGoogleSheetsRedirect}
                disabled={results.length === 0}
              >
                导出到 Google Sheets
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={handleBatchDownload}
                disabled={selectedResults.length === 0}
              >
                批量下载
              </Button>
              <Button
                onClick={handleBatchConfirmSelected}
                disabled={
                  selectedResults.length === 0 ||
                  !manualCorrectionAccess.allowed
                }
              >
                批量确认
              </Button>
              <Button
                onClick={handleOpenBatchTagModal}
                disabled={
                  selectedResults.length === 0 ||
                  !manualCorrectionAccess.allowed
                }
              >
                批量标记
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleBatchExportSelectedJson}
                disabled={selectedResults.length === 0}
              >
                导出选中JSON
              </Button>
              <Dropdown
                trigger={['click']}
                dropdownRender={() => (
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                      padding: 12,
                      minWidth: 220,
                    }}
                    onClick={event => event.stopPropagation()}
                  >
                    <Space direction='vertical' style={{ width: '100%' }}>
                      {RESULT_COLUMN_OPTIONS.map(option => (
                        <Checkbox
                          key={option.key}
                          checked={visibleColumnKeys.includes(option.key)}
                          onChange={event =>
                            handleToggleResultColumn(
                              option.key,
                              event.target.checked
                            )
                          }
                        >
                          {option.label}
                        </Checkbox>
                      ))}
                    </Space>
                    <Divider style={{ margin: '10px 0' }} />
                    <Button
                      type='link'
                      size='small'
                      onClick={handleResetResultColumns}
                      style={{ padding: 0 }}
                    >
                      恢复默认
                    </Button>
                  </div>
                )}
              >
                <Button icon={<BarChartOutlined />}>列设置</Button>
              </Dropdown>
              <Button icon={<ReloadOutlined />} onClick={loadResults}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col xs={24} lg={14}>
            <Radio.Group
              value={quickFilter}
              onChange={event => setQuickFilter(event.target.value)}
              optionType='button'
              buttonStyle='solid'
            >
              <Radio.Button value='all'>全部</Radio.Button>
              <Radio.Button value='completed'>仅已完成</Radio.Button>
              <Radio.Button value='low_confidence'>低置信度</Radio.Button>
              <Radio.Button value='recent_24h'>近24小时</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} lg={10}>
            <Input.Search
              allowClear
              value={searchKeyword}
              onChange={event => setSearchKeyword(event.target.value)}
              placeholder='搜索发票号 / 供应商 / 执行ID / 文件名'
            />
          </Col>
        </Row>
      </Card>

      {/* 结果表格 */}
      <Card>
        {duplicateResultIds.size > 0 && (
          <Alert
            style={{ marginBottom: 12 }}
            type='warning'
            showIcon
            message='检测到疑似重复发票'
            description={`当前有 ${duplicateResultIds.size} 条结果疑似重复，请优先核查发票号、金额和日期。`}
          />
        )}
        <Table
          columns={resultColumns}
          dataSource={filteredResults}
          rowKey='id'
          size='small'
          rowSelection={{
            selectedRowKeys: selectedResults.map(result => result.id),
            onChange: (selectedRowKeys, selectedRows) => {
              setSelectedResults(selectedRows);
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 结果详情模态框 */}
      {renderDetailModal()}

      <Modal
        title='手动修正 JSON'
        open={manualCorrectionVisible}
        onCancel={() => setManualCorrectionVisible(false)}
        onOk={handleSaveManualCorrection}
        okButtonProps={{ disabled: !manualCorrectionAccess.allowed }}
        okText='保存修正'
        cancelText='取消'
        width={760}
      >
        <Alert
          showIcon
          type='info'
          style={{ marginBottom: 12 }}
          message='支持输入 JSON 对象'
          description='支持直接覆盖 extractedData 字段，或以 { "extractedData": { ... } } 形式提交局部补丁。'
        />
        <Input.TextArea
          value={manualCorrectionDraft}
          onChange={event => setManualCorrectionDraft(event.target.value)}
          autoSize={{ minRows: 10, maxRows: 20 }}
          placeholder='例如：{"invoiceNumber":"INV-2026-001","vendorName":"供应商A"}'
        />
        {manualCorrectionHistory.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong>最近修正记录</Text>
            <List
              size='small'
              style={{ marginTop: 8 }}
              dataSource={manualCorrectionHistory.slice(0, 5)}
              renderItem={item => (
                <List.Item>
                  <Space size='small' wrap>
                    <Tag color='blue'>{item.actor}</Tag>
                    <Text type='secondary'>
                      {new Date(item.updatedAt).toLocaleString('zh-CN')}
                    </Text>
                    <Text type='secondary'>
                      变更字段: {item.diffKeys.join(', ') || 'N/A'}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>

      <Modal
        title='批量添加标签'
        open={batchTagModalVisible}
        onCancel={() => setBatchTagModalVisible(false)}
        onOk={handleBatchApplyTag}
        okButtonProps={{ disabled: !manualCorrectionAccess.allowed }}
        okText='应用标签'
        cancelText='取消'
      >
        <Alert
          showIcon
          type='info'
          style={{ marginBottom: 12 }}
          message='将对当前选中结果批量写入标签'
          description={`当前已选择 ${selectedResults.length} 条记录。`}
        />
        <Input
          value={batchTagDraft}
          onChange={event => setBatchTagDraft(event.target.value)}
          placeholder='例如：2026Q1复核 / 高优先级 / 税务待确认'
          maxLength={40}
        />
      </Modal>

      {/* 错误模态框 */}
      <ErrorModal
        visible={isVisible}
        title={errorInfo?.title}
        message={errorInfo?.message || ''}
        details={errorInfo?.details}
        troubleshooting={errorInfo?.troubleshooting}
        onClose={hideError}
      />
    </div>
  );
};

export default InvoiceOCRResults;
