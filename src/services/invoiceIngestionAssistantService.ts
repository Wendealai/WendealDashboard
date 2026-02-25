import {
  getInvoiceSourceBlob,
  removeInvoiceSourceBlob,
  saveInvoiceSourceBlob,
} from './invoiceIngestionBlobStore';
import {
  getInvoiceAssistantStateSnapshot,
  saveInvoiceAssistantStateSnapshot,
} from './invoiceIngestionStateStore';
import { createSparkeryIdempotencyKey } from './sparkeryIdempotency';
import type {
  BatchActionSummary,
  InvoiceApprovalStatus,
  InvoiceAssistantDocument,
  InvoiceAssistantSettings,
  InvoiceAssistantState,
  InvoiceExtractionResult,
  InvoiceGstStatus,
  InvoiceReconciliationStatus,
  InvoiceReviewDraft,
  ReconciliationSuggestion,
  SecurityAuditEncryptedExport,
  SecurityAuditSnapshot,
  SupplierDirectoryEntry,
  SyncBatchSummary,
  UploadBatchSummary,
  XeroSyncDraftPayload,
} from '@/pages/Tools/types/invoiceIngestionAssistant';

const STATE_STORAGE_KEY = 'invoice_ingestion_assistant_state_v1';
const MAX_BATCH_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 20000;
const REQUEST_RETRY_TIMES = 2;
const ORCHESTRATION_POLL_INTERVAL_MS = 1200;
const ORCHESTRATION_MAX_POLL_ATTEMPTS = 40;
const ABN_CACHE_TTL_MS = 60 * 60 * 1000;
const ABN_MIN_REQUEST_INTERVAL_MS = 250;
const SECURITY_EXPORT_PBKDF2_ITERATIONS = 120000;
const NON_RETRYABLE_SYNC_HINTS = [
  'missing required fields',
  'compliance rules blocked sync',
  'batch approval required',
  'duplicate precheck blocked',
  'abn validation failed',
];
const NON_RETRYABLE_RECOGNIZE_HINTS = [
  'missing from local vault',
  'original image is missing',
];
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const ABN_WEIGHT_FACTORS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const abnValidationCache = new Map<
  string,
  { valid: boolean; reason: string | null; expiresAt: number }
>();
const abnValidationInFlight = new Map<
  string,
  Promise<{ valid: boolean; reason: string | null }>
>();
let abnValidationLastRequestAt = 0;

const DEFAULT_SUPPLIERS: SupplierDirectoryEntry[] = [
  {
    id: 'supplier-coles',
    name: 'Coles',
    aliases: ['COLES', 'COLES EXPRESS'],
    abn: null,
    default_account_code: '400',
    default_tax_type: 'INPUT',
    default_currency: 'AUD',
    default_transaction_type: 'SPEND_MONEY',
  },
  {
    id: 'supplier-bunnings',
    name: 'Bunnings',
    aliases: ['BUNNINGS', 'BUNNINGS WAREHOUSE'],
    abn: null,
    default_account_code: '429',
    default_tax_type: 'INPUT',
    default_currency: 'AUD',
    default_transaction_type: 'SPEND_MONEY',
  },
  {
    id: 'supplier-fuel',
    name: 'Fuel Station',
    aliases: ['SHELL', 'BP', 'CALTEX', 'AMPOL', '7-ELEVEN'],
    abn: null,
    default_account_code: '429',
    default_tax_type: 'INPUT',
    default_currency: 'AUD',
    default_transaction_type: 'SPEND_MONEY',
  },
];

const DEFAULT_SETTINGS: InvoiceAssistantSettings = {
  drive_root_folder: 'Invoices',
  state_sync_endpoint: null,
  orchestration_endpoint: null,
  drive_archive_endpoint: null,
  ocr_extract_endpoint: null,
  xero_sync_endpoint: null,
  xero_attachment_endpoint: null,
  xero_duplicate_check_endpoint: null,
  abn_validation_endpoint: null,
  auto_learn_supplier_rules: true,
  require_batch_approval: false,
  default_currency: 'AUD',
  default_transaction_type: 'SPEND_MONEY',
  dry_run_mode: true,
  blob_retention_days: 30,
};

const nowIso = (): string => new Date().toISOString();

const createDefaultState = (): InvoiceAssistantState => ({
  version: 1,
  documents: [],
  suppliers: DEFAULT_SUPPLIERS,
  settings: DEFAULT_SETTINGS,
});

const toDateFolder = (date: Date): string => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const randomId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeCurrency = (value: string | null | undefined): string =>
  value && value.trim() ? value.trim().toUpperCase() : 'AUD';

const normalizeName = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeAliasToken = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[#-]?\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeAbnDigits = (
  value: string | null | undefined
): string | null => {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D+/g, '');
  if (digits.length !== 11) {
    return null;
  }
  return digits;
};

const resolveBlobRetentionDays = (
  settings: Pick<InvoiceAssistantSettings, 'blob_retention_days'>
): number => {
  return typeof settings.blob_retention_days === 'number' &&
    Number.isFinite(settings.blob_retention_days)
    ? Math.max(1, Math.floor(settings.blob_retention_days))
    : DEFAULT_SETTINGS.blob_retention_days;
};

const isPastRetentionCutoff = (
  doc: InvoiceAssistantDocument,
  cutoffMs: number
): boolean => {
  if (doc.status !== 'synced' || !doc.synced_at) {
    return false;
  }
  const syncedAtMs = Date.parse(doc.synced_at);
  return Number.isFinite(syncedAtMs) && syncedAtMs <= cutoffMs;
};

const maskAbnForAudit = (value: string | null | undefined): string | null => {
  const digits = normalizeAbnDigits(value);
  if (!digits) {
    return null;
  }
  return `${digits.slice(0, 2)}******${digits.slice(-3)}`;
};

const redactTokenLikeSegments = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return value
    .replace(/https?:\/\/\S+/gi, '[REDACTED_URL]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[REDACTED_TOKEN]');
};

const redactSensitiveDocumentForRetention = (
  doc: InvoiceAssistantDocument
): { changed: boolean; next: InvoiceAssistantDocument } => {
  let changed = false;
  let nextReview = doc.review;
  if (nextReview) {
    const reviewPatch: InvoiceReviewDraft = { ...nextReview };
    let reviewChanged = false;
    if (reviewPatch.abn) {
      reviewPatch.abn = null;
      reviewChanged = true;
    }
    if (reviewPatch.drive_url) {
      reviewPatch.drive_url = null;
      reviewChanged = true;
    }
    if (reviewChanged) {
      nextReview = reviewPatch;
      changed = true;
    }
  }

  let nextExtraction = doc.extraction;
  if (nextExtraction?.abn) {
    nextExtraction = {
      ...nextExtraction,
      abn: null,
    };
    changed = true;
  }

  if (doc.drive_url) {
    changed = true;
  }

  if (!changed) {
    return {
      changed: false,
      next: doc,
    };
  }

  return {
    changed: true,
    next: {
      ...doc,
      drive_url: null,
      review: nextReview,
      extraction: nextExtraction,
      updated_at: nowIso(),
    },
  };
};

const toBase64 = (value: ArrayBuffer | Uint8Array): string => {
  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoder is unavailable in current runtime');
  }
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const encryptSecurityAuditSnapshot = async (
  snapshot: SecurityAuditSnapshot,
  passphrase: string
): Promise<SecurityAuditEncryptedExport> => {
  const normalizedPassphrase = passphrase.trim();
  if (!normalizedPassphrase) {
    throw new Error('Passphrase is required for encrypted security export');
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'Web Crypto API is unavailable in current runtime for encrypted export'
    );
  }

  const cryptoApi = globalThis.crypto;
  const encoder = new TextEncoder();
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(normalizedPassphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const derivedKey = await cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: SECURITY_EXPORT_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt']
  );
  const ciphertext = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    derivedKey,
    encoder.encode(JSON.stringify(snapshot))
  );

  return {
    exported_at: nowIso(),
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: SECURITY_EXPORT_PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    cipher_text: toBase64(ciphertext),
  };
};

const isValidAbnChecksum = (abn: string): boolean => {
  if (!/^\d{11}$/.test(abn)) {
    return false;
  }
  const digits = abn.split('').map(item => Number(item));
  const firstDigit = digits[0];
  if (typeof firstDigit !== 'number') {
    return false;
  }
  digits[0] = firstDigit - 1;
  const weightedSum = digits.reduce((sum, digit, index) => {
    return sum + digit * (ABN_WEIGHT_FACTORS[index] || 0);
  }, 0);
  return weightedSum % 89 === 0;
};

const safeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeApprovalStatus = (value: unknown): InvoiceApprovalStatus =>
  value === 'approved' ? 'approved' : 'pending';

const normalizeReconciliationStatus = (
  value: unknown
): InvoiceReconciliationStatus =>
  value === 'reconciled' ? 'reconciled' : 'pending';

const normalizePersistedDocument = (
  doc: InvoiceAssistantDocument
): InvoiceAssistantDocument => {
  return {
    ...doc,
    approval_status: normalizeApprovalStatus(
      (doc as { approval_status?: unknown }).approval_status
    ),
    reconciliation_status: normalizeReconciliationStatus(
      (doc as { reconciliation_status?: unknown }).reconciliation_status
    ),
    reconciled_at: normalizeName(
      (doc as { reconciled_at?: string }).reconciled_at
    ),
    reconciled_by: normalizeName(
      (doc as { reconciled_by?: string }).reconciled_by
    ),
    reconciliation_note: normalizeName(
      (doc as { reconciliation_note?: string }).reconciliation_note
    ),
    bank_transaction_ref: normalizeName(
      (doc as { bank_transaction_ref?: string }).bank_transaction_ref
    ),
    approved_at: normalizeName((doc as { approved_at?: string }).approved_at),
    approved_by: normalizeName((doc as { approved_by?: string }).approved_by),
  };
};

