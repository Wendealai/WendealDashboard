type InvoiceOcrRuntimeConfig = {
  webhookUrl?: string;
  workflowId?: string;
  resultPollingIntervalMs?: number;
  resultPollingHiddenIntervalMs?: number;
  resultPollingTimeoutMs?: number;
  resultPollingFailureThreshold?: number;
  postSuccessRediagnoseDelayMs?: number;
  uploadChunkSize?: number;
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
