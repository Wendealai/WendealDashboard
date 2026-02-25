type InvoiceOcrRuntimeConfig = {
  webhookUrl?: string;
  workflowId?: string;
  resultPollingIntervalMs?: number;
  resultPollingHiddenIntervalMs?: number;
  resultPollingTimeoutMs?: number;
  resultPollingFailureThreshold?: number;
  postSuccessRediagnoseDelayMs?: number;
  uploadChunkSize?: number;
  webhookSignatureSecret?: string;
  webhookSignatureStrict?: boolean;
  globalQueueConcurrency?: number;
  queueLeaseTimeoutMs?: number;
  alertQuietWindowMinutes?: number;
  diagnosticsArchiveIntervalMs?: number;
  manualCorrectionAllowedRoles?: string;
  telemetryEndpoint?: string;
  debug?: boolean;
};

type RuntimeConfigRoot = {
  invoiceOCR?: InvoiceOcrRuntimeConfig;
};

type InvoiceOcrRuntime = typeof globalThis & {
  __WENDEAL_RUNTIME_CONFIG__?: RuntimeConfigRoot;
  __WENDEAL_INVOICE_OCR_CONFIG__?: InvoiceOcrRuntimeConfig;
};

export interface InvoiceOcrConfig {
  webhookUrl: string;
  workflowId: string;
  resultPollingIntervalMs: number;
  resultPollingHiddenIntervalMs: number;
  resultPollingTimeoutMs: number;
  resultPollingFailureThreshold: number;
  postSuccessRediagnoseDelayMs: number;
  uploadChunkSize: number;
  webhookSignatureSecret?: string;
  webhookSignatureStrict: boolean;
  globalQueueConcurrency: number;
  queueLeaseTimeoutMs: number;
  alertQuietWindowMinutes: number;
  diagnosticsArchiveIntervalMs: number;
  manualCorrectionAllowedRoles: string[];
  telemetryEndpoint?: string;
  debug: boolean;
}

const DEFAULT_INVOICE_OCR_WEBHOOK_URL =
  'https://n8n.wendealai.com/webhook/invoiceOCR';
const DEFAULT_INVOICE_OCR_WORKFLOW_ID = 'default-workflow';
const DEFAULT_RESULT_POLLING_INTERVAL_MS = 4000;
const DEFAULT_RESULT_POLLING_HIDDEN_INTERVAL_MS = 12000;
const DEFAULT_RESULT_POLLING_TIMEOUT_MS = 120000;
const DEFAULT_RESULT_POLLING_FAILURE_THRESHOLD = 3;
const DEFAULT_POST_SUCCESS_REDIAGNOSE_DELAY_MS = 30000;
const DEFAULT_UPLOAD_CHUNK_SIZE = 10;
const DEFAULT_GLOBAL_QUEUE_CONCURRENCY = 2;
const DEFAULT_QUEUE_LEASE_TIMEOUT_MS = 120000;
const DEFAULT_ALERT_QUIET_WINDOW_MINUTES = 10;
const DEFAULT_DIAGNOSTICS_ARCHIVE_INTERVAL_MS = 300000;
const DEFAULT_MANUAL_CORRECTION_ALLOWED_ROLES = ['admin', 'manager'];

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toPositiveInteger = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed);
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return undefined;
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const items = value
      .map(item => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
      .filter(item => item.length > 0);
    return items.length > 0 ? Array.from(new Set(items)) : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const items = value
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0);
  return items.length > 0 ? Array.from(new Set(items)) : undefined;
};

const getRuntimeInvoiceOcrConfig = (): InvoiceOcrRuntimeConfig => {
  const runtime = globalThis as InvoiceOcrRuntime;

  return {
    ...(runtime.__WENDEAL_RUNTIME_CONFIG__?.invoiceOCR || {}),
    ...(runtime.__WENDEAL_INVOICE_OCR_CONFIG__ || {}),
  };
};