const normalizePersistedState = (
  parsed: Partial<InvoiceAssistantState> | null | undefined
): InvoiceAssistantState => {
  const source = parsed || {};
  const parsedVersion =
    typeof source.version === 'number' && Number.isFinite(source.version)
      ? source.version
      : 1;
  return {
    version: Math.max(1, Math.floor(parsedVersion)),
    documents: Array.isArray(source.documents)
      ? source.documents.map(item =>
          normalizePersistedDocument(item as InvoiceAssistantDocument)
        )
      : [],
    suppliers:
      Array.isArray(source.suppliers) && source.suppliers.length > 0
        ? source.suppliers
        : DEFAULT_SUPPLIERS,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(source.settings || {}),
    },
  };
};

const readState = (): InvoiceAssistantState => {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw) as Partial<InvoiceAssistantState>;
    return normalizePersistedState(parsed);
  } catch (error) {
    console.error('Failed to read invoice assistant state:', error);
    return createDefaultState();
  }
};

const syncStateToStores = (
  state: InvoiceAssistantState,
  mirrorToIndexedDb: boolean
): void => {
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  if (!mirrorToIndexedDb) {
    return;
  }
  void saveInvoiceAssistantStateSnapshot(state).catch(error => {
    console.error('Failed to mirror assistant state to IndexedDB:', error);
  });
  void syncStateToRemoteSnapshot(state).catch(error => {
    console.error('Failed to mirror assistant state to remote store:', error);
  });
};

const writeState = (
  state: InvoiceAssistantState,
  options?: {
    preserveVersion?: boolean;
    mirrorToIndexedDb?: boolean;
  }
): InvoiceAssistantState => {
  const preserveVersion = options?.preserveVersion === true;
  const mirrorToIndexedDb = options?.mirrorToIndexedDb !== false;
  const nextState: InvoiceAssistantState = {
    ...state,
    version: preserveVersion ? Math.max(1, state.version) : state.version + 1,
  };
  syncStateToStores(nextState, mirrorToIndexedDb);
  return nextState;
};

