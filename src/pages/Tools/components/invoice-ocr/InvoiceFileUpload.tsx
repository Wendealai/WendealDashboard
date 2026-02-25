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

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
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
  ArrowUpOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import {
  getInvoiceOcrConfig,
  validateInvoiceOcrWebhookUrl,
} from '@/config/invoiceOcrConfig';
import {
  invoiceOCRService,
  type InvoiceOcrQuarantineEntry,
} from '../../../../services/invoiceOCRService';
import { n8nWebhookService } from '../../../../services/n8nWebhookService';
import { trackInvoiceOcrEvent } from '@/services/invoiceOcrTelemetry';
import {
  buildInvoiceOcrTraceId,
  redactSensitiveData,
} from '@/services/invoiceOcrDiagnosticToolkit';
import { normalizeInvoiceOcrError } from '@/services/invoiceOcrErrorMap';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRBatchTask,
  InvoiceOCRUploadRequest,
} from '../../../../pages/InformationDashboard/types/invoiceOCR';

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
  /** webhook URL */
  webhookUrl?: string;
  /** 处理选项 */
  processingOptions?: any;
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
    traceId?: string;
    googleSheetsUrl?: string;
    processedFiles?: number;
    totalFiles?: number;
    enhancedData?: any;
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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    icon: FileTextOutlined,
    color: '#2f54eb',
    name: 'DOCX',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    icon: FileTextOutlined,
    color: '#13c2c2',
    name: 'XLSX',
  },
  'application/msword': {
    icon: FileTextOutlined,
    color: '#2f54eb',
    name: 'DOC',
  },
  'application/vnd.ms-excel': {
    icon: FileTextOutlined,
    color: '#13c2c2',
    name: 'XLS',
  },
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

const buildLocalIdempotencyKey = (
  workflowId: string,
  files: File[]
): string => {
  const fingerprint = files
    .map(file => `${file.name}:${file.size}:${file.type}:${file.lastModified}`)
    .sort()
    .join('|');

  let hash = 5381;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash = (hash * 33) ^ fingerprint.charCodeAt(index);
  }

  return `invoice-ocr:${workflowId}:${Math.abs(hash >>> 0).toString(16)}`;
};

const extractEnhancedData = (payload: unknown): unknown => {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }
  if (typeof payload === 'object') {
    return payload;
  }
  return null;
};

const FILE_FINGERPRINT_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FILE_UPLOAD_RESUME_STORAGE_PREFIX = 'invoiceOCR_upload_resume_v1';
const FILE_UPLOAD_RESUME_TTL_MS = 12 * 60 * 60 * 1000;

interface InvoiceOcrChunkUploadSummary {
  chunkIndex: number;
  hasBusinessData: boolean;
  executionId?: string;
  googleSheetsUrl?: string;
  idempotencyKey?: string;
  attemptCount?: number;
  elapsedMs?: number;
  schemaWarnings?: string[];
  transportWarnings?: string[];
  httpStatus?: number;
  contentType?: string;
  traceparent?: string;
  backendTraceparent?: string;
  signatureVerified?: boolean;
}

interface InvoiceOcrUploadResumeState {
  version: 1;
  workflowId: string;
  sessionKey: string;
  idempotencyKey: string;
  traceId: string;
  chunkSize: number;
  totalChunks: number;
  fingerprintSequence: string[];
  chunkSummaries: InvoiceOcrChunkUploadSummary[];
  updatedAt: string;
}

const buildUploadSessionKey = (
  workflowId: string,
  fingerprints: string[],
  chunkSize: number
): string => {
  const source = `${workflowId}|${chunkSize}|${fingerprints.join('|')}`;
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }
  return `session-${Math.abs(hash >>> 0).toString(16)}`;
};

const getUploadResumeStorageKey = (workflowId: string, sessionKey: string) =>
  `${FILE_UPLOAD_RESUME_STORAGE_PREFIX}:${workflowId}:${sessionKey}`;

const readUploadResumeState = (
  workflowId: string,
  sessionKey: string
): InvoiceOcrUploadResumeState | null => {
  try {
    const storageKey = getUploadResumeStorageKey(workflowId, sessionKey);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as InvoiceOcrUploadResumeState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      parsed.workflowId !== workflowId ||
      parsed.sessionKey !== sessionKey ||
      !Array.isArray(parsed.chunkSummaries)
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }
    const updatedAt = new Date(parsed.updatedAt).getTime();
    if (!Number.isFinite(updatedAt)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    if (Date.now() - updatedAt > FILE_UPLOAD_RESUME_TTL_MS) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeUploadResumeState = (
  workflowId: string,
  sessionKey: string,
  payload: Omit<InvoiceOcrUploadResumeState, 'updatedAt'>
): void => {
  try {
    const storageKey = getUploadResumeStorageKey(workflowId, sessionKey);
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...payload,
        updatedAt: new Date().toISOString(),
      } satisfies InvoiceOcrUploadResumeState)
    );
  } catch (error) {
    console.warn('Failed to persist upload resume state:', error);
  }
};

const clearUploadResumeState = (workflowId: string, sessionKey: string) => {
  try {
    localStorage.removeItem(getUploadResumeStorageKey(workflowId, sessionKey));
  } catch {
    // noop
  }
};

