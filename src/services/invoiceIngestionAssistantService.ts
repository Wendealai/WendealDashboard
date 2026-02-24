import {
  getInvoiceSourceBlob,
  saveInvoiceSourceBlob,
} from './invoiceIngestionBlobStore';
import { createSparkeryIdempotencyKey } from './sparkeryIdempotency';
import type {
  BatchActionSummary,
  InvoiceAssistantDocument,
  InvoiceAssistantSettings,
  InvoiceAssistantState,
  InvoiceExtractionResult,
  InvoiceGstStatus,
  InvoiceReviewDraft,
  SupplierDirectoryEntry,
  SyncBatchSummary,
  UploadBatchSummary,
  XeroSyncDraftPayload,
} from '@/pages/Tools/types/invoiceIngestionAssistant';

const STATE_STORAGE_KEY = 'invoice_ingestion_assistant_state_v1';

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
  drive_archive_endpoint: null,
  ocr_extract_endpoint: null,
  xero_sync_endpoint: null,
  default_currency: 'AUD',
  default_transaction_type: 'SPEND_MONEY',
  dry_run_mode: true,
};

const nowIso = (): string => new Date().toISOString();

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

const readState = (): InvoiceAssistantState => {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) {
      return {
        documents: [],
        suppliers: DEFAULT_SUPPLIERS,
        settings: DEFAULT_SETTINGS,
      };
    }

    const parsed = JSON.parse(raw) as Partial<InvoiceAssistantState>;
    return {
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      suppliers:
        Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0
          ? parsed.suppliers
          : DEFAULT_SUPPLIERS,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
      },
    };
  } catch (error) {
    console.error('Failed to read invoice assistant state:', error);
    return {
      documents: [],
      suppliers: DEFAULT_SUPPLIERS,
      settings: DEFAULT_SETTINGS,
    };
  }
};