export const getInvoiceOcrConfig = (): InvoiceOcrConfig => {
  const runtime = getRuntimeInvoiceOcrConfig();

  const webhookUrl =
    toNonEmptyString(runtime.webhookUrl) ||
    toNonEmptyString(import.meta.env.VITE_INVOICE_OCR_WEBHOOK_URL) ||
    DEFAULT_INVOICE_OCR_WEBHOOK_URL;

  const workflowId =
    toNonEmptyString(runtime.workflowId) ||
    toNonEmptyString(import.meta.env.VITE_INVOICE_OCR_WORKFLOW_ID) ||
    DEFAULT_INVOICE_OCR_WORKFLOW_ID;

  const resultPollingIntervalMs =
    toPositiveInteger(runtime.resultPollingIntervalMs) ||
    toPositiveInteger(import.meta.env.VITE_INVOICE_OCR_POLL_INTERVAL_MS) ||
    DEFAULT_RESULT_POLLING_INTERVAL_MS;

  const resultPollingHiddenIntervalMs =
    toPositiveInteger(runtime.resultPollingHiddenIntervalMs) ||
    toPositiveInteger(
      import.meta.env.VITE_INVOICE_OCR_POLL_HIDDEN_INTERVAL_MS
    ) ||
    DEFAULT_RESULT_POLLING_HIDDEN_INTERVAL_MS;

  const resultPollingTimeoutMs =
    toPositiveInteger(runtime.resultPollingTimeoutMs) ||
    toPositiveInteger(import.meta.env.VITE_INVOICE_OCR_POLL_TIMEOUT_MS) ||
    DEFAULT_RESULT_POLLING_TIMEOUT_MS;

  const resultPollingFailureThreshold =
    toPositiveInteger(runtime.resultPollingFailureThreshold) ||
    toPositiveInteger(
      import.meta.env.VITE_INVOICE_OCR_POLL_FAILURE_THRESHOLD
    ) ||
    DEFAULT_RESULT_POLLING_FAILURE_THRESHOLD;

  const postSuccessRediagnoseDelayMs =
    toPositiveInteger(runtime.postSuccessRediagnoseDelayMs) ||
    toPositiveInteger(import.meta.env.VITE_INVOICE_OCR_REDIAGNOSE_DELAY_MS) ||
    DEFAULT_POST_SUCCESS_REDIAGNOSE_DELAY_MS;

  const uploadChunkSize =
    toPositiveInteger(runtime.uploadChunkSize) ||
    toPositiveInteger(import.meta.env.VITE_INVOICE_OCR_UPLOAD_CHUNK_SIZE) ||
    DEFAULT_UPLOAD_CHUNK_SIZE;

  const webhookSignatureSecret =
    toNonEmptyString(runtime.webhookSignatureSecret) ||
    toNonEmptyString(import.meta.env.VITE_INVOICE_OCR_WEBHOOK_SIGNATURE_SECRET);

  const webhookSignatureStrict =
    toBoolean(runtime.webhookSignatureStrict) ??
    toBoolean(import.meta.env.VITE_INVOICE_OCR_WEBHOOK_SIGNATURE_STRICT) ??
    false;

  const globalQueueConcurrency =
    toPositiveInteger(runtime.globalQueueConcurrency) ||
    toPositiveInteger(import.meta.env.VITE_INVOICE_OCR_QUEUE_CONCURRENCY) ||
    DEFAULT_GLOBAL_QUEUE_CONCURRENCY;

  const queueLeaseTimeoutMs =
    toPositiveInteger(runtime.queueLeaseTimeoutMs) ||
    toPositiveInteger(
      import.meta.env.VITE_INVOICE_OCR_QUEUE_LEASE_TIMEOUT_MS
    ) ||
    DEFAULT_QUEUE_LEASE_TIMEOUT_MS;

  const alertQuietWindowMinutes =
    toPositiveInteger(runtime.alertQuietWindowMinutes) ||
    toPositiveInteger(
      import.meta.env.VITE_INVOICE_OCR_ALERT_QUIET_WINDOW_MINUTES
    ) ||
    DEFAULT_ALERT_QUIET_WINDOW_MINUTES;

  const diagnosticsArchiveIntervalMs =
    toPositiveInteger(runtime.diagnosticsArchiveIntervalMs) ||
    toPositiveInteger(
      import.meta.env.VITE_INVOICE_OCR_DIAGNOSTICS_ARCHIVE_INTERVAL_MS
    ) ||
    DEFAULT_DIAGNOSTICS_ARCHIVE_INTERVAL_MS;

  const manualCorrectionAllowedRoles =
    toStringArray(runtime.manualCorrectionAllowedRoles) ||
    toStringArray(import.meta.env.VITE_INVOICE_OCR_MANUAL_CORRECTION_ROLES) ||
    DEFAULT_MANUAL_CORRECTION_ALLOWED_ROLES;

  const telemetryEndpoint =
    toNonEmptyString(runtime.telemetryEndpoint) ||
    toNonEmptyString(import.meta.env.VITE_INVOICE_OCR_TELEMETRY_ENDPOINT);

  const debug =
    toBoolean(runtime.debug) ??
    toBoolean(import.meta.env.VITE_INVOICE_OCR_DEBUG) ??
    false;

  return {
    webhookUrl,
    workflowId,
    resultPollingIntervalMs,
    resultPollingHiddenIntervalMs,
    resultPollingTimeoutMs,
    resultPollingFailureThreshold,
    postSuccessRediagnoseDelayMs,
    uploadChunkSize,
    ...(webhookSignatureSecret ? { webhookSignatureSecret } : {}),
    webhookSignatureStrict,
    globalQueueConcurrency,
    queueLeaseTimeoutMs,
    alertQuietWindowMinutes,
    diagnosticsArchiveIntervalMs,
    manualCorrectionAllowedRoles,
    ...(telemetryEndpoint ? { telemetryEndpoint } : {}),
    debug,
  };
};

export const validateInvoiceOcrWebhookUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
