export type InvoiceAssistantStatus =
  | 'uploaded'
  | 'recognized'
  | 'ready_to_sync'
  | 'synced'
  | 'recognize_failed'
  | 'sync_failed';

export type InvoiceApprovalStatus = 'pending' | 'approved';

export type XeroTransactionType = 'SPEND_MONEY' | 'BILL';

export type InvoiceGstStatus =
  | 'explicit_amount'
  | 'included_unknown_amount'
  | 'no_gst_indicated'
  | 'unknown'
  | 'mixed';

export interface InvoiceLineItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceExtractionConfidence {
  supplier_name: number;
  invoice_date: number;
  total: number;
  gst: number;
  abn: number;
}

export interface InvoiceExtractionResult {
  raw_merchant: string | null;
  supplier_name: string | null;
  abn: string | null;
  tax_invoice_flag: boolean;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string | null;
  total: number | null;
  gst_amount: number | null;
  gst_status: InvoiceGstStatus;
  line_items: InvoiceLineItemDraft[];
  confidence: InvoiceExtractionConfidence;
  needs_human_review: boolean;
  reasons: string[];
}

export interface InvoiceReviewDraft {
  invoice_date: string | null;
  due_date: string | null;
  supplier_name: string | null;
  abn: string | null;
  invoice_number: string | null;
  currency: string;
  total: number | null;
  gst_amount: number | null;
  gst_status: InvoiceGstStatus;
  tax_invoice_flag: boolean;
  category: string | null;
  account_code: string | null;
  tax_type: string | null;
  description: string | null;
  payment_method: string | null;
  transaction_type: XeroTransactionType;
  line_items: InvoiceLineItemDraft[];
  drive_file_id: string | null;
  drive_url: string | null;
}

export interface SupplierDirectoryEntry {
  id: string;
  name: string;
  aliases: string[];
  abn: string | null;
  default_account_code: string | null;
  default_tax_type: string | null;
  default_currency: string | null;
  default_transaction_type: XeroTransactionType | null;
}

export interface InvoiceAssistantDocument {
  document_id: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  archive_date_folder: string;
  archive_file_name: string;
  drive_file_id: string | null;
  drive_url: string | null;
  status: InvoiceAssistantStatus;
  extraction: InvoiceExtractionResult | null;
  review: InvoiceReviewDraft | null;
  needs_human_review: boolean;
  reasons: string[];
  recognize_error: string | null;
  sync_error: string | null;
  archive_error: string | null;
  synced_at: string | null;
  xero_id: string | null;
  xero_type: XeroTransactionType | null;
  sync_idempotency_key: string | null;
  approval_status: InvoiceApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
  updated_at: string;
}

export interface InvoiceAssistantSettings {
  drive_root_folder: string;
  state_sync_endpoint: string | null;
  orchestration_endpoint: string | null;
  drive_archive_endpoint: string | null;
  ocr_extract_endpoint: string | null;
  xero_sync_endpoint: string | null;
  xero_attachment_endpoint: string | null;
  xero_duplicate_check_endpoint: string | null;
  abn_validation_endpoint: string | null;
  auto_learn_supplier_rules: boolean;
  require_batch_approval: boolean;
  default_currency: string;
  default_transaction_type: XeroTransactionType;
  dry_run_mode: boolean;
  blob_retention_days: number;
}

export interface InvoiceAssistantState {
  version: number;
  documents: InvoiceAssistantDocument[];
  suppliers: SupplierDirectoryEntry[];
  settings: InvoiceAssistantSettings;
}

export interface BatchActionSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  conflicted: number;
}

export interface UploadBatchSummary extends BatchActionSummary {
  document_ids: string[];
}

export interface SyncBatchSummary extends BatchActionSummary {
  synced_document_ids: string[];
}

export interface ReconciliationSuggestion {
  document_id: string;
  supplier_name: string;
  invoice_date: string | null;
  currency: string;
  amount: number;
  confidence: number;
  suggestion: string;
  matched_by: 'amount_date_supplier' | 'amount_supplier';
}

export interface SecurityAuditSnapshotItem {
  document_id: string;
  status: InvoiceAssistantStatus;
  approval_status: InvoiceApprovalStatus;
  synced_at: string | null;
  xero_id: string | null;
  supplier_name: string | null;
  invoice_date: string | null;
  total: number | null;
  currency: string | null;
  abn_masked: string | null;
  drive_url_redacted: boolean;
  sync_error: string | null;
  recognize_error: string | null;
}

export interface SecurityAuditSnapshot {
  exported_at: string;
  retention_days: number;
  documents_total: number;
  synced_total: number;
  redacted_documents: number;
  settings: {
    dry_run_mode: boolean;
    require_batch_approval: boolean;
    auto_learn_supplier_rules: boolean;
    blob_retention_days: number;
  };
  documents: SecurityAuditSnapshotItem[];
}

export interface SecurityAuditEncryptedExport {
  exported_at: string;
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  cipher_text: string;
}

export interface XeroSyncDraftPayload {
  type: XeroTransactionType;
  date: string;
  due_date: string | null;
  contact: {
    name: string;
    abn: string | null;
  };
  invoice_number: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    accountCode: string | null;
    taxType: string | null;
  }>;
  total: number;
  currency: string;
  gst_amount: number | null;
  category: string | null;
  payment_method: string | null;
  drive_file_id: string | null;
  drive_file_url: string | null;
  document_id: string;
}