const writeState = (state: InvoiceAssistantState): void => {
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
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
    tax_type: supplierMatch?.default_tax_type || null,
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

const inferHumanReview = (
  extraction: InvoiceExtractionResult,
  review: InvoiceReviewDraft
): { needsReview: boolean; reasons: string[] } => {
  const reasons = [...extraction.reasons];
  const missing = requiredMissingForSync(review);
  if (missing.length > 0) {
    reasons.push(`Missing required fields: ${missing.join(', ')}`);
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
  failed: number
): BatchActionSummary => ({
  total,
  succeeded,
  failed,
  skipped: Math.max(total - succeeded - failed, 0),
});

class InvoiceIngestionAssistantService {
  getState(): InvoiceAssistantState {
    return readState();
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
    const nextSettings: InvoiceAssistantSettings = {
      ...state.settings,
      ...settingsPatch,
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

    writeState({
      ...state,
      documents: [...uploadedDocs, ...state.documents],
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

      const response = await fetch(settings.drive_archive_endpoint, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        return {
          drive_file_id: null,
          drive_url: null,
          error: `Drive archive failed with HTTP ${response.status}`,
        };
      }

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
    const state = readState();
    const idSet = new Set(documentIds);
    let succeeded = 0;
    let failed = 0;

    const nextDocuments: InvoiceAssistantDocument[] = await Promise.all(
      state.documents.map(async doc => {
        if (!idSet.has(doc.document_id)) {
          return doc;
        }
        if (doc.status === 'synced') {
          return doc;
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
          succeeded += 1;
          return {
            ...doc,
            extraction,
            review,
            status: reviewGate.needsReview ? 'recognized' : 'ready_to_sync',
            needs_human_review: reviewGate.needsReview,
            reasons: reviewGate.reasons,
            recognize_error: null,
            updated_at: nowIso(),
          };
        } catch (error) {
          failed += 1;
          return {
            ...doc,
            status: 'recognize_failed',
            recognize_error:
              error instanceof Error ? error.message : 'Recognition failed',
            updated_at: nowIso(),
          };
        }
      })
    );

    writeState({
      ...state,
      documents: nextDocuments,
    });

    return summarizeBatch(documentIds.length, succeeded, failed);
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

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`OCR endpoint failed with HTTP ${response.status}`);
    }
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
      updated_at: nowIso(),
    };

    writeState({
      ...state,
      documents: state.documents.map(item =>
        item.document_id === documentId ? nextDoc : item
      ),
    });
    return nextDoc;
  }

  markReadyToSync(documentIds: string[]): BatchActionSummary {
    const state = readState();
    const idSet = new Set(documentIds);
    let succeeded = 0;
    let failed = 0;

    const documents: InvoiceAssistantDocument[] = state.documents.map(doc => {
      if (!idSet.has(doc.document_id)) {
        return doc;
      }
      if (!doc.review) {
        failed += 1;
        return doc;
      }
      const missing = requiredMissingForSync(doc.review);
      if (missing.length > 0) {
        failed += 1;
        return {
          ...doc,
          status: 'recognized',
          needs_human_review: true,
          reasons: [
            ...doc.reasons.filter(
              reason => !reason.startsWith('Missing required fields:')
            ),
            `Missing required fields: ${missing.join(', ')}`,
          ],
          updated_at: nowIso(),
        };
      }

      succeeded += 1;
      return {
        ...doc,
        status: 'ready_to_sync',
        needs_human_review: false,
        reasons: doc.reasons.filter(
          reason => !reason.startsWith('Missing required fields:')
        ),
        updated_at: nowIso(),
      };
    });

    writeState({
      ...state,
      documents,
    });
    return summarizeBatch(documentIds.length, succeeded, failed);
  }

  async batchSyncToXero(documentIds: string[]): Promise<SyncBatchSummary> {
    const state = readState();
    const idSet = new Set(documentIds);
    let succeeded = 0;
    let failed = 0;
    const syncedDocumentIds: string[] = [];

    const documents: InvoiceAssistantDocument[] = await Promise.all(
      state.documents.map(async doc => {
        if (!idSet.has(doc.document_id)) {
          return doc;
        }
        if (!doc.review) {
          failed += 1;
          return {
            ...doc,
            status: 'sync_failed',
            sync_error: 'Review draft is missing',
            updated_at: nowIso(),
          };
        }

        const missing = requiredMissingForSync(doc.review);
        if (missing.length > 0) {
          failed += 1;
          return {
            ...doc,
            status: 'sync_failed',
            sync_error: `Missing required fields: ${missing.join(', ')}`,
            updated_at: nowIso(),
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
          succeeded += 1;
          syncedDocumentIds.push(doc.document_id);
          return doc;
        }

        try {
          const syncResult = await this.syncSingleDocument(
            payload,
            idempotencyKey,
            state.settings
          );
          succeeded += 1;
          syncedDocumentIds.push(doc.document_id);
          return {
            ...doc,
            status: 'synced',
            synced_at: nowIso(),
            xero_id: syncResult.xero_id,
            xero_type: payload.type,
            sync_idempotency_key: idempotencyKey,
            sync_error: null,
            updated_at: nowIso(),
          };
        } catch (error) {
          failed += 1;
          return {
            ...doc,
            status: 'sync_failed',
            sync_error:
              error instanceof Error ? error.message : 'Xero sync failed',
            sync_idempotency_key: idempotencyKey,
            updated_at: nowIso(),
          };
        }
      })
    );

    writeState({
      ...state,
      documents,
    });

    return {
      ...summarizeBatch(documentIds.length, succeeded, failed),
      synced_document_ids: syncedDocumentIds,
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

    const response = await fetch(settings.xero_sync_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Xero sync failed with HTTP ${response.status}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const xeroId =
      normalizeName(data.xero_id as string | null | undefined) ||
      normalizeName(data.id as string | null | undefined);
    if (!xeroId) {
      throw new Error('Xero sync succeeded but xero_id is missing');
    }
    return { xero_id: xeroId };
  }
}

export const invoiceIngestionAssistantService =
  new InvoiceIngestionAssistantService();