const delay = async (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const fetchWithRetry = async (
  input: RequestInfo | URL,
  init: RequestInit,
  options: {
    label: string;
    timeoutMs?: number;
    retries?: number;
  }
): Promise<Response> => {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const retries = options.retries ?? REQUEST_RETRY_TIMES;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const shouldRetry =
          RETRYABLE_STATUS.has(response.status) && attempt < retries;
        if (shouldRetry) {
          await delay(250 * (attempt + 1));
          continue;
        }
        throw new Error(`${options.label} failed with HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < retries;
      if (shouldRetry) {
        await delay(250 * (attempt + 1));
        continue;
      }
      if (isAbortError(error)) {
        throw new Error(`${options.label} timed out after ${timeoutMs}ms`);
      }
      throw error instanceof Error
        ? error
        : new Error(`${options.label} request failed`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (isAbortError(lastError)) {
    throw new Error(`${options.label} timed out after ${REQUEST_TIMEOUT_MS}ms`);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`${options.label} request failed`);
};

const syncStateToRemoteSnapshot = async (
  state: InvoiceAssistantState
): Promise<void> => {
  const endpoint = state.settings.state_sync_endpoint;
  if (!endpoint) {
    return;
  }
  await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state,
      }),
    },
    { label: 'State sync write' }
  );
};

const runWithConcurrency = async <T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = MAX_BATCH_CONCURRENCY
): Promise<R[]> => {
  if (items.length === 0) {
    return [];
  }

  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const executeWorker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!, index);
    }
  };

  await Promise.all(
    Array.from({ length: safeConcurrency }, () => executeWorker())
  );
  return results;
};

interface DocumentPatch {
  documentId: string;
  baseUpdatedAt: string;
  next: InvoiceAssistantDocument;
}

const applyDocumentPatches = (
  patches: DocumentPatch[]
): {
  applied: number;
  conflicts: number;
  appliedDocumentIds: Set<string>;
  conflictedDocumentIds: Set<string>;
} => {
  if (patches.length === 0) {
    return {
      applied: 0,
      conflicts: 0,
      appliedDocumentIds: new Set<string>(),
      conflictedDocumentIds: new Set<string>(),
    };
  }

  const latestState = readState();
  const patchById = new Map<string, DocumentPatch>();
  for (const patch of patches) {
    patchById.set(patch.documentId, patch);
  }

  const unresolvedPatchIds = new Set<string>(patchById.keys());
  const appliedDocumentIds = new Set<string>();
  const conflictedDocumentIds = new Set<string>();
  let applied = 0;
  let conflicts = 0;
  const nextDocuments = latestState.documents.map(doc => {
    const patch = patchById.get(doc.document_id);
    if (!patch) {
      return doc;
    }
    unresolvedPatchIds.delete(doc.document_id);
    if (doc.updated_at !== patch.baseUpdatedAt) {
      conflicts += 1;
      conflictedDocumentIds.add(doc.document_id);
      return doc;
    }
    applied += 1;
    appliedDocumentIds.add(doc.document_id);
    return patch.next;
  });

  if (unresolvedPatchIds.size > 0) {
    conflicts += unresolvedPatchIds.size;
    unresolvedPatchIds.forEach(id => conflictedDocumentIds.add(id));
  }

  if (applied > 0) {
    writeState({
      ...latestState,
      documents: nextDocuments,
    });
  }

  return { applied, conflicts, appliedDocumentIds, conflictedDocumentIds };
};

const buildArchiveFileName = (fileName: string): string => {
  const parts = fileName.split('.');
  const rawExtension = parts.length > 1 ? parts[parts.length - 1] : '';
  const extension = rawExtension ? `.${rawExtension.toLowerCase()}` : '';
  const base = (parts[0] || 'invoice')
    .replace(/[^a-zA-Z0-9-_ ]/g, ' ')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  const stamp = new Date()
    .toISOString()
    .replace(/[:]/g, '-')
    .replace(/\..+/, '');
  return `${base || 'invoice'}_${stamp}${extension}`;
};

const estimateAmountFromFileName = (fileName: string): number | null => {
  const matches = fileName.match(/\d+(?:[.,]\d{2})/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  const normalized = matches
    .map(item => Number(item.replace(',', '.')))
    .filter(value => Number.isFinite(value));
  if (normalized.length === 0) {
    return null;
  }
  return normalized.sort((a, b) => b - a)[0] || null;
};

const parseDateFromFileName = (fileName: string): string | null => {
  const isoLike = fileName.match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);
  if (isoLike) {
    return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;
  }
  const compact = fileName.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }
  return null;
};

const findSupplierMatch = (
  rawMerchant: string | null,
  suppliers: SupplierDirectoryEntry[]
): SupplierDirectoryEntry | null => {
  if (!rawMerchant) {
    return null;
  }
  const normalized = normalizeAliasToken(rawMerchant);
  for (const supplier of suppliers) {
    const tokens = [supplier.name, ...supplier.aliases].map(
      normalizeAliasToken
    );
    if (tokens.some(token => token && normalized.includes(token))) {
      return supplier;
    }
  }
  return null;
};

const learnSuppliersFromReview = (
  review: InvoiceReviewDraft,
  suppliers: SupplierDirectoryEntry[],
  settings: InvoiceAssistantSettings
): SupplierDirectoryEntry[] => {
  if (!settings.auto_learn_supplier_rules) {
    return suppliers;
  }
  const supplierName = normalizeName(review.supplier_name);
  if (!supplierName) {
    return suppliers;
  }
  const supplierToken = normalizeAliasToken(supplierName);
  if (!supplierToken) {
    return suppliers;
  }

  const aliasCandidate = supplierName.toUpperCase();
  const foundIndex = suppliers.findIndex(item => {
    const tokens = [item.name, ...item.aliases]
      .map(normalizeAliasToken)
      .filter(Boolean);
    return tokens.some(
      token =>
        token === supplierToken ||
        token.includes(supplierToken) ||
        supplierToken.includes(token)
    );
  });

  if (foundIndex >= 0) {
    const existing = suppliers[foundIndex];
    if (!existing) {
      return suppliers;
    }
    const aliasSet = new Set<string>([
      ...existing.aliases.map(alias => alias.toUpperCase()),
      aliasCandidate,
    ]);
    const updated: SupplierDirectoryEntry = {
      ...existing,
      name: existing.name || supplierName,
      aliases: [...aliasSet],
      abn: review.abn || existing.abn,
      default_account_code:
        review.account_code || existing.default_account_code,
      default_tax_type: review.tax_type || existing.default_tax_type,
      default_currency:
        normalizeName(review.currency) ||
        existing.default_currency ||
        settings.default_currency,
      default_transaction_type:
        review.transaction_type || existing.default_transaction_type,
    };
    const nextSuppliers = [...suppliers];
    nextSuppliers[foundIndex] = updated;
    return nextSuppliers;
  }

  const created: SupplierDirectoryEntry = {
    id: randomId('supplier'),
    name: supplierName,
    aliases: [aliasCandidate],
    abn: review.abn || null,
    default_account_code: review.account_code || null,
    default_tax_type: review.tax_type || null,
    default_currency:
      normalizeName(review.currency) || settings.default_currency || null,
    default_transaction_type: review.transaction_type || null,
  };
  return [...suppliers, created];
};

const buildReviewDraft = (
  extraction: InvoiceExtractionResult,
  doc: InvoiceAssistantDocument,
  settings: InvoiceAssistantSettings,
  suppliers: SupplierDirectoryEntry[]
): InvoiceReviewDraft => {
  const supplierMatch = findSupplierMatch(extraction.supplier_name, suppliers);
  const supplierName = extraction.supplier_name || supplierMatch?.name || null;
  const currency =
    supplierMatch?.default_currency ||
    normalizeCurrency(extraction.currency || settings.default_currency);
  const taxTypeSeed = supplierMatch?.default_tax_type || null;

  return {
    invoice_date: extraction.invoice_date,
    due_date: extraction.due_date,
    supplier_name: supplierName,
    abn: extraction.abn || supplierMatch?.abn || null,
    invoice_number: extraction.invoice_number,
    currency,
    total: extraction.total,
    gst_amount: extraction.gst_amount,
    gst_status: extraction.gst_status,
    tax_invoice_flag: extraction.tax_invoice_flag,
    category: null,
    account_code: supplierMatch?.default_account_code || null,
    tax_type: bindTaxTypeByGstStatus(extraction.gst_status, taxTypeSeed),
    description: supplierName ? `${supplierName} expense` : 'Business expense',
    payment_method: null,
    transaction_type:
      supplierMatch?.default_transaction_type ||
      settings.default_transaction_type,
    line_items: extraction.line_items,
    drive_file_id: doc.drive_file_id,
    drive_url: doc.drive_url,
  };
};

const normalizeTaxTypeToken = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeName(value || '');
  return normalized ? normalized.toUpperCase() : null;
};

const bindTaxTypeByGstStatus = (
  gstStatus: InvoiceGstStatus,
  taxType: string | null
): string | null => {
  if (gstStatus === 'no_gst_indicated') {
    return 'NONE';
  }
  if (
    gstStatus === 'explicit_amount' ||
    gstStatus === 'included_unknown_amount'
  ) {
    return taxType || 'INPUT';
  }
  return taxType;
};

const requiredMissingForSync = (review: InvoiceReviewDraft): string[] => {
  const missing: string[] = [];
  if (!review.invoice_date) {
    missing.push('invoice_date');
  }
  if (!review.supplier_name) {
    missing.push('supplier_name');
  }
  if (review.total === null || review.total <= 0) {
    missing.push('total');
  }
  if (!review.currency) {
    missing.push('currency');
  }
  if (!review.drive_file_id && !review.drive_url) {
    missing.push('document_image');
  }
  return missing;
};

const complianceViolationsForSync = (review: InvoiceReviewDraft): string[] => {
  const violations: string[] = [];
  const normalizedAbn = normalizeAbnDigits(review.abn);
  const normalizedTaxType = normalizeTaxTypeToken(review.tax_type);

  if (review.transaction_type === 'BILL') {
    if (!review.due_date) {
      violations.push('BILL requires due_date');
    }
    if (!review.invoice_number) {
      violations.push('BILL requires invoice_number');
    }
  }

  if (review.tax_invoice_flag) {
    if (!review.abn) {
      violations.push('Tax invoice requires supplier ABN');
    }
    if (review.gst_status === 'unknown') {
      violations.push('Tax invoice requires explicit GST status');
    }
  }

  if (review.abn && !normalizedAbn) {
    violations.push('ABN must contain exactly 11 digits');
  }
  if (normalizedAbn && !isValidAbnChecksum(normalizedAbn)) {
    violations.push('ABN checksum is invalid');
  }

  if (review.gst_status === 'explicit_amount') {
    if (review.gst_amount === null || review.gst_amount < 0) {
      violations.push('Explicit GST requires non-negative gst_amount');
    }
    if (!normalizedTaxType) {
      violations.push('Explicit GST requires tax_type');
    }
  }

  if (review.gst_status === 'included_unknown_amount' && !normalizedTaxType) {
    violations.push('Included GST requires tax_type');
  }

  if (review.gst_status === 'no_gst_indicated') {
    if (review.gst_amount !== null && review.gst_amount !== 0) {
      violations.push('No GST indicated requires gst_amount to be 0 or null');
    }
    if (normalizedTaxType && normalizedTaxType !== 'NONE') {
      violations.push('No GST indicated requires tax_type NONE');
    }
  }

  if (review.gst_status === 'mixed' && review.line_items.length === 0) {
    violations.push('Mixed GST requires line_items breakdown');
  }

  return violations;
};

const inferHumanReview = (
  extraction: InvoiceExtractionResult,
  review: InvoiceReviewDraft
): { needsReview: boolean; reasons: string[] } => {
  const reasons = [...extraction.reasons];
  const missing = requiredMissingForSync(review);
  if (missing.length > 0) {
    reasons.push(`Missing required fields: ${missing.join(', ')}`);
  }
  const complianceViolations = complianceViolationsForSync(review);
  if (complianceViolations.length > 0) {
    reasons.push(
      `Compliance rules blocked sync: ${complianceViolations.join('; ')}`
    );
  }
  if (review.gst_status === 'unknown') {
    reasons.push(
      'GST status unknown, choose Included / No GST / Mixed before sync.'
    );
  }
  return {
    needsReview: extraction.needs_human_review || reasons.length > 0,
    reasons,
  };
};

const makeSyncPayload = (
  document: InvoiceAssistantDocument,
  review: InvoiceReviewDraft
): XeroSyncDraftPayload => {
  const lineItems =
    review.line_items.length > 0
      ? review.line_items.map(item => ({
          description: item.description || 'Receipt item',
          quantity: item.quantity || 1,
          unitAmount: item.unit_price || item.total || 0,
          accountCode: review.account_code,
          taxType: review.tax_type,
        }))
      : [
          {
            description: review.description || 'Receipt expense',
            quantity: 1,
            unitAmount: review.total || 0,
            accountCode: review.account_code,
            taxType: review.tax_type,
          },
        ];

  return {
    type: review.transaction_type,
    date: review.invoice_date || nowIso().slice(0, 10),
    due_date: review.due_date,
    contact: {
      name: review.supplier_name || 'Unknown supplier',
      abn: review.abn,
    },
    invoice_number: review.invoice_number,
    lineItems,
    total: review.total || 0,
    currency: normalizeCurrency(review.currency),
    gst_amount: review.gst_amount,
    category: review.category,
    payment_method: review.payment_method,
    drive_file_id: review.drive_file_id,
    drive_file_url: review.drive_url,
    document_id: document.document_id,
  };
};

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }
  return null;
};

const buildDuplicateSignature = (
  review: InvoiceReviewDraft | null
): string | null => {
  if (!review) {
    return null;
  }
  const supplier = normalizeAliasToken(review.supplier_name || '');
  const invoiceDate = normalizeName(review.invoice_date);
  const currency = normalizeCurrency(review.currency);
  const total =
    typeof review.total === 'number' &&
    Number.isFinite(review.total) &&
    review.total > 0
      ? (Math.round(review.total * 100) / 100).toFixed(2)
      : null;
  if (!supplier || !invoiceDate || !currency || !total) {
    return null;
  }
  const invoiceNumber =
    normalizeName(review.invoice_number || '')
      ?.toUpperCase()
      .replace(/\s+/g, '') || '';
  if (invoiceNumber) {
    return `inv:${supplier}|${invoiceNumber}|${invoiceDate}|${currency}|${total}`;
  }
  return `fallback:${supplier}|${invoiceDate}|${currency}|${total}`;
};

const toSortableTimestamp = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const compareDuplicatePriority = (
  left: InvoiceAssistantDocument,
  right: InvoiceAssistantDocument
): number => {
  const leftScore = left.status === 'synced' ? 0 : 1;
  const rightScore = right.status === 'synced' ? 0 : 1;
  if (leftScore !== rightScore) {
    return leftScore - rightScore;
  }
  const createdDiff =
    toSortableTimestamp(left.created_at) -
    toSortableTimestamp(right.created_at);
  if (createdDiff !== 0) {
    return createdDiff;
  }
  return left.document_id.localeCompare(right.document_id);
};

const findBlockingLocalDuplicate = (
  doc: InvoiceAssistantDocument,
  documents: InvoiceAssistantDocument[]
): InvoiceAssistantDocument | null => {
  const signature = buildDuplicateSignature(doc.review);
  if (!signature) {
    return null;
  }
  const duplicateGroup = documents.filter(item => {
    return buildDuplicateSignature(item.review) === signature;
  });
  if (duplicateGroup.length <= 1) {
    return null;
  }
  const keeper = [...duplicateGroup].sort(compareDuplicatePriority)[0];
  if (!keeper) {
    return null;
  }
  if (keeper.document_id === doc.document_id) {
    return null;
  }
  return keeper;
};

const buildLocalDuplicateSyncError = (
  duplicateDoc: InvoiceAssistantDocument
): string => {
  const suffix = duplicateDoc.xero_id
    ? `, xero_id=${duplicateDoc.xero_id}`
    : '';
  return `Duplicate precheck blocked: matches document ${duplicateDoc.document_id} (status=${duplicateDoc.status}${suffix}).`;
};

const buildRemoteDuplicateSyncError = (payload: {
  xero_id: string | null;
  reason: string | null;
}): string => {
  const details = [
    payload.reason,
    payload.xero_id ? `xero_id=${payload.xero_id}` : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join('; ');
  if (!details) {
    return 'Duplicate precheck blocked by Xero.';
  }
  return `Duplicate precheck blocked by Xero: ${details}.`;
};

const normalizeGstStatus = (value: unknown): InvoiceGstStatus => {
  const allowed: InvoiceGstStatus[] = [
    'explicit_amount',
    'included_unknown_amount',
    'no_gst_indicated',
    'unknown',
    'mixed',
  ];
  if (
    typeof value === 'string' &&
    allowed.includes(value as InvoiceGstStatus)
  ) {
    return value as InvoiceGstStatus;
  }
  return 'unknown';
};

const parseExtractionFromApiResponse = (
  payload: unknown,
  fallbackFileName: string
): InvoiceExtractionResult => {
  const source =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload;
  const data = (source && typeof source === 'object' ? source : {}) as Record<
    string,
    unknown
  >;

  const total = safeNumber(data.total);
  const supplierName = normalizeName(
    typeof data.supplier_name === 'string'
      ? data.supplier_name
      : typeof data.raw_merchant === 'string'
        ? data.raw_merchant
        : fallbackFileName
  );

  const reasonList = Array.isArray(data.reasons)
    ? data.reasons.filter(item => typeof item === 'string')
    : [];

  return {
    raw_merchant: normalizeName(data.raw_merchant as string | null | undefined),
    supplier_name: supplierName,
    abn: normalizeName(data.abn as string | null | undefined),
    tax_invoice_flag: Boolean(data.tax_invoice_flag),
    invoice_number: normalizeName(
      data.invoice_number as string | null | undefined
    ),
    invoice_date: normalizeName(data.invoice_date as string | null | undefined),
    due_date: normalizeName(data.due_date as string | null | undefined),
    currency: normalizeName(data.currency as string | null | undefined),
    total,
    gst_amount: safeNumber(data.gst_amount),
    gst_status: normalizeGstStatus(data.gst_status),
    line_items: Array.isArray(data.line_items)
      ? data.line_items
          .filter(item => item && typeof item === 'object')
          .map(item => {
            const row = item as Record<string, unknown>;
            return {
              description:
                (typeof row.description === 'string' && row.description) ||
                'Line item',
              quantity: safeNumber(row.quantity) || 1,
              unit_price: safeNumber(row.unit_price) || 0,
              total:
                safeNumber(row.total) ||
                (safeNumber(row.quantity) || 1) *
                  (safeNumber(row.unit_price) || 0),
            };
          })
      : [],
    confidence: {
      supplier_name:
        safeNumber(
          (data.confidence as Record<string, unknown> | undefined)
            ?.supplier_name
        ) || 0.6,
      invoice_date:
        safeNumber(
          (data.confidence as Record<string, unknown> | undefined)?.invoice_date
        ) || 0.5,
      total:
        safeNumber(
          (data.confidence as Record<string, unknown> | undefined)?.total
        ) || 0.5,
      gst:
        safeNumber(
          (data.confidence as Record<string, unknown> | undefined)?.gst
        ) || 0.4,
      abn:
        safeNumber(
          (data.confidence as Record<string, unknown> | undefined)?.abn
        ) || 0.2,
    },
    needs_human_review:
      typeof data.needs_human_review === 'boolean'
        ? data.needs_human_review
        : reasonList.length > 0,
    reasons: reasonList,
  };
};

const fallbackExtraction = (
  fileName: string,
  settings: InvoiceAssistantSettings,
  suppliers: SupplierDirectoryEntry[]
): InvoiceExtractionResult => {
  const raw = fileName.replace(/\.[^.]+$/, '');
  const supplierMatch = findSupplierMatch(raw, suppliers);
  const total = estimateAmountFromFileName(fileName);
  const invoiceDate = parseDateFromFileName(fileName) || nowIso().slice(0, 10);
  const reasons: string[] = [];

  if (!supplierMatch) {
    reasons.push('Supplier confidence is low, please verify merchant name.');
  }
  if (total === null) {
    reasons.push('Total amount missing, please fill manually.');
  }

  return {
    raw_merchant: raw,
    supplier_name: supplierMatch?.name || normalizeName(raw),
    abn: supplierMatch?.abn || null,
    tax_invoice_flag: false,
    invoice_number: null,
    invoice_date: invoiceDate,
    due_date: null,
    currency: settings.default_currency,
    total,
    gst_amount: null,
    gst_status: 'unknown',
    line_items: [],
    confidence: {
      supplier_name: supplierMatch ? 0.85 : 0.45,
      invoice_date: 0.7,
      total: total === null ? 0.2 : 0.55,
      gst: 0.1,
      abn: 0.1,
    },
    needs_human_review: true,
    reasons,
  };
};

const summarizeBatch = (
  total: number,
  succeeded: number,
  failed: number,
  conflicted = 0
): BatchActionSummary => ({
  total,
  succeeded,
  failed,
  conflicted,
  skipped: Math.max(total - succeeded - failed - conflicted, 0),
});

const shouldRestoreState = (
  candidate: InvoiceAssistantState,
  baseline: InvoiceAssistantState
): boolean =>
  candidate.version > baseline.version ||
  (baseline.documents.length === 0 && candidate.documents.length > 0);

type OrchestrationAction = 'recognize' | 'sync';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

const unwrapOrchestrationPayload = (
  payload: unknown
): Record<string, unknown> => {
  const root = asRecord(payload) || {};
  const data = asRecord(root.data);
  return data || root;
};

const extractOrchestrationSummary = (
  payload: Record<string, unknown>
): Record<string, unknown> | null => {
  const directSummary = asRecord(payload.summary);
  if (directSummary) {
    return directSummary;
  }
  const result = asRecord(payload.result);
  if (!result) {
    return null;
  }
  return asRecord(result.summary);
};

const extractOrchestrationState = (
  payload: Record<string, unknown>
): Partial<InvoiceAssistantState> | null => {
  const directState = asRecord(payload.state);
  if (directState) {
    return directState as Partial<InvoiceAssistantState>;
  }
  const result = asRecord(payload.result);
  if (!result) {
    return null;
  }
  const nestedState = asRecord(result.state);
  return nestedState ? (nestedState as Partial<InvoiceAssistantState>) : null;
};

const extractOrchestrationStatus = (
  payload: Record<string, unknown>
): string | null => {
  const directStatus = normalizeName(
    payload.status as string | null | undefined
  );
  if (directStatus) {
    return directStatus.toLowerCase();
  }
  const job = asRecord(payload.job);
  const jobStatus = normalizeName(job?.status as string | null | undefined);
  if (jobStatus) {
    return jobStatus.toLowerCase();
  }
  return null;
};

const extractOrchestrationJobId = (
  payload: Record<string, unknown>
): string | null => {
  const directJobId =
    normalizeName(payload.job_id as string | null | undefined) ||
    normalizeName(payload.id as string | null | undefined);
  if (directJobId) {
    return directJobId;
  }
  const job = asRecord(payload.job);
  return (
    normalizeName(job?.job_id as string | null | undefined) ||
    normalizeName(job?.id as string | null | undefined)
  );
};

const isTerminalOrchestrationStatus = (status: string | null): boolean =>
  Boolean(
    status &&
      [
        'completed',
        'complete',
        'succeeded',
        'success',
        'failed',
        'error',
        'done',
        'cancelled',
      ].includes(status)
  );

const joinUrlPath = (base: string, segment: string): string =>
  `${base.replace(/\/+$/, '')}/${segment.replace(/^\/+/, '')}`;

const parseSummaryCounts = (
  payload: Record<string, unknown>,
  total: number
): BatchActionSummary | null => {
  const summary = extractOrchestrationSummary(payload);
  if (!summary) {
    return null;
  }
  const succeeded = Math.max(0, Math.floor(safeNumber(summary.succeeded) || 0));
  const failed = Math.max(0, Math.floor(safeNumber(summary.failed) || 0));
  const conflicted = Math.max(
    0,
    Math.floor(safeNumber(summary.conflicted) || 0)
  );
  return summarizeBatch(total, succeeded, failed, conflicted);
};

const deriveRecognizeSummaryFromState = (
  documentIds: string[],
  state: InvoiceAssistantState
): BatchActionSummary => {
  const idSet = new Set(documentIds);
  let succeeded = 0;
  let failed = 0;
  for (const doc of state.documents) {
    if (!idSet.has(doc.document_id)) {
      continue;
    }
    if (doc.status === 'recognize_failed') {
      failed += 1;
      continue;
    }
    if (doc.status === 'recognized' || doc.status === 'ready_to_sync') {
      succeeded += 1;
    }
  }
  return summarizeBatch(documentIds.length, succeeded, failed, 0);
};

const deriveSyncSummaryFromState = (
  documentIds: string[],
  state: InvoiceAssistantState
): SyncBatchSummary => {
  const idSet = new Set(documentIds);
  let succeeded = 0;
  let failed = 0;
  const syncedDocumentIds: string[] = [];
  for (const doc of state.documents) {
    if (!idSet.has(doc.document_id)) {
      continue;
    }
    if (doc.status === 'sync_failed') {
      failed += 1;
      continue;
    }
    if (doc.status === 'synced') {
      succeeded += 1;
      syncedDocumentIds.push(doc.document_id);
    }
  }
  return {
    ...summarizeBatch(documentIds.length, succeeded, failed, 0),
    synced_document_ids: syncedDocumentIds,
  };
};

const isRetryableSyncFailure = (errorMessage: string | null): boolean => {
  if (!errorMessage) {
    return true;
  }
  const normalized = errorMessage.toLowerCase();
  return !NON_RETRYABLE_SYNC_HINTS.some(hint => normalized.includes(hint));
};

const isRetryableRecognizeFailure = (errorMessage: string | null): boolean => {
  if (!errorMessage) {
    return true;
  }
  const normalized = errorMessage.toLowerCase();
  return !NON_RETRYABLE_RECOGNIZE_HINTS.some(hint => normalized.includes(hint));
};

class InvoiceIngestionAssistantService {
  async hydrateStateFromStorage(): Promise<InvoiceAssistantState> {
    const localState = readState();
    let workingState = localState;

    const remoteEndpoint = normalizeName(
      localState.settings.state_sync_endpoint
    );
    if (remoteEndpoint) {
      try {
        const remoteState = await this.fetchRemoteStateSnapshot(remoteEndpoint);
        if (remoteState && shouldRestoreState(remoteState, workingState)) {
          writeState(remoteState, {
            preserveVersion: true,
            mirrorToIndexedDb: false,
          });
          workingState = remoteState;
        }
      } catch (error) {
        console.error(
          'Failed to hydrate assistant state from remote store:',
          error
        );
      }
    }

    try {
      const snapshot = await getInvoiceAssistantStateSnapshot();
      if (!snapshot) {
        void saveInvoiceAssistantStateSnapshot(workingState).catch(error => {
          console.error('Failed to refresh state snapshot:', error);
        });
        return workingState;
      }

      const restoredState = normalizePersistedState(
        snapshot as Partial<InvoiceAssistantState>
      );
      if (shouldRestoreState(restoredState, workingState)) {
        writeState(restoredState, {
          preserveVersion: true,
          mirrorToIndexedDb: false,
        });
        return restoredState;
      }

      void saveInvoiceAssistantStateSnapshot(workingState).catch(error => {
        console.error('Failed to refresh state snapshot:', error);
      });
      return workingState;
    } catch (error) {
      console.error('Failed to hydrate assistant state from IndexedDB:', error);
      return workingState;
    }
  }

  private async fetchRemoteStateSnapshot(
    endpoint: string
  ): Promise<InvoiceAssistantState | null> {
    const response = await fetchWithRetry(
      endpoint,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
      { label: 'State sync read' }
    );
    const payload = (await response.json()) as unknown;
    const source =
      payload && typeof payload === 'object' && 'state' in payload
        ? (payload as { state: unknown }).state
        : payload;
    if (!source || typeof source !== 'object') {
      return null;
    }
    return normalizePersistedState(source as Partial<InvoiceAssistantState>);
  }

  private async runOrchestrationBatch(
    action: OrchestrationAction,
    documentIds: string[]
  ): Promise<{
    payload: Record<string, unknown>;
    restoredState: InvoiceAssistantState | null;
  } | null> {
    const settings = readState().settings;
    const endpoint = normalizeName(settings.orchestration_endpoint);
    if (!endpoint) {
      return null;
    }

    try {
      const startResponse = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            document_ids: documentIds,
          }),
        },
        { label: `Orchestration ${action} start` }
      );
      const startPayload = unwrapOrchestrationPayload(
        (await startResponse.json()) as unknown
      );
      const jobId = extractOrchestrationJobId(startPayload);
      let finalPayload = startPayload;

      if (
        jobId &&
        !isTerminalOrchestrationStatus(extractOrchestrationStatus(startPayload))
      ) {
        finalPayload = await this.pollOrchestrationBatch(
          endpoint,
          action,
          jobId
        );
      }

      const stateCandidate = extractOrchestrationState(finalPayload);
      if (!stateCandidate) {
        return {
          payload: finalPayload,
          restoredState: null,
        };
      }

      const restoredState = normalizePersistedState(stateCandidate);
      writeState(restoredState, {
        preserveVersion: true,
      });
      return {
        payload: finalPayload,
        restoredState,
      };
    } catch (error) {
      console.error(
        `Orchestration ${action} failed, fallback to local flow:`,
        error
      );
      return null;
    }
  }

  private async pollOrchestrationBatch(
    endpoint: string,
    action: OrchestrationAction,
    jobId: string
  ): Promise<Record<string, unknown>> {
    for (
      let attempt = 0;
      attempt < ORCHESTRATION_MAX_POLL_ATTEMPTS;
      attempt += 1
    ) {
      const response = await fetchWithRetry(
        joinUrlPath(endpoint, encodeURIComponent(jobId)),
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
        { label: `Orchestration ${action} poll` }
      );
      const payload = unwrapOrchestrationPayload(
        (await response.json()) as unknown
      );
      const status = extractOrchestrationStatus(payload);
      const hasState = Boolean(extractOrchestrationState(payload));
      const hasSummary = Boolean(extractOrchestrationSummary(payload));
      if (
        isTerminalOrchestrationStatus(status) ||
        (!status && (hasState || hasSummary))
      ) {
        return payload;
      }
      await delay(ORCHESTRATION_POLL_INTERVAL_MS);
    }
    throw new Error(
      `Orchestration ${action} timed out after ${ORCHESTRATION_MAX_POLL_ATTEMPTS} polling attempts`
    );
  }

  private async tryOrchestratedRecognize(
    documentIds: string[]
  ): Promise<BatchActionSummary | null> {
    const orchestrated = await this.runOrchestrationBatch(
      'recognize',
      documentIds
    );
    if (!orchestrated) {
      return null;
    }

    const explicitSummary = parseSummaryCounts(
      orchestrated.payload,
      documentIds.length
    );
    if (explicitSummary) {
      return explicitSummary;
    }

    const nextState = orchestrated.restoredState || readState();
    return deriveRecognizeSummaryFromState(documentIds, nextState);
  }

  private async tryOrchestratedSync(
    documentIds: string[]
  ): Promise<SyncBatchSummary | null> {
    const orchestrated = await this.runOrchestrationBatch('sync', documentIds);
    if (!orchestrated) {
      return null;
    }

    const explicitSummary = parseSummaryCounts(
      orchestrated.payload,
      documentIds.length
    );
    if (explicitSummary) {
      const summary = extractOrchestrationSummary(orchestrated.payload) || {};
      return {
        ...explicitSummary,
        synced_document_ids: asStringArray(summary.synced_document_ids),
      };
    }

    const nextState = orchestrated.restoredState || readState();
    return deriveSyncSummaryFromState(documentIds, nextState);
  }

  resetTransientRuntimeState(): void {
    abnValidationCache.clear();
    abnValidationInFlight.clear();
    abnValidationLastRequestAt = 0;
  }

  getState(): InvoiceAssistantState {
    return readState();
  }

  getReconciliationSuggestions(
    documentIds?: string[]
  ): ReconciliationSuggestion[] {
    const state = readState();
    const idSet =
      Array.isArray(documentIds) && documentIds.length > 0
        ? new Set(documentIds)
        : null;

    return state.documents
      .filter(doc => {
        if (
          doc.status !== 'synced' ||
          !doc.review ||
          doc.reconciliation_status === 'reconciled'
        ) {
          return false;
        }
        if (idSet && !idSet.has(doc.document_id)) {
          return false;
        }
        return typeof doc.review.total === 'number' && doc.review.total > 0;
      })
      .map(doc => {
        const review = doc.review as InvoiceReviewDraft;
        const supplier =
          normalizeName(review.supplier_name) || 'Unknown supplier';
        const currency = normalizeCurrency(review.currency);
        const amount = Math.round((review.total || 0) * 100) / 100;
        const hasDate = Boolean(review.invoice_date);
        const matchedBy = hasDate ? 'amount_date_supplier' : 'amount_supplier';
        let confidence = 0.55;
        if (hasDate) {
          confidence += 0.15;
        }
        if (supplier !== 'Unknown supplier') {
          confidence += 0.1;
        }
        if (review.payment_method) {
          confidence += 0.05;
        }
        if (review.gst_status === 'explicit_amount') {
          confidence += 0.05;
        }
        const normalizedConfidence = Math.max(0.4, Math.min(0.95, confidence));
        const suggestion = hasDate
          ? `Match bank transaction around ${review.invoice_date} for ${currency} ${amount.toFixed(
              2
            )} (${supplier}).`
          : `Match bank transaction by amount ${currency} ${amount.toFixed(
              2
            )} and supplier ${supplier}.`;

        return {
          document_id: doc.document_id,
          supplier_name: supplier,
          invoice_date: review.invoice_date,
          currency,
          amount,
          confidence: normalizedConfidence,
          suggestion,
          matched_by: matchedBy,
        } as ReconciliationSuggestion;
      })
      .sort((left, right) => right.confidence - left.confidence);
  }

  getSecurityAuditSnapshot(documentIds?: string[]): SecurityAuditSnapshot {
    const state = readState();
    const idSet =
      Array.isArray(documentIds) && documentIds.length > 0
        ? new Set(documentIds)
        : null;
    const retentionDays = resolveBlobRetentionDays(state.settings);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let redactedDocuments = 0;

    const documents = state.documents
      .filter(doc => (idSet ? idSet.has(doc.document_id) : true))
      .map(doc => {
        const review = doc.review;
        const hasDriveUrl = Boolean(doc.drive_url || review?.drive_url);
        const abnMasked = maskAbnForAudit(review?.abn || doc.extraction?.abn);
        const isRetentionExpired = isPastRetentionCutoff(doc, cutoff);
        if (hasDriveUrl || Boolean(abnMasked)) {
          redactedDocuments += 1;
        }

        const syncError = redactTokenLikeSegments(doc.sync_error);
        return {
          document_id: doc.document_id,
          status: doc.status,
          approval_status: doc.approval_status,
          reconciliation_status: doc.reconciliation_status,
          reconciled_at: doc.reconciled_at,
          reconciled_by: doc.reconciled_by,
          synced_at: doc.synced_at,
          xero_id: doc.xero_id,
          supplier_name:
            normalizeName(review?.supplier_name) ||
            normalizeName(doc.extraction?.supplier_name),
          invoice_date:
            review?.invoice_date || doc.extraction?.invoice_date || null,
          total:
            typeof review?.total === 'number'
              ? review.total
              : (doc.extraction?.total ?? null),
          currency: normalizeName(
            review?.currency || doc.extraction?.currency || null
          ),
          abn_masked: abnMasked,
          drive_url_redacted: hasDriveUrl,
          sync_error:
            syncError && isRetentionExpired
              ? `${syncError} | retention-window-expired`
              : syncError,
          recognize_error: redactTokenLikeSegments(doc.recognize_error),
        };
      });

    return {
      exported_at: nowIso(),
      retention_days: retentionDays,
      documents_total: documents.length,
      synced_total: documents.filter(item => item.status === 'synced').length,
      redacted_documents: redactedDocuments,
      settings: {
        dry_run_mode: state.settings.dry_run_mode,
        require_batch_approval: state.settings.require_batch_approval,
        auto_learn_supplier_rules: state.settings.auto_learn_supplier_rules,
        blob_retention_days: state.settings.blob_retention_days,
      },
      documents,
    };
  }

  async exportEncryptedSecurityAuditSnapshot(
    passphrase: string,
    documentIds?: string[]
  ): Promise<SecurityAuditEncryptedExport> {
    const snapshot = this.getSecurityAuditSnapshot(documentIds);
    return encryptSecurityAuditSnapshot(snapshot, passphrase);
  }

  async runSecurityHardeningSweep(): Promise<{
    stale_documents: number;
    blobs_removed: number;
    redacted_documents: number;
  }> {
    return this.cleanupSyncedSourceBlobs();
  }

  deleteDocument(documentId: string): void {
    const state = readState();
    writeState({
      ...state,
      documents: state.documents.filter(
        item => item.document_id !== documentId
      ),
    });
  }

  saveSettings(
    settingsPatch: Partial<InvoiceAssistantSettings>
  ): InvoiceAssistantSettings {
    const state = readState();
    const retentionDays =
      typeof settingsPatch.blob_retention_days === 'number' &&
      Number.isFinite(settingsPatch.blob_retention_days)
        ? Math.max(
            1,
            Math.min(365, Math.floor(settingsPatch.blob_retention_days))
          )
        : state.settings.blob_retention_days;
    const nextSettings: InvoiceAssistantSettings = {
      ...state.settings,
      ...settingsPatch,
      blob_retention_days: retentionDays,
    };
    const nextState: InvoiceAssistantState = {
      ...state,
      settings: nextSettings,
    };
    writeState(nextState);
    return nextSettings;
  }

  upsertSupplier(
    payload: Omit<SupplierDirectoryEntry, 'id'> & { id?: string }
  ): SupplierDirectoryEntry {
    const state = readState();
    const supplier: SupplierDirectoryEntry = {
      id: payload.id || randomId('supplier'),
      name: payload.name,
      aliases: payload.aliases,
      abn: payload.abn,
      default_account_code: payload.default_account_code,
      default_tax_type: payload.default_tax_type,
      default_currency: payload.default_currency,
      default_transaction_type: payload.default_transaction_type,
    };
    const existingIdx = state.suppliers.findIndex(
      item => item.id === supplier.id
    );
    const nextSuppliers = [...state.suppliers];
    if (existingIdx >= 0) {
      nextSuppliers[existingIdx] = supplier;
    } else {
      nextSuppliers.push(supplier);
    }
    writeState({
      ...state,
      suppliers: nextSuppliers,
    });
    return supplier;
  }

  removeSupplier(supplierId: string): void {
    const state = readState();
    writeState({
      ...state,
      suppliers: state.suppliers.filter(item => item.id !== supplierId),
    });
  }

  async uploadAndArchive(files: File[]): Promise<UploadBatchSummary> {
    const state = readState();
    const now = new Date();
    const dateFolder = toDateFolder(now);
    const uploadedDocs: InvoiceAssistantDocument[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const file of files) {
      const documentId = randomId('doc');
      const archiveFileName = buildArchiveFileName(file.name);
      const baseDoc: InvoiceAssistantDocument = {
        document_id: documentId,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        created_at: nowIso(),
        archive_date_folder: dateFolder,
        archive_file_name: archiveFileName,
        drive_file_id: null,
        drive_url: null,
        status: 'uploaded',
        extraction: null,
        review: null,
        needs_human_review: true,
        reasons: [],
        recognize_error: null,
        sync_error: null,
        archive_error: null,
        synced_at: null,
        xero_id: null,
        xero_type: null,
        sync_idempotency_key: null,
        reconciliation_status: 'pending',
        reconciled_at: null,
        reconciled_by: null,
        reconciliation_note: null,
        bank_transaction_ref: null,
        approval_status: 'pending',
        approved_at: null,
        approved_by: null,
        updated_at: nowIso(),
      };

      try {
        await saveInvoiceSourceBlob(documentId, file, file.name, file.type);
        const archiveResult = await this.archiveDocumentToDrive(
          baseDoc,
          file,
          state.settings
        );
        uploadedDocs.push({
          ...baseDoc,
          drive_file_id: archiveResult.drive_file_id,
          drive_url: archiveResult.drive_url,
          archive_error: archiveResult.error,
          updated_at: nowIso(),
        });
        succeeded += 1;
      } catch (error) {
        failed += 1;
        uploadedDocs.push({
          ...baseDoc,
          archive_error:
            error instanceof Error
              ? error.message
              : 'Failed to save original image to local vault',
          updated_at: nowIso(),
        });
      }
    }

    const latestState = readState();
    writeState({
      ...latestState,
      documents: [...uploadedDocs, ...latestState.documents],
    });

    return {
      ...summarizeBatch(files.length, succeeded, failed),
      document_ids: uploadedDocs.map(item => item.document_id),
    };
  }

  private async archiveDocumentToDrive(
    document: InvoiceAssistantDocument,
    file: File,
    settings: InvoiceAssistantSettings
  ): Promise<{
    drive_file_id: string | null;
    drive_url: string | null;
    error: string | null;
  }> {
    const dateFolder = document.archive_date_folder;
    const virtualPath = `${settings.drive_root_folder}/${dateFolder}/${document.archive_file_name}`;

    if (!settings.drive_archive_endpoint) {
      return {
        drive_file_id: `local_drive_${document.document_id}`,
        drive_url: `local://google-drive/${virtualPath}`,
        error: null,
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_id', document.document_id);
      formData.append('root_folder', settings.drive_root_folder);
      formData.append('date_folder', dateFolder);
      formData.append('archive_file_name', document.archive_file_name);

      const response = await fetchWithRetry(
        settings.drive_archive_endpoint,
        {
          method: 'POST',
          body: formData,
        },
        { label: 'Drive archive' }
      );

      const payload = (await response.json()) as Record<string, unknown>;
      const driveFileId =
        normalizeName(payload.drive_file_id as string | null | undefined) ||
        normalizeName(payload.file_id as string | null | undefined);
      const driveUrl =
        normalizeName(payload.drive_url as string | null | undefined) ||
        normalizeName(payload.url as string | null | undefined);

      return {
        drive_file_id: driveFileId,
        drive_url: driveUrl,
        error: null,
      };
    } catch (error) {
      return {
        drive_file_id: null,
        drive_url: null,
        error: error instanceof Error ? error.message : 'Drive archive failed',
      };
    }
  }

  async batchRecognize(documentIds: string[]): Promise<BatchActionSummary> {
    const orchestratedSummary =
      await this.tryOrchestratedRecognize(documentIds);
    if (orchestratedSummary) {
      return orchestratedSummary;
    }

    const state = readState();
    const idSet = new Set(documentIds);
    const targetDocs = state.documents.filter(doc =>
      idSet.has(doc.document_id)
    );
    let succeeded = 0;
    let failed = 0;
    let conflicted = 0;

    const taskResults = await runWithConcurrency(
      targetDocs,
      async doc => {
        if (doc.status === 'synced') {
          return {
            outcome: 'skipped' as const,
            patch: null as DocumentPatch | null,
          };
        }

        try {
          const blobRecord = await getInvoiceSourceBlob(doc.document_id);
          if (!blobRecord) {
            throw new Error('Original image is missing from local vault');
          }

          const extraction = await this.recognizeDocument(
            doc,
            blobRecord.blob,
            blobRecord.file_name,
            state
          );
          const review = buildReviewDraft(
            extraction,
            doc,
            state.settings,
            state.suppliers
          );
          const reviewGate = inferHumanReview(extraction, review);
          const nextDoc: InvoiceAssistantDocument = {
            ...doc,
            extraction,
            review,
            status: reviewGate.needsReview ? 'recognized' : 'ready_to_sync',
            needs_human_review: reviewGate.needsReview,
            reasons: reviewGate.reasons,
            recognize_error: null,
            updated_at: nowIso(),
          };
          return {
            outcome: 'success' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: nextDoc,
            },
          };
        } catch (error) {
          const nextDoc: InvoiceAssistantDocument = {
            ...doc,
            status: 'recognize_failed',
            recognize_error:
              error instanceof Error ? error.message : 'Recognition failed',
            updated_at: nowIso(),
          };
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: nextDoc,
            },
          };
        }
      },
      MAX_BATCH_CONCURRENCY
    );

    const patchResult = applyDocumentPatches(
      taskResults
        .map(result => result.patch)
        .filter((patch): patch is DocumentPatch => Boolean(patch))
    );
    conflicted += patchResult.conflicts;

    for (const result of taskResults) {
      if (!result.patch) {
        continue;
      }
      if (!patchResult.appliedDocumentIds.has(result.patch.documentId)) {
        continue;
      }
      if (result.outcome === 'success') {
        succeeded += 1;
      } else if (result.outcome === 'failed') {
        failed += 1;
      }
    }

    return summarizeBatch(documentIds.length, succeeded, failed, conflicted);
  }

  private async recognizeDocument(
    document: InvoiceAssistantDocument,
    blob: Blob,
    fileName: string,
    state: InvoiceAssistantState
  ): Promise<InvoiceExtractionResult> {
    const endpoint = state.settings.ocr_extract_endpoint;
    if (!endpoint) {
      return fallbackExtraction(fileName, state.settings, state.suppliers);
    }

    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('document_id', document.document_id);
    formData.append('drive_url', document.drive_url || '');
    formData.append('currency', state.settings.default_currency);

    const response = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        body: formData,
      },
      { label: 'OCR extract' }
    );
    const payload = await response.json();
    return parseExtractionFromApiResponse(payload, fileName);
  }

  updateReview(
    documentId: string,
    patch: Partial<InvoiceReviewDraft>
  ): InvoiceAssistantDocument | null {
    const state = readState();
    const doc = state.documents.find(item => item.document_id === documentId);
    if (!doc || !doc.review) {
      return null;
    }

    const nextReview: InvoiceReviewDraft = {
      ...doc.review,
      ...patch,
      currency: normalizeCurrency(
        (patch.currency || doc.review.currency) as string
      ),
      tax_type: bindTaxTypeByGstStatus(
        (patch.gst_status || doc.review.gst_status) as InvoiceGstStatus,
        (patch.tax_type || doc.review.tax_type) as string | null
      ),
    };
    const reviewGate = inferHumanReview(
      doc.extraction ||
        fallbackExtraction(doc.file_name, state.settings, state.suppliers),
      nextReview
    );

    const nextDoc: InvoiceAssistantDocument = {
      ...doc,
      review: nextReview,
      needs_human_review: reviewGate.needsReview,
      reasons: reviewGate.reasons,
      status:
        doc.status === 'synced'
          ? 'synced'
          : reviewGate.needsReview
            ? 'recognized'
            : 'ready_to_sync',
      reconciliation_status:
        doc.status === 'synced' ? 'pending' : doc.reconciliation_status,
      reconciled_at: doc.status === 'synced' ? null : doc.reconciled_at,
      reconciled_by: doc.status === 'synced' ? null : doc.reconciled_by,
      reconciliation_note:
        doc.status === 'synced' ? null : doc.reconciliation_note,
      bank_transaction_ref:
        doc.status === 'synced' ? null : doc.bank_transaction_ref,
      updated_at: nowIso(),
    };
    const nextSuppliers = learnSuppliersFromReview(
      nextReview,
      state.suppliers,
      state.settings
    );

    writeState({
      ...state,
      suppliers: nextSuppliers,
      documents: state.documents.map(item =>
        item.document_id === documentId ? nextDoc : item
      ),
    });
    return nextDoc;
  }

  batchSetApproval(
    documentIds: string[],
    approvalStatus: InvoiceApprovalStatus,
    approvedBy = 'manual'
  ): BatchActionSummary {
    const state = readState();
    const idSet = new Set(documentIds);
    let succeeded = 0;
    let failed = 0;
    let conflicted = 0;
    const patches: DocumentPatch[] = [];

    for (const doc of state.documents) {
      if (!idSet.has(doc.document_id)) {
        continue;
      }
      const nextDoc: InvoiceAssistantDocument = {
        ...doc,
        approval_status: approvalStatus,
        approved_at: approvalStatus === 'approved' ? nowIso() : null,
        approved_by: approvalStatus === 'approved' ? approvedBy : null,
        updated_at: nowIso(),
      };
      patches.push({
        documentId: doc.document_id,
        baseUpdatedAt: doc.updated_at,
        next: nextDoc,
      });
    }

    const patchResult = applyDocumentPatches(patches);
    conflicted += patchResult.conflicts;
    for (const patch of patches) {
      if (patchResult.appliedDocumentIds.has(patch.documentId)) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    return summarizeBatch(documentIds.length, succeeded, failed, conflicted);
  }

  batchSetReconciliation(
    documentIds: string[],
    reconciliationStatus: InvoiceReconciliationStatus,
    reconciledBy = 'manual',
    note?: string | null,
    bankTransactionRef?: string | null
  ): BatchActionSummary {
    const state = readState();
    const idSet = new Set(documentIds);
    const normalizedNote = normalizeName(note || null);
    const normalizedRef = normalizeName(bankTransactionRef || null);
    let succeeded = 0;
    let failed = 0;
    let conflicted = 0;
    const patches: DocumentPatch[] = [];

    for (const doc of state.documents) {
      if (!idSet.has(doc.document_id)) {
        continue;
      }
      if (doc.status !== 'synced') {
        failed += 1;
        continue;
      }

      const nextDoc: InvoiceAssistantDocument = {
        ...doc,
        reconciliation_status: reconciliationStatus,
        reconciled_at: reconciliationStatus === 'reconciled' ? nowIso() : null,
        reconciled_by:
          reconciliationStatus === 'reconciled' ? reconciledBy : null,
        reconciliation_note:
          reconciliationStatus === 'reconciled' ? normalizedNote : null,
        bank_transaction_ref:
          reconciliationStatus === 'reconciled' ? normalizedRef : null,
        updated_at: nowIso(),
      };
      patches.push({
        documentId: doc.document_id,
        baseUpdatedAt: doc.updated_at,
        next: nextDoc,
      });
    }

    const patchResult = applyDocumentPatches(patches);
    conflicted += patchResult.conflicts;
    for (const patch of patches) {
      if (patchResult.appliedDocumentIds.has(patch.documentId)) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    return summarizeBatch(documentIds.length, succeeded, failed, conflicted);
  }

  async runFailurePlaybook(documentIds: string[]): Promise<BatchActionSummary> {
    const state = readState();
    const idSet = new Set(documentIds);
    const recognizeRetryIds: string[] = [];
    const syncRetryIds: string[] = [];
    const guidancePatches: DocumentPatch[] = [];
    let succeeded = 0;
    let failed = 0;
    let conflicted = 0;

    for (const doc of state.documents) {
      if (!idSet.has(doc.document_id)) {
        continue;
      }

      if (doc.status === 'recognize_failed') {
        if (isRetryableRecognizeFailure(doc.recognize_error)) {
          recognizeRetryIds.push(doc.document_id);
        } else {
          guidancePatches.push({
            documentId: doc.document_id,
            baseUpdatedAt: doc.updated_at,
            next: {
              ...doc,
              recognize_error: `${
                doc.recognize_error || 'Recognition failed'
              } | Playbook: recover local source file before retry.`,
              updated_at: nowIso(),
            },
          });
        }
        continue;
      }

      if (doc.status === 'sync_failed') {
        if (isRetryableSyncFailure(doc.sync_error)) {
          syncRetryIds.push(doc.document_id);
        } else {
          guidancePatches.push({
            documentId: doc.document_id,
            baseUpdatedAt: doc.updated_at,
            next: {
              ...doc,
              sync_error: `${
                doc.sync_error || 'Sync failed'
              } | Playbook: manual correction required before retry.`,
              updated_at: nowIso(),
            },
          });
        }
      }
    }

    const guidanceResult = applyDocumentPatches(guidancePatches);
    conflicted += guidanceResult.conflicts;
    for (const patch of guidancePatches) {
      if (guidanceResult.appliedDocumentIds.has(patch.documentId)) {
        failed += 1;
      }
    }

    if (recognizeRetryIds.length > 0) {
      const recognizeSummary = await this.batchRecognize(recognizeRetryIds);
      succeeded += recognizeSummary.succeeded;
      failed += recognizeSummary.failed;
      conflicted += recognizeSummary.conflicted;
    }

    if (syncRetryIds.length > 0) {
      const syncSummary = await this.batchSyncToXero(syncRetryIds);
      succeeded += syncSummary.succeeded;
      failed += syncSummary.failed;
      conflicted += syncSummary.conflicted;
    }

    return summarizeBatch(documentIds.length, succeeded, failed, conflicted);
  }

  markReadyToSync(documentIds: string[]): BatchActionSummary {
    const state = readState();
    const idSet = new Set(documentIds);
    let succeeded = 0;
    let failed = 0;
    let conflicted = 0;
    const patches: Array<{
      outcome: 'success' | 'failed';
      patch: DocumentPatch;
    }> = [];

    for (const doc of state.documents) {
      if (!idSet.has(doc.document_id)) {
        continue;
      }
      if (!doc.review) {
        failed += 1;
        continue;
      }
      const missing = requiredMissingForSync(doc.review);
      const complianceViolations = complianceViolationsForSync(doc.review);
      if (missing.length > 0 || complianceViolations.length > 0) {
        const blockingReasons: string[] = [];
        if (missing.length > 0) {
          blockingReasons.push(
            `Missing required fields: ${missing.join(', ')}`
          );
        }
        if (complianceViolations.length > 0) {
          blockingReasons.push(
            `Compliance rules blocked sync: ${complianceViolations.join('; ')}`
          );
        }
        const nextDoc: InvoiceAssistantDocument = {
          ...doc,
          status: 'recognized',
          needs_human_review: true,
          reasons: [
            ...doc.reasons.filter(
              reason =>
                !reason.startsWith('Missing required fields:') &&
                !reason.startsWith('Compliance rules blocked sync:')
            ),
            ...blockingReasons,
          ],
          updated_at: nowIso(),
        };
        patches.push({
          outcome: 'failed',
          patch: {
            documentId: doc.document_id,
            baseUpdatedAt: doc.updated_at,
            next: nextDoc,
          },
        });
        continue;
      }

      const nextDoc: InvoiceAssistantDocument = {
        ...doc,
        status: 'ready_to_sync',
        needs_human_review: false,
        reasons: doc.reasons.filter(
          reason =>
            !reason.startsWith('Missing required fields:') &&
            !reason.startsWith('Compliance rules blocked sync:')
        ),
        updated_at: nowIso(),
      };
      patches.push({
        outcome: 'success',
        patch: {
          documentId: doc.document_id,
          baseUpdatedAt: doc.updated_at,
          next: nextDoc,
        },
      });
    }

    const patchResult = applyDocumentPatches(patches.map(item => item.patch));
    conflicted += patchResult.conflicts;

    for (const item of patches) {
      if (!patchResult.appliedDocumentIds.has(item.patch.documentId)) {
        continue;
      }
      if (item.outcome === 'success') {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    return summarizeBatch(documentIds.length, succeeded, failed, conflicted);
  }

  async batchSyncToXero(documentIds: string[]): Promise<SyncBatchSummary> {
    const orchestratedSummary = await this.tryOrchestratedSync(documentIds);
    if (orchestratedSummary) {
      return orchestratedSummary;
    }

    const state = readState();
    const idSet = new Set(documentIds);
    const targetDocs = state.documents.filter(doc =>
      idSet.has(doc.document_id)
    );
    let succeeded = 0;
    let failed = 0;
    let conflicted = 0;
    const syncedDocumentIds = new Set<string>();

    const taskResults = await runWithConcurrency(
      targetDocs,
      async doc => {
        if (!doc.review) {
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'sync_failed' as const,
                sync_error: 'Review draft is missing',
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        }

        const missing = requiredMissingForSync(doc.review);
        const complianceViolations = complianceViolationsForSync(doc.review);
        if (missing.length > 0 || complianceViolations.length > 0) {
          const errorParts: string[] = [];
          if (missing.length > 0) {
            errorParts.push(`Missing required fields: ${missing.join(', ')}`);
          }
          if (complianceViolations.length > 0) {
            errorParts.push(
              `Compliance rules blocked sync: ${complianceViolations.join('; ')}`
            );
          }
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'sync_failed' as const,
                sync_error: errorParts.join(' | '),
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        }

        const payload = makeSyncPayload(doc, doc.review);
        const idempotencyKey = createSparkeryIdempotencyKey(
          'invoice.xero.sync',
          {
            document_id: doc.document_id,
            type: payload.type,
            date: payload.date,
            total: payload.total,
            supplier_name: payload.contact.name,
          }
        );

        if (
          doc.status === 'synced' &&
          doc.sync_idempotency_key === idempotencyKey
        ) {
          return {
            outcome: 'success' as const,
            patch: null as DocumentPatch | null,
            documentId: doc.document_id,
          };
        }

        if (
          state.settings.require_batch_approval &&
          doc.approval_status !== 'approved'
        ) {
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'sync_failed' as const,
                sync_error: 'Batch approval required before sync',
                sync_idempotency_key: idempotencyKey,
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        }

        const abnValidationError = await this.validateAbnBeforeSync(
          doc.review,
          state.settings
        );
        if (abnValidationError) {
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'sync_failed' as const,
                sync_error: abnValidationError,
                sync_idempotency_key: idempotencyKey,
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        }

        const localDuplicate = findBlockingLocalDuplicate(doc, state.documents);
        if (localDuplicate) {
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'sync_failed' as const,
                sync_error: buildLocalDuplicateSyncError(localDuplicate),
                sync_idempotency_key: idempotencyKey,
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        }

        try {
          const duplicateCheck = await this.precheckDuplicateWithXero(
            payload,
            idempotencyKey,
            state.settings
          );
          if (duplicateCheck.isDuplicate) {
            return {
              outcome: 'failed' as const,
              patch: {
                documentId: doc.document_id,
                baseUpdatedAt: doc.updated_at,
                next: {
                  ...doc,
                  status: 'sync_failed' as const,
                  sync_error: buildRemoteDuplicateSyncError(duplicateCheck),
                  sync_idempotency_key: idempotencyKey,
                  updated_at: nowIso(),
                },
              },
              documentId: doc.document_id,
            };
          }

          const syncResult = await this.syncSingleDocument(
            payload,
            idempotencyKey,
            state.settings
          );
          return {
            outcome: 'success' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'synced' as const,
                synced_at: nowIso(),
                xero_id: syncResult.xero_id,
                xero_type: payload.type,
                sync_idempotency_key: idempotencyKey,
                reconciliation_status: 'pending' as const,
                reconciled_at: null,
                reconciled_by: null,
                reconciliation_note: null,
                bank_transaction_ref: null,
                sync_error: null,
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        } catch (error) {
          return {
            outcome: 'failed' as const,
            patch: {
              documentId: doc.document_id,
              baseUpdatedAt: doc.updated_at,
              next: {
                ...doc,
                status: 'sync_failed' as const,
                sync_error:
                  error instanceof Error ? error.message : 'Xero sync failed',
                sync_idempotency_key: idempotencyKey,
                updated_at: nowIso(),
              },
            },
            documentId: doc.document_id,
          };
        }
      },
      MAX_BATCH_CONCURRENCY
    );

    const patchResult = applyDocumentPatches(
      taskResults
        .map(result => result.patch)
        .filter((patch): patch is DocumentPatch => Boolean(patch))
    );
    conflicted += patchResult.conflicts;

    for (const result of taskResults) {
      if (!result.patch) {
        if (result.outcome === 'success') {
          succeeded += 1;
          syncedDocumentIds.add(result.documentId);
        }
        continue;
      }
      if (!patchResult.appliedDocumentIds.has(result.patch.documentId)) {
        continue;
      }
      if (result.outcome === 'success') {
        succeeded += 1;
        syncedDocumentIds.add(result.documentId);
      } else {
        failed += 1;
      }
    }

    void this.cleanupSyncedSourceBlobs().catch(error => {
      console.error('Async blob cleanup failed:', error);
    });

    return {
      ...summarizeBatch(documentIds.length, succeeded, failed, conflicted),
      synced_document_ids: [...syncedDocumentIds],
    };
  }

  private async validateAbnBeforeSync(
    review: InvoiceReviewDraft,
    settings: InvoiceAssistantSettings
  ): Promise<string | null> {
    const normalizedAbn = normalizeAbnDigits(review.abn);
    if (!normalizedAbn) {
      return null;
    }
    if (!isValidAbnChecksum(normalizedAbn)) {
      return 'ABN validation failed: checksum is invalid';
    }

    const remoteValidation = await this.validateAbnWithRemoteCache(
      normalizedAbn,
      settings
    );
    if (!remoteValidation.valid) {
      return `ABN validation failed: ${remoteValidation.reason || 'ABN not found in ABR'}`;
    }
    return null;
  }

  private async validateAbnWithRemoteCache(
    abn: string,
    settings: InvoiceAssistantSettings
  ): Promise<{ valid: boolean; reason: string | null }> {
    const endpoint = normalizeName(settings.abn_validation_endpoint);
    if (!endpoint || settings.dry_run_mode) {
      return { valid: true, reason: null };
    }

    const cached = abnValidationCache.get(abn);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        valid: cached.valid,
        reason: cached.reason,
      };
    }
    const inFlight = abnValidationInFlight.get(abn);
    if (inFlight) {
      return inFlight;
    }

    const requestPromise = (async () => {
      const elapsedSinceLastCall = Date.now() - abnValidationLastRequestAt;
      const waitMs = ABN_MIN_REQUEST_INTERVAL_MS - elapsedSinceLastCall;
      if (waitMs > 0) {
        await delay(waitMs);
      }

      const response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ abn }),
        },
        { label: 'ABN validation' }
      );
      abnValidationLastRequestAt = Date.now();

      const payload = asRecord((await response.json()) as unknown) || {};
      const validFlags = [
        parseBoolean(payload.valid),
        parseBoolean(payload.is_valid),
        parseBoolean(payload.found),
        parseBoolean(payload.exists),
      ].filter((value): value is boolean => value !== null);
      const valid = validFlags.includes(true)
        ? true
        : validFlags.includes(false)
          ? false
          : true;
      const reason =
        normalizeName(payload.reason as string | null | undefined) ||
        normalizeName(payload.message as string | null | undefined) ||
        null;

      abnValidationCache.set(abn, {
        valid,
        reason,
        expiresAt: Date.now() + ABN_CACHE_TTL_MS,
      });

      return {
        valid,
        reason,
      };
    })();

    abnValidationInFlight.set(abn, requestPromise);
    try {
      return await requestPromise;
    } finally {
      abnValidationInFlight.delete(abn);
    }
  }

  private async precheckDuplicateWithXero(
    payload: XeroSyncDraftPayload,
    idempotencyKey: string,
    settings: InvoiceAssistantSettings
  ): Promise<{
    isDuplicate: boolean;
    reason: string | null;
    xero_id: string | null;
  }> {
    if (!settings.xero_duplicate_check_endpoint || settings.dry_run_mode) {
      return {
        isDuplicate: false,
        reason: null,
        xero_id: null,
      };
    }

    const response = await fetchWithRetry(
      settings.xero_duplicate_check_endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
      { label: 'Xero duplicate precheck' }
    );
    const data = (await response.json()) as Record<string, unknown>;
    const parsedFlags = [
      parseBoolean(data.is_duplicate),
      parseBoolean(data.duplicate),
      parseBoolean(data.exists),
      parseBoolean(data.conflict),
    ].filter((item): item is boolean => item !== null);
    const xeroId =
      normalizeName(data.xero_id as string | null | undefined) ||
      normalizeName(data.id as string | null | undefined) ||
      normalizeName(data.existing_xero_id as string | null | undefined);
    const reason =
      normalizeName(data.reason as string | null | undefined) ||
      normalizeName(data.message as string | null | undefined);
    const isDuplicate = parsedFlags.includes(true) || Boolean(xeroId);
    return {
      isDuplicate,
      reason,
      xero_id: xeroId,
    };
  }

  private async syncSingleDocument(
    payload: XeroSyncDraftPayload,
    idempotencyKey: string,
    settings: InvoiceAssistantSettings
  ): Promise<{ xero_id: string }> {
    if (!settings.xero_sync_endpoint || settings.dry_run_mode) {
      return { xero_id: `xero_mock_${payload.document_id}` };
    }

    const response = await fetchWithRetry(
      settings.xero_sync_endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      },
      { label: 'Xero sync' }
    );
    const data = (await response.json()) as Record<string, unknown>;
    const xeroId =
      normalizeName(data.xero_id as string | null | undefined) ||
      normalizeName(data.id as string | null | undefined);
    if (!xeroId) {
      throw new Error('Xero sync succeeded but xero_id is missing');
    }
    await this.uploadXeroAttachment(xeroId, payload, idempotencyKey, settings);
    return { xero_id: xeroId };
  }

  private async uploadXeroAttachment(
    xeroId: string,
    payload: XeroSyncDraftPayload,
    idempotencyKey: string,
    settings: InvoiceAssistantSettings
  ): Promise<void> {
    if (!settings.xero_attachment_endpoint || settings.dry_run_mode) {
      return;
    }

    const blobRecord = await getInvoiceSourceBlob(payload.document_id);
    if (!blobRecord) {
      throw new Error(
        'Xero attachment upload failed: original file is missing from local vault'
      );
    }

    const formData = new FormData();
    formData.append('file', blobRecord.blob, blobRecord.file_name);
    formData.append('xero_id', xeroId);
    formData.append('document_id', payload.document_id);
    formData.append('drive_file_id', payload.drive_file_id || '');
    formData.append('drive_file_url', payload.drive_file_url || '');

    const response = await fetchWithRetry(
      settings.xero_attachment_endpoint,
      {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
        body: formData,
      },
      { label: 'Xero attachment upload' }
    );
    let data: Record<string, unknown> | null = null;
    try {
      data = asRecord((await response.json()) as unknown);
    } catch (_error) {
      data = null;
    }

    const successFlag = parseBoolean(data?.success);
    if (successFlag === false) {
      const reason =
        normalizeName(data?.message as string | null | undefined) ||
        normalizeName(data?.error as string | null | undefined) ||
        'unknown reason';
      throw new Error(`Xero attachment upload failed: ${reason}`);
    }
  }

  private async cleanupSyncedSourceBlobs(): Promise<{
    stale_documents: number;
    blobs_removed: number;
    redacted_documents: number;
  }> {
    const state = readState();
    const retentionDays = resolveBlobRetentionDays(state.settings);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const staleDocuments = state.documents.filter(doc =>
      isPastRetentionCutoff(doc, cutoff)
    );
    if (staleDocuments.length === 0) {
      return {
        stale_documents: 0,
        blobs_removed: 0,
        redacted_documents: 0,
      };
    }

    const cleanupResults = await runWithConcurrency(
      staleDocuments,
      async doc => {
        try {
          await removeInvoiceSourceBlob(doc.document_id);
          return true;
        } catch (error) {
          console.error(
            `Failed to cleanup source blob for ${doc.document_id}:`,
            error
          );
          return false;
        }
      },
      2
    );
    const blobsRemoved = cleanupResults.filter(Boolean).length;

    const redactionPatches = staleDocuments
      .map(doc => {
        const redacted = redactSensitiveDocumentForRetention(doc);
        if (!redacted.changed) {
          return null;
        }
        return {
          documentId: doc.document_id,
          baseUpdatedAt: doc.updated_at,
          next: redacted.next,
        } as DocumentPatch;
      })
      .filter((item): item is DocumentPatch => Boolean(item));
    const redactionResult = applyDocumentPatches(redactionPatches);

    return {
      stale_documents: staleDocuments.length,
      blobs_removed: blobsRemoved,
      redacted_documents: redactionResult.applied,
    };
  }
}

export const invoiceIngestionAssistantService =
  new InvoiceIngestionAssistantService();