const chunkFiles = <T,>(items: T[], chunkSize: number): T[][] => {
  const size = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const readFileHeaderHex = async (file: File, length = 8): Promise<string> => {
  const buffer = await file.slice(0, length).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const hasSupportedFileSignature = async (file: File): Promise<boolean> => {
  try {
    const header = await readFileHeaderHex(file, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (header.startsWith('25504446')) return true; // PDF
    if (header.startsWith('ffd8ff')) return true; // JPEG
    if (header.startsWith('89504e47')) return true; // PNG
    if (header.startsWith('49492a00') || header.startsWith('4d4d002a'))
      return true; // TIFF
    if (header.startsWith('424d')) return true; // BMP
    if (
      header.startsWith('504b0304') &&
      (extension === 'docx' || extension === 'xlsx')
    ) {
      return true; // OOXML
    }
    if (
      header.startsWith('d0cf11e0') &&
      (extension === 'doc' || extension === 'xls')
    ) {
      return true; // Legacy OLE format
    }

    return false;
  } catch {
    return false;
  }
};

const toChunkUploadSummary = (
  chunkIndex: number,
  response: any
): InvoiceOcrChunkUploadSummary => ({
  chunkIndex,
  hasBusinessData: Boolean(response?.hasBusinessData),
  ...(typeof response?.executionId === 'string' && response.executionId
    ? { executionId: response.executionId }
    : {}),
  ...(typeof response?.googleSheetsUrl === 'string' && response.googleSheetsUrl
    ? { googleSheetsUrl: response.googleSheetsUrl }
    : {}),
  ...(typeof response?.diagnostics?.idempotencyKey === 'string' &&
  response.diagnostics.idempotencyKey
    ? { idempotencyKey: response.diagnostics.idempotencyKey }
    : {}),
  ...(typeof response?.diagnostics?.attemptCount === 'number'
    ? { attemptCount: response.diagnostics.attemptCount }
    : {}),
  ...(typeof response?.diagnostics?.elapsedMs === 'number'
    ? { elapsedMs: response.diagnostics.elapsedMs }
    : {}),
  ...(typeof response?.diagnostics?.httpStatus === 'number'
    ? { httpStatus: response.diagnostics.httpStatus }
    : {}),
  ...(typeof response?.diagnostics?.contentType === 'string' &&
  response.diagnostics.contentType
    ? { contentType: response.diagnostics.contentType }
    : {}),
  ...(Array.isArray(response?.diagnostics?.schemaWarnings)
    ? { schemaWarnings: response.diagnostics.schemaWarnings }
    : {}),
  ...(Array.isArray(response?.diagnostics?.transportWarnings)
    ? { transportWarnings: response.diagnostics.transportWarnings }
    : {}),
  ...(typeof response?.diagnostics?.traceparent === 'string' &&
  response.diagnostics.traceparent
    ? { traceparent: response.diagnostics.traceparent }
    : {}),
  ...(typeof response?.diagnostics?.backendTraceparent === 'string' &&
  response.diagnostics.backendTraceparent
    ? { backendTraceparent: response.diagnostics.backendTraceparent }
    : {}),
  ...(typeof response?.diagnostics?.signatureVerified === 'boolean'
    ? { signatureVerified: response.diagnostics.signatureVerified }
    : {}),
});

/**
 * Invoice OCR 文件上传组件
 * 支持多文件上传、进度显示、文件预览和删除功能
 */
const InvoiceFileUpload: React.FC<InvoiceFileUploadProps> = memo(
  ({
    workflowId,
    webhookUrl,
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
    const invoiceOcrConfig = useMemo(() => getInvoiceOcrConfig(), []);
    const resolvedWebhookUrl = useMemo(
      () => webhookUrl?.trim() || invoiceOcrConfig.webhookUrl,
      [invoiceOcrConfig.webhookUrl, webhookUrl]
    );
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [estimatedRemainingSec, setEstimatedRemainingSec] = useState<
      number | null
    >(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
    const [quarantineEntries, setQuarantineEntries] = useState<
      InvoiceOcrQuarantineEntry[]
    >([]);
    const message = useMessage();
    const { isVisible, errorInfo, showError, hideError } = useErrorModal();

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

    useEffect(() => {
      setQuarantineEntries(invoiceOCRService.getQuarantineEntries(workflowId));
    }, [workflowId]);

    /**
     * Validate file type
     */
    const validateFileType = useCallback(
      (file: File): boolean => {
        const isSupported = invoiceOCRService.validateFileType(file);
        if (!isSupported) {
          showError({
            title: '文件类型不支持',
            message: `${file.type}。当前支持 PDF、JPEG、PNG、TIFF、BMP、DOCX、XLSX`,
          });
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
          showError({
            title: '文件大小超出限制',
            message: `${invoiceOCRService.formatFileSize(
              file.size
            )}。最大允许 ${maxFileSize}MB`,
          });
        }
        return isValidSize;
      },
      [maxFileSize, showError]
    );

    /**
     * Validation before file upload
     */
    const beforeUpload = useCallback(
      async (file: File, fileList: File[]): Promise<boolean> => {
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
          showError({
            title: '超出上传数量限制',
            message: `最多可上传 ${maxFiles} 个文件`,
          });
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
          message.warning(`文件“${file.name}”已存在`);
          return false;
        }

        const signatureValid = await hasSupportedFileSignature(file);
        if (!signatureValid) {
          showError({
            title: '文件内容校验失败',
            message: '文件头签名与支持格式不匹配，可能是错误扩展名或损坏文件。',
          });
          return false;
        }

        return false; // Prevent auto upload, manual control
      },
      [validateFileType, validateFileSize, maxFiles, message, showError]
    );

    /**
     * Handle file list changes
     */
    const handleFileListChange: UploadProps['onChange'] = useCallback(
      (info: any) => {
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

    const handleMoveToTop = useCallback(
      (file: UploadFile) => {
        const target = fileList.find(item => item.uid === file.uid);
        if (!target) {
          return;
        }
        const reordered = [
          target,
          ...fileList.filter(item => item.uid !== file.uid),
        ];
        setFileList(reordered);
        onFileListChange?.(reordered);
      },
      [fileList, onFileListChange]
    );

    const handleRevalidateFile = useCallback(
      async (file: UploadFile) => {
        const origin = file.originFileObj as File | undefined;
        if (!origin) {
          message.warning('无法重新校验该文件');
          return;
        }

        const typeOk = validateFileType(origin);
        const sizeOk = validateFileSize(origin);
        const signatureOk = await hasSupportedFileSignature(origin);
        if (typeOk && sizeOk && signatureOk) {
          message.success(`文件 ${file.name} 校验通过`);
          return;
        }
        message.error(`文件 ${file.name} 校验失败，请替换后重试`);
      },
      [message, validateFileSize, validateFileType]
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
        title: '确认清空',
        icon: <ExclamationCircleOutlined />,
        content: '确定要清空当前已选文件吗？',
        onOk() {
          setFileList([]);
          onFileListChange?.([]);
        },
      });
    }, [onFileListChange]);

    const handleClearQuarantine = useCallback(() => {
      confirm({
        title: '清空隔离队列',
        icon: <ExclamationCircleOutlined />,
        content: '确定清空当前工作流的失败文件隔离队列吗？',
        onOk() {
          invoiceOCRService.clearQuarantineEntries(workflowId);
          setQuarantineEntries([]);
          message.success('隔离队列已清空');
        },
      });
    }, [message, workflowId]);

    /**
     * Handle OCR recognition with real n8n webhook
     */
    const handleOCRProcess = useCallback(async () => {
      if (fileList.length === 0) {
        message.warning('请先选择待识别文件');
        return;
      }

      if (
        !resolvedWebhookUrl ||
        !validateInvoiceOcrWebhookUrl(resolvedWebhookUrl)
      ) {
        const configError =
          'Webhook 地址缺失或格式无效，请先检查 Invoice OCR 配置。';
        message.error(configError);
        const configException = new Error(configError);
        onUploadError?.(configException);
        showError({
          title: 'Webhook 配置无效',
          message: configError,
        });
        trackInvoiceOcrEvent('invoice_ocr_upload_failed', {
          reason: 'invalid_webhook_config',
          workflowId,
        });
        return;
      }

      // 设置上传状态
      const startedAt = Date.now();
      setUploading(true);
      setUploadProgress(0);
      setEstimatedRemainingSec(null);

      let progressInterval: NodeJS.Timeout | null = null;
      let activeTraceId = '';
      let activeUploadSessionKey = '';
      let activeLeaseId = '';
      let activeChunkItems: Array<{ file: File; fingerprint: string }> = [];
      const successfulFingerprints = new Set<string>();

      try {
        const rawFiles = fileList.map(file => file.originFileObj as File);
        const fingerprints = await Promise.all(
          rawFiles.map(async file => ({
            file,
            fingerprint: await invoiceOCRService.computeFileFingerprint(file),
          }))
        );
        const dedupedInBatchMap = new Map<
          string,
          { file: File; fingerprint: string }
        >();
        for (const item of fingerprints) {
          if (dedupedInBatchMap.has(item.fingerprint)) {
            message.warning(
              `文件 ${item.file.name} 与已选文件内容重复，已自动去重`
            );
            continue;
          }
          dedupedInBatchMap.set(item.fingerprint, item);
        }
        const dedupedFiles = Array.from(dedupedInBatchMap.values());
        const cachedEntries: Array<{
          file: File;
          fingerprint: string;
          cacheEntry: NonNullable<
            ReturnType<typeof invoiceOCRService.getFingerprintCacheEntry>
          >;
        }> = [];
        const filesToUpload: Array<{ file: File; fingerprint: string }> = [];
        for (const item of dedupedFiles) {
          const cacheEntry = invoiceOCRService.getFingerprintCacheEntry(
            item.fingerprint
          );
          const cacheFresh = Boolean(
            cacheEntry &&
              cacheEntry.workflowId === workflowId &&
              Date.now() - new Date(cacheEntry.lastSeenAt).getTime() <=
                FILE_FINGERPRINT_CACHE_TTL_MS
          );
          if (cacheFresh) {
            cachedEntries.push({
              file: item.file,
              fingerprint: item.fingerprint,
              cacheEntry: cacheEntry!,
            });
          } else {
            filesToUpload.push(item);
          }
        }
        const files = filesToUpload.map(item => item.file);
        const baseIdempotencyKey = buildLocalIdempotencyKey(workflowId, files);
        const baseTraceId = buildInvoiceOcrTraceId(workflowId);
        let idempotencyKey = baseIdempotencyKey;
        let traceId = baseTraceId;
        activeTraceId = traceId;

        if (cachedEntries.length > 0) {
          message.info(
            `检测到 ${cachedEntries.length} 个重复文件，已复用历史识别缓存并跳过上传`
          );
        }
        if (files.length === 0) {
          const firstCache = cachedEntries[0]?.cacheEntry || null;
          try {
            onOCRCompleted?.({
              executionId: firstCache?.executionId || '',
              traceId: firstCache?.traceId || traceId,
              processedFiles: rawFiles.length,
              totalFiles: rawFiles.length,
              hasBusinessData: true,
              schemaWarnings: ['all_files_reused_from_local_fingerprint_cache'],
              idempotencyKey: firstCache?.idempotencyKey || idempotencyKey,
              rawResponse: {
                reusedFiles: cachedEntries.map(item => item.file.name),
              },
              ...(firstCache?.googleSheetsUrl
                ? { googleSheetsUrl: firstCache.googleSheetsUrl }
                : {}),
            });
          } catch (callbackError) {
            console.error(
              'onOCRCompleted回调执行失败(缓存命中):',
              callbackError
            );
          }
          setFileList([]);
          onFileListChange?.([]);
          setUploading(false);
          setUploadProgress(0);
          setEstimatedRemainingSec(null);
          message.success('全部文件命中历史缓存，无需重复上传');
          trackInvoiceOcrEvent('invoice_ocr_upload_completed', {
            workflowId,
            fileCount: rawFiles.length,
            dedupedCount: cachedEntries.length,
            traceId,
            cacheOnly: true,
          });
          return;
        }

        const uploadChunkSize = Math.max(1, invoiceOcrConfig.uploadChunkSize);
        const workflowQuarantineEntries =
          invoiceOCRService.getQuarantineEntries(workflowId);
        const quarantineFingerprintSet = new Set(
          workflowQuarantineEntries.map(entry => entry.fingerprint)
        );
        setQuarantineEntries(workflowQuarantineEntries);
        const isolatedRetryItems = filesToUpload.filter(item =>
          quarantineFingerprintSet.has(item.fingerprint)
        );
        const normalRetryItems = filesToUpload.filter(
          item => !quarantineFingerprintSet.has(item.fingerprint)
        );
        const uploadChunks = [
          ...isolatedRetryItems.map(item => [item]),
          ...chunkFiles(normalRetryItems, uploadChunkSize),
        ];
        if (isolatedRetryItems.length > 0) {
          message.info(
            `检测到 ${isolatedRetryItems.length} 个隔离文件，将采用单文件隔离重试流程`
          );
        }
        const uploadFingerprintSequence = filesToUpload.map(
          item => item.fingerprint
        );
        const uploadSessionKey = buildUploadSessionKey(
          workflowId,
          uploadFingerprintSequence,
          uploadChunkSize
        );
        activeUploadSessionKey = uploadSessionKey;
        const chunkSummaryMap = new Map<number, InvoiceOcrChunkUploadSummary>();
        let resumedChunkCount = 0;

        const resumeState = readUploadResumeState(workflowId, uploadSessionKey);
        if (
          resumeState &&
          resumeState.totalChunks === uploadChunks.length &&
          resumeState.chunkSize === uploadChunkSize &&
          resumeState.fingerprintSequence.join('|') ===
            uploadFingerprintSequence.join('|')
        ) {
          if (resumeState.idempotencyKey) {
            idempotencyKey = resumeState.idempotencyKey;
          }
          if (resumeState.traceId) {
            traceId = resumeState.traceId;
            activeTraceId = traceId;
          }
          for (const summary of resumeState.chunkSummaries) {
            if (
              typeof summary.chunkIndex === 'number' &&
              summary.chunkIndex >= 0 &&
              summary.chunkIndex < uploadChunks.length
            ) {
              chunkSummaryMap.set(summary.chunkIndex, summary);
            }
          }
          resumedChunkCount = chunkSummaryMap.size;
          if (resumedChunkCount > 0) {
            message.info(
              `检测到上次中断，已恢复 ${resumedChunkCount}/${uploadChunks.length} 个分片进度`
            );
          }
        } else if (resumeState) {
          clearUploadResumeState(workflowId, uploadSessionKey);
        }

        const idempotencyRegistration =
          invoiceOCRService.registerIdempotencyKey(
            workflowId,
            idempotencyKey,
            uploadFingerprintSequence.join('|'),
            {
              traceId,
              ttlHours: 24,
            }
          );
        if (!idempotencyRegistration.accepted) {
          throw new Error(
            '检测到相同 idempotency key 的冲突请求，已阻止覆盖写入'
          );
        }

        const leaseResult = invoiceOCRService.acquireQueueLease(
          workflowId,
          traceId || idempotencyKey,
          {
            maxConcurrency: invoiceOcrConfig.globalQueueConcurrency,
            leaseTimeoutMs: invoiceOcrConfig.queueLeaseTimeoutMs,
          }
        );
        if (!leaseResult.acquired) {
          if (
            invoiceOCRService.shouldEmitAlert(
              'invoice_ocr_queue_concurrency_cap',
              invoiceOcrConfig.alertQuietWindowMinutes
            )
          ) {
            message.warning(
              `当前识别队列繁忙（${leaseResult.activeCount}/${leaseResult.maxConcurrency}），请稍后重试`
            );
          }
          trackInvoiceOcrEvent('invoice_ocr_upload_failed', {
            workflowId,
            reason: 'queue_concurrency_cap_reached',
            traceId,
          });
          return;
        }
        activeLeaseId = leaseResult.leaseId || '';

        writeUploadResumeState(workflowId, uploadSessionKey, {
          version: 1,
          workflowId,
          sessionKey: uploadSessionKey,
          idempotencyKey,
          traceId,
          chunkSize: uploadChunkSize,
          totalChunks: uploadChunks.length,
          fingerprintSequence: uploadFingerprintSequence,
          chunkSummaries: Array.from(chunkSummaryMap.values()).sort(
            (a, b) => a.chunkIndex - b.chunkIndex
          ),
        });

        trackInvoiceOcrEvent('invoice_ocr_upload_started', {
          workflowId,
          fileCount: files.length,
          dedupedCount: cachedEntries.length,
          idempotencyKey,
          traceId,
          resumedChunkCount,
          resumed: resumedChunkCount > 0,
          isolatedRetryCount: isolatedRetryItems.length,
          queueLeaseId: activeLeaseId,
        });

        try {
          onOCRProcess?.(files);
        } catch (callbackError) {
          console.error(
            'onOCRProcess回调执行失败(开始处理阶段):',
            callbackError
          );
        }

        console.log('开始上传PDF文件到n8n webhook:', {
          fileCount: files.length,
          chunkCount: uploadChunks.length,
          webhookUrl: resolvedWebhookUrl,
          workflowId,
        });

        // 模拟上传进度
        progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              return prev;
            }
            const nextProgress = Math.min(90, prev + Math.random() * 15);
            const elapsedMs = Date.now() - startedAt;
            if (elapsedMs > 0 && nextProgress > 0) {
              const estimatedTotalMs = elapsedMs / (nextProgress / 100);
              const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
              setEstimatedRemainingSec(Math.ceil(remainingMs / 1000));
            }
            return nextProgress;
          });
        }, 300);

        const webhookResponsesByChunk = new Map<number, any>();
        for (
          let chunkIndex = 0;
          chunkIndex < uploadChunks.length;
          chunkIndex += 1
        ) {
          const currentChunk = uploadChunks[chunkIndex];
          if (!currentChunk) {
            continue;
          }
          activeChunkItems = currentChunk;
          if (activeLeaseId) {
            invoiceOCRService.refreshQueueLease(activeLeaseId);
          }
          if (chunkSummaryMap.has(chunkIndex)) {
            currentChunk.forEach(item =>
              successfulFingerprints.add(item.fingerprint)
            );
            setUploadProgress(prev => {
              const chunkProgress = Math.round(
                30 + ((chunkIndex + 1) / uploadChunks.length) * 65
              );
              return Math.max(prev, Math.min(95, chunkProgress));
            });
            continue;
          }

          const webhookResponse = await n8nWebhookService.uploadFilesToWebhook(
            resolvedWebhookUrl,
            {
              files: currentChunk.map(item => item.file),
              workflowId,
              batchName:
                batchName ||
                invoiceOCRService.generateBatchName(
                  `invoice-upload-${chunkIndex + 1}`
                ),
              idempotencyKey: `${idempotencyKey}:chunk-${chunkIndex + 1}`,
              metadata: {
                traceId,
                processingOptions: memoizedProcessingOptions,
                timestamp: new Date().toISOString(),
                source: 'wendeal-dashboard',
                chunkIndex: chunkIndex + 1,
                totalChunks: uploadChunks.length,
              },
            }
          );
          if (!webhookResponse?.success) {
            throw new Error(webhookResponse?.message || 'n8n工作流处理失败');
          }
          webhookResponsesByChunk.set(chunkIndex, webhookResponse);
          chunkSummaryMap.set(
            chunkIndex,
            toChunkUploadSummary(chunkIndex, webhookResponse)
          );
          currentChunk.forEach(item =>
            successfulFingerprints.add(item.fingerprint)
          );
          activeChunkItems = [];
          writeUploadResumeState(workflowId, uploadSessionKey, {
            version: 1,
            workflowId,
            sessionKey: uploadSessionKey,
            idempotencyKey,
            traceId,
            chunkSize: uploadChunkSize,
            totalChunks: uploadChunks.length,
            fingerprintSequence: uploadFingerprintSequence,
            chunkSummaries: Array.from(chunkSummaryMap.values()).sort(
              (a, b) => a.chunkIndex - b.chunkIndex
            ),
          });
          setUploadProgress(prev => {
            const chunkProgress = Math.round(
              30 + ((chunkIndex + 1) / uploadChunks.length) * 65
            );
            return Math.max(prev, Math.min(95, chunkProgress));
          });
        }
        const orderedChunkSummaries = Array.from(chunkSummaryMap.values()).sort(
          (a, b) => a.chunkIndex - b.chunkIndex
        );
        if (orderedChunkSummaries.length !== uploadChunks.length) {
          throw new Error('分片上传未完成，请重试继续续传');
        }
        const latestChunkSummary =
          orderedChunkSummaries[orderedChunkSummaries.length - 1];
        const latestChunkResponse = webhookResponsesByChunk.get(
          uploadChunks.length - 1
        );
        const rawChunkPayload = uploadChunks.map((_, chunkIndex) => {
          const response = webhookResponsesByChunk.get(chunkIndex);
          if (response) {
            return response.data;
          }
          return {
            resumedFromCheckpoint: true,
            chunkIndex: chunkIndex + 1,
          };
        });

        // 完成上传进度
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        setUploadProgress(100);

        console.log(
          'n8n webhook响应:',
          latestChunkResponse || latestChunkSummary
        );

        if (orderedChunkSummaries.length === uploadChunks.length) {
          console.log('=== WEBHOOK 响应成功 ===');
          console.log(
            '完整的webhookResponse:',
            JSON.stringify(
              redactSensitiveData(latestChunkResponse || latestChunkSummary),
              null,
              2
            )
          );

          // 显示成功消息
          message.success('文件已提交到识别工作流');
          if (resumedChunkCount > 0) {
            message.info(
              `本次已基于断点续传恢复 ${resumedChunkCount} 个历史分片`
            );
          }

          // 处理工作流返回的数据
          console.log('=== 分析 WEBHOOK 响应数据结构 ===');
          console.log(
            'webhookResponse.data 类型:',
            typeof latestChunkResponse?.data
          );
          console.log(
            'webhookResponse.data 是否为数组:',
            Array.isArray(latestChunkResponse?.data)
          );
          console.log(
            'webhookResponse.data 内容:',
            redactSensitiveData(latestChunkResponse?.data)
          );

          const enhancedData = extractEnhancedData(latestChunkResponse?.data);
          const hasBusinessData = orderedChunkSummaries.some(summary =>
            Boolean(summary.hasBusinessData)
          );
          const schemaWarnings = Array.from(
            new Set(
              orderedChunkSummaries.flatMap(
                summary => summary.schemaWarnings || []
              )
            )
          );
          const attemptCount = orderedChunkSummaries.reduce(
            (total, summary) => {
              return total + (summary.attemptCount || 1);
            },
            0
          );
          const elapsedMs = orderedChunkSummaries.reduce((total, summary) => {
            return total + (summary.elapsedMs || 0);
          }, 0);
          const executionId =
            orderedChunkSummaries.find(summary => summary.executionId)
              ?.executionId || '';
          const googleSheetsUrl = orderedChunkSummaries.find(
            summary => summary.googleSheetsUrl
          )?.googleSheetsUrl;
          const transportWarnings = Array.from(
            new Set(
              orderedChunkSummaries.flatMap(
                summary => summary.transportWarnings || []
              )
            )
          );
          const responseDiagnostics = latestChunkSummary
            ? {
                ...(typeof latestChunkSummary.httpStatus === 'number'
                  ? { httpStatus: latestChunkSummary.httpStatus }
                  : {}),
                ...(latestChunkSummary.contentType
                  ? { contentType: latestChunkSummary.contentType }
                  : {}),
                idempotencyKey:
                  latestChunkSummary.idempotencyKey || idempotencyKey,
                schemaWarnings,
                attemptCount,
                elapsedMs,
                transportWarnings,
              }
            : undefined;
          if (attemptCount > 1) {
            message.info(`请求在第 ${attemptCount} 次重试后成功`);
          }

          // 准备完成数据
          const completedData = {
            executionId,
            traceId,
            googleSheetsUrl:
              googleSheetsUrl ||
              'https://docs.google.com/spreadsheets/d/1K8VGSofJUBK7yCTqtaPNQvSZ1HeGDNZOvO2UQ6SRJzg/edit?usp=sharing',
            processedFiles: rawFiles.length,
            totalFiles: rawFiles.length,
            enhancedData: enhancedData,
            hasBusinessData,
            schemaWarnings,
            idempotencyKey:
              latestChunkSummary?.idempotencyKey || idempotencyKey,
            rawResponse: rawChunkPayload,
            ...(responseDiagnostics
              ? { diagnostics: responseDiagnostics }
              : {}),
          };

          for (const cached of cachedEntries) {
            invoiceOCRService.saveFingerprintCacheEntry({
              ...cached.cacheEntry,
              fingerprint: cached.fingerprint,
            });
          }
          for (const item of filesToUpload) {
            invoiceOCRService.saveFingerprintCacheEntry({
              fingerprint: item.fingerprint,
              workflowId,
              fileName: item.file.name,
              fileSize: item.file.size,
              fileType: item.file.type,
              lastSeenAt: new Date().toISOString(),
              ...(executionId ? { executionId } : {}),
              ...(completedData.idempotencyKey
                ? { idempotencyKey: completedData.idempotencyKey }
                : {}),
              ...(traceId ? { traceId } : {}),
              ...(googleSheetsUrl ? { googleSheetsUrl } : {}),
            });
          }
          clearUploadResumeState(workflowId, uploadSessionKey);
          if (successfulFingerprints.size > 0) {
            invoiceOCRService.clearQuarantineEntries(
              workflowId,
              Array.from(successfulFingerprints)
            );
            setQuarantineEntries(
              invoiceOCRService.getQuarantineEntries(workflowId)
            );
          }

          if (!hasBusinessData) {
            message.warning(
              '识别任务已提交，但未返回可展示结果。请稍后点击“刷新结果”，或检查 n8n 执行日志。'
            );
            trackInvoiceOcrEvent('invoice_ocr_empty_response', {
              workflowId,
              executionId,
              idempotencyKey:
                latestChunkSummary?.idempotencyKey || idempotencyKey,
              traceId,
              schemaWarnings: schemaWarnings.join(','),
              attemptCount,
              elapsedMs,
            });
          } else {
            trackInvoiceOcrEvent('invoice_ocr_upload_completed', {
              workflowId,
              executionId,
              idempotencyKey:
                latestChunkSummary?.idempotencyKey || idempotencyKey,
              traceId,
              fileCount: rawFiles.length,
              uploadedFileCount: files.length,
              dedupedCount: cachedEntries.length,
              chunkCount: uploadChunks.length,
              attemptCount,
              elapsedMs,
              resumedChunkCount,
            });
          }

          console.log('准备调用onOCRCompleted回调:', completedData);

          // 安全地调用处理完成回调，传递完成数据
          try {
            onOCRCompleted?.(completedData);
            console.log('onOCRCompleted回调执行成功');
          } catch (callbackError) {
            console.error('onOCRCompleted回调执行失败:', callbackError);
            // 即使回调失败，也不应该影响主流程
          }

          // 清空文件列表
          setFileList([]);
          onFileListChange?.([]);

          console.log('=== OCR处理流程完成 ===');
        }
      } catch (error) {
        // 清理进度状态
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        console.error('发送文件到n8n失败:', error);
        if (activeUploadSessionKey) {
          message.info('已保存分片上传断点，可重试后自动续传');
        }
        if (activeChunkItems.length > 0) {
          const reason =
            error instanceof Error && error.message
              ? error.message
              : 'unknown_upload_error';
          const quarantined = invoiceOCRService.upsertQuarantineEntries(
            workflowId,
            activeChunkItems.map(item => ({
              fingerprint: item.fingerprint,
              workflowId,
              fileName: item.file.name,
              fileSize: item.file.size,
              fileType: item.file.type,
              reason,
              failedAt: new Date().toISOString(),
              retryCount: 1,
              ...(activeTraceId ? { traceId: activeTraceId } : {}),
            }))
          );
          setQuarantineEntries(quarantined);
          if (
            invoiceOCRService.shouldEmitAlert(
              'invoice_ocr_quarantine_lane_updated',
              invoiceOcrConfig.alertQuietWindowMinutes
            )
          ) {
            message.warning(
              `已将 ${activeChunkItems.length} 个失败文件移入隔离队列，后续将单文件重试`
            );
          }
        }

        // 获取更详细的错误信息
        const mappedError = normalizeInvoiceOcrError(error, 'upload');
        let errorTitle = mappedError.title;
        let errorMessage = mappedError.message;
        let errorDetails = undefined;

        if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails = error.stack;

          // 检查是否是网络错误
          if (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')
          ) {
            errorTitle = '网络连接失败';
            errorMessage = '无法连接到工作流服务，请检查网络连接后重试。';
          }
          // 检查是否是超时错误
          else if (
            error.message.includes('timeout') ||
            error.message.includes('AbortError')
          ) {
            errorTitle = '请求超时';
            errorMessage =
              '请求处理时间过长，可能与文件体积或网络速度有关，请稍后重试。';
          }
          // 检查是否是服务器错误
          else if (
            error.message.includes('500') ||
            error.message.includes('Internal Server Error')
          ) {
            errorTitle = '服务端错误';
            errorMessage = '工作流服务发生内部错误，请稍后重试。';
          }
          // 检查是否是认证错误
          else if (
            error.message.includes('401') ||
            error.message.includes('403')
          ) {
            errorTitle = '认证失败';
            errorMessage = '请求被拒绝，请检查 webhook 地址与认证配置。';
          }
          // 检查是否是文件格式错误
          else if (
            error.message.includes('format') ||
            error.message.includes('type')
          ) {
            errorTitle = '文件格式错误';
            errorMessage =
              '存在不支持的文件格式，请使用 PDF、JPEG、PNG、TIFF、BMP、DOCX、XLSX。';
          }
          // 检查是否是n8n工作流错误
          else if (
            error.message.includes('n8n工作流处理失败') ||
            error.message.includes('Error in workflow')
          ) {
            errorTitle = '工作流执行失败';
            errorMessage =
              'n8n 工作流执行发生错误，请检查节点配置、凭据权限与执行日志。';
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
        trackInvoiceOcrEvent('invoice_ocr_upload_failed', {
          workflowId,
          reason: `${mappedError.code}:${errorMessage}`,
          fileCount: fileList.length,
          traceId: activeTraceId,
        });
        onUploadError?.(
          error instanceof Error
            ? error
            : new Error(errorMessage || 'OCR workflow processing failed')
        );
      } finally {
        if (activeLeaseId) {
          invoiceOCRService.releaseQueueLease(activeLeaseId);
          activeLeaseId = '';
        }
        // 重置上传状态
        setUploading(false);
        setUploadProgress(0);
        setEstimatedRemainingSec(null);
      }
    }, [
      fileList,
      onOCRProcess,
      onFileListChange,
      workflowId,
      invoiceOcrConfig.uploadChunkSize,
      invoiceOcrConfig.globalQueueConcurrency,
      invoiceOcrConfig.queueLeaseTimeoutMs,
      invoiceOcrConfig.alertQuietWindowMinutes,
      resolvedWebhookUrl,
      batchName,
      memoizedProcessingOptions,
      message,
      showError,
      onOCRCompleted,
      onUploadError,
    ]);

    /**
     * Start upload
     */
    const handleStartUpload = useCallback(async () => {
      if (fileList.length === 0) {
        message.warning('请先选择要上传的文件');
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

        message.success(`文件上传成功，批次 ID：${batchTask.id}`);

        // Clear file list
        setFileList([]);
        onFileListChange?.([]);
        onUploadSuccess?.(batchTask);
      } catch (error) {
        showError({
          title: '上传失败',
          message: error instanceof Error ? error.message : '未知错误',
          details: error instanceof Error ? error.stack : undefined,
        });
        onUploadError?.(error instanceof Error ? error : new Error('上传失败'));
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
              <Tooltip key='move-top' title='置顶'>
                <Button
                  type='text'
                  size='small'
                  icon={<ArrowUpOutlined />}
                  onClick={() => handleMoveToTop(file)}
                  disabled={uploading}
                />
              </Tooltip>,
              <Tooltip key='revalidate' title='重新校验'>
                <Button
                  type='text'
                  size='small'
                  icon={<RedoOutlined />}
                  onClick={() => {
                    void handleRevalidateFile(file);
                  }}
                  disabled={uploading}
                />
              </Tooltip>,
              <Tooltip key='preview' title='预览'>
                <Button
                  type='text'
                  size='small'
                  icon={<EyeOutlined />}
                  onClick={() => handlePreviewFile(file)}
                />
              </Tooltip>,
              <Tooltip key='delete' title='删除'>
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
      [
        handleMoveToTop,
        handlePreviewFile,
        handleRemoveFile,
        handleRevalidateFile,
        uploading,
      ]
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
        <Card title='文件上传' className='upload-card'>
          {/* Upload area */}
          <Dragger
            multiple
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleFileListChange}
            onRemove={handleRemoveFile}
            onPreview={handlePreviewFile}
            disabled={uploading}
            accept='.pdf,.jpg,.jpeg,.png,.tiff,.bmp,.doc,.docx,.xls,.xlsx'
            className='upload-dragger'
          >
            <p className='ant-upload-drag-icon'>
              <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className='ant-upload-text'>点击或拖拽文件到此处上传</p>
            <p className='ant-upload-hint'>
              支持 PDF、JPEG、PNG、TIFF、BMP、DOCX、XLSX，单文件不超过{' '}
              {maxFileSize}MB，最多 {maxFiles} 个文件
            </p>
          </Dragger>

          {quarantineEntries.length > 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type='warning'
              showIcon
              message={`隔离队列中有 ${quarantineEntries.length} 个失败文件`}
              description='系统会优先按单文件模式重试这些文件，避免影响正常批次。'
              action={
                <Button size='small' onClick={handleClearQuarantine}>
                  清空隔离队列
                </Button>
              }
            />
          )}

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
                  正在上传并提交识别流程...
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
                正在处理文件，请稍候。识别时长取决于文件大小与复杂度。
                {typeof estimatedRemainingSec === 'number' &&
                  estimatedRemainingSec > 0 &&
                  ` 预计剩余约 ${estimatedRemainingSec} 秒。`}
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
                    已选文件 ({fileStats.count}/{maxFiles})
                  </Title>
                </Col>
                <Col>
                  <Space>
                    <Button
                      type='primary'
                      icon={<ScanOutlined />}
                      onClick={handleOCRProcess}
                      loading={ocrProcessing || uploading}
                      disabled={
                        !fileStats.hasFiles || ocrProcessing || uploading
                      }
                    >
                      上传并识别
                    </Button>
                    <Button
                      icon={<CloudUploadOutlined />}
                      onClick={handleStartUpload}
                      loading={uploading}
                      disabled={!fileStats.canUpload}
                    >
                      仅上传
                    </Button>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={handleClearFiles}
                      disabled={
                        uploading || !fileStats.hasFiles || ocrProcessing
                      }
                    >
                      清空
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
              message='使用提示'
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>支持批量上传多张发票文件</li>
                  <li>支持 PDF、图片及 Office 文件（DOCX、XLSX）</li>
                  <li>建议上传清晰且完整的发票，提升识别准确率</li>
                  <li>上传后系统将自动完成 OCR 识别与字段提取</li>
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
          title={errorInfo?.title}
          message={errorInfo?.message || ''}
          details={errorInfo?.details}
          troubleshooting={errorInfo?.troubleshooting}
          onClose={hideError}
        />
      </div>
    );
  }
);

export default InvoiceFileUpload;

// Display name for debugging
InvoiceFileUpload.displayName = 'InvoiceFileUpload';
