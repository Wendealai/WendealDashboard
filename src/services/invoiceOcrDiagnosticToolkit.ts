export interface InvoiceOcrDiagnosticHistoryEntry {
  id: string;
  capturedAt: string;
  workflowId: string;
  source:
    | 'manual_diagnostics'
    | 'auto_polling_timeout'
    | 'auto_polling_failure'
    | 'auto_post_success'
    | 'scheduled_archive';
  healthy: boolean;
  snapshot: Record<string, unknown>;
}

const DIAGNOSTIC_HISTORY_STORAGE_KEY = 'invoice_ocr_diagnostic_history_v1';
const DEFAULT_HISTORY_LIMIT = 50;

const SENSITIVE_KEY_PATTERN =
  /(token|key|authorization|cookie|secret|password|apikey|anonkey|bearer)/i;

const URL_QUERY_REDACT_KEYS = new Set([
  'token',
  'key',
  'apikey',
  'api_key',
  'auth',
  'authorization',
  'signature',
  'secret',
]);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const redactStringValue = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  // Redact bearer-like values and long tokens.
  if (
    /^bearer\s+/i.test(trimmed) ||
    (trimmed.length >= 24 && !trimmed.includes(' '))
  ) {
    return `${trimmed.slice(0, 6)}***${trimmed.slice(-4)}`;
  }

  // Redact query params in URL-like values.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      for (const key of url.searchParams.keys()) {
        if (URL_QUERY_REDACT_KEYS.has(key.toLowerCase())) {
          url.searchParams.set(key, '***');
        }
      }
      return url.toString();
    } catch {
      return value;
    }
  }

  return value;
};

export const redactSensitiveData = <T>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map(item => redactSensitiveData(item)) as T;
  }
  if (isObjectRecord(input)) {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '***';
        continue;
      }
      output[key] = redactSensitiveData(value);
    }
    return output as T;
  }
  if (typeof input === 'string') {
    return redactStringValue(input) as T;
  }
  return input;
};

export const buildInvoiceOcrTraceId = (workflowId: string): string => {
  const cleanWorkflowId = workflowId
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `ocr-${cleanWorkflowId || 'workflow'}-${timestamp}-${random}`;
};

const readRawHistory = (): InvoiceOcrDiagnosticHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(DIAGNOSTIC_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as InvoiceOcrDiagnosticHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getInvoiceOcrDiagnosticHistory =
  (): InvoiceOcrDiagnosticHistoryEntry[] => {
    return readRawHistory();
  };

export const appendInvoiceOcrDiagnosticHistory = (
  entry: InvoiceOcrDiagnosticHistoryEntry,
  maxEntries = DEFAULT_HISTORY_LIMIT
): InvoiceOcrDiagnosticHistoryEntry[] => {
  const next = [entry, ...readRawHistory()].slice(0, Math.max(1, maxEntries));
  localStorage.setItem(DIAGNOSTIC_HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
};
