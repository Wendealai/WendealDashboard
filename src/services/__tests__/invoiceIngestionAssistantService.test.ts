import { invoiceIngestionAssistantService } from '../invoiceIngestionAssistantService';
import {
  getInvoiceSourceBlob,
  removeInvoiceSourceBlob,
} from '../invoiceIngestionBlobStore';
import { saveInvoiceAssistantStateSnapshot } from '../invoiceIngestionStateStore';
import type {
  InvoiceAssistantDocument,
  InvoiceAssistantSettings,
  InvoiceAssistantState,
  InvoiceReviewDraft,
} from '@/pages/Tools/types/invoiceIngestionAssistant';

jest.mock('../invoiceIngestionBlobStore', () => ({
  getInvoiceSourceBlob: jest.fn(),
  saveInvoiceSourceBlob: jest.fn(),
  removeInvoiceSourceBlob: jest.fn(),
}));

jest.mock('../invoiceIngestionStateStore', () => ({
  getInvoiceAssistantStateSnapshot: jest.fn(async () => null),
  saveInvoiceAssistantStateSnapshot: jest.fn(async () => undefined),
}));

const STORAGE_KEY = 'invoice_ingestion_assistant_state_v1';

const baseSettings: InvoiceAssistantSettings = {
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

const makeReview = (
  override: Partial<InvoiceReviewDraft> = {}
): InvoiceReviewDraft => ({
  invoice_date: '2026-02-20',
  due_date: null,
  supplier_name: 'Coles',
  abn: '51824753556',
  invoice_number: 'INV-001',
  currency: 'AUD',
  total: 100,
  gst_amount: 10,
  gst_status: 'explicit_amount',
  tax_invoice_flag: true,
  category: null,
  account_code: '400',
  tax_type: 'INPUT',
  description: 'Receipt expense',
  payment_method: null,
  transaction_type: 'SPEND_MONEY',
  line_items: [],
  drive_file_id: 'drive_1',
  drive_url: 'https://drive.example/doc/1',
  ...override,
});

const makeDocument = (
  override: Partial<InvoiceAssistantDocument> = {}
): InvoiceAssistantDocument => ({
  document_id: 'doc_1',
  file_name: 'receipt-2026-02-20-100.00.jpg',
  mime_type: 'image/jpeg',
  created_at: '2026-02-20T08:00:00.000Z',
  archive_date_folder: '2026-02-20',
  archive_file_name: 'receipt-1.jpg',
  drive_file_id: 'drive_1',
  drive_url: 'https://drive.example/doc/1',
  status: 'ready_to_sync',
  extraction: null,
  review: makeReview(),
  needs_human_review: false,
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
  updated_at: '2026-02-20T08:00:00.000Z',
  ...override,
});

const writeAssistantState = (state: InvoiceAssistantState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const readAssistantState = (): InvoiceAssistantState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    throw new Error('Expected state to exist in localStorage');
  }
  return JSON.parse(raw) as InvoiceAssistantState;
};

describe('invoiceIngestionAssistantService', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();
    invoiceIngestionAssistantService.resetTransientRuntimeState();

    (localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      return storage.has(key) ? storage.get(key) : null;
    });
    (localStorage.setItem as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        storage.set(key, value);
      }
    );
    (localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      storage.delete(key);
    });
    (localStorage.clear as jest.Mock).mockImplementation(() => {
      storage.clear();
    });

    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  it('marks ready with validation errors when required fields are missing', () => {
    const doc = makeDocument({
      status: 'recognized',
      review: makeReview({ supplier_name: null }),
    });
    writeAssistantState({
      version: 1,
      documents: [doc],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = invoiceIngestionAssistantService.markReadyToSync(['doc_1']);
    const nextState = readAssistantState();
    const nextDoc = nextState.documents[0];

    expect(summary.total).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.succeeded).toBe(0);
    expect(nextDoc.status).toBe('recognized');
    expect(nextDoc.reasons.join(' ')).toContain('Missing required fields');
  });

  it('blocks mark ready when compliance rules are violated', () => {
    const doc = makeDocument({
      status: 'recognized',
      review: makeReview({
        transaction_type: 'BILL',
        due_date: null,
        invoice_number: null,
      }),
    });
    writeAssistantState({
      version: 1,
      documents: [doc],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = invoiceIngestionAssistantService.markReadyToSync(['doc_1']);
    const nextState = readAssistantState();
    const nextDoc = nextState.documents[0];

    expect(summary.failed).toBe(1);
    expect(summary.succeeded).toBe(0);
    expect(nextDoc.status).toBe('recognized');
    expect(nextDoc.reasons.join(' ')).toContain(
      'Compliance rules blocked sync'
    );
  });

  it('blocks mark ready when GST explicit amount is incomplete', () => {
    const doc = makeDocument({
      status: 'recognized',
      review: makeReview({
        gst_status: 'explicit_amount',
        gst_amount: null,
      }),
    });
    writeAssistantState({
      version: 1,
      documents: [doc],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = invoiceIngestionAssistantService.markReadyToSync(['doc_1']);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('recognized');
    expect(nextState.documents[0].reasons.join(' ')).toContain(
      'Explicit GST requires non-negative gst_amount'
    );
  });

  it('marks recognize_failed when original source blob is missing', async () => {
    const doc = makeDocument({
      status: 'uploaded',
      review: null,
      drive_file_id: null,
      drive_url: null,
    });
    writeAssistantState({
      version: 1,
      documents: [doc],
      suppliers: [],
      settings: baseSettings,
    });
    (getInvoiceSourceBlob as jest.Mock).mockResolvedValue(null);

    const summary = await invoiceIngestionAssistantService.batchRecognize([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('recognize_failed');
  });

  it('uses orchestration endpoint for batch recognize when configured', async () => {
    const orchestrationEndpoint = 'https://orchestrator.example/jobs';
    const uploadedDoc = makeDocument({
      status: 'uploaded',
      review: null,
    });
    writeAssistantState({
      version: 1,
      documents: [uploadedDoc],
      suppliers: [],
      settings: {
        ...baseSettings,
        orchestration_endpoint: orchestrationEndpoint,
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          job_id: 'job-recognize-1',
          status: 'queued',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'succeeded',
          summary: {
            succeeded: 1,
            failed: 0,
            conflicted: 0,
          },
          state: {
            version: 2,
            documents: [
              makeDocument({
                status: 'recognized',
                review: makeReview(),
              }),
            ],
            suppliers: [],
            settings: {
              ...baseSettings,
              orchestration_endpoint: orchestrationEndpoint,
            },
          },
        }),
      } as Response);

    const summary = await invoiceIngestionAssistantService.batchRecognize([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect(nextState.documents[0].status).toBe('recognized');
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      orchestrationEndpoint
    );
    expect((global.fetch as jest.Mock).mock.calls[1]?.[0]).toBe(
      `${orchestrationEndpoint}/job-recognize-1`
    );
    expect(getInvoiceSourceBlob).not.toHaveBeenCalled();
  });

  it('keeps idempotent sync result on repeated sync calls', async () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings: baseSettings,
    });

    const first = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const stateAfterFirst = readAssistantState();
    const docAfterFirst = stateAfterFirst.documents[0];
    const second = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const stateAfterSecond = readAssistantState();

    expect(first.succeeded).toBe(1);
    expect(second.succeeded).toBe(1);
    expect(docAfterFirst.status).toBe('synced');
    expect(docAfterFirst.sync_idempotency_key).toBeTruthy();
    expect(stateAfterSecond.documents[0].sync_idempotency_key).toBe(
      docAfterFirst.sync_idempotency_key
    );
  });

  it('blocks sync when local duplicate signature already exists', async () => {
    const syncedDoc = makeDocument({
      document_id: 'doc_synced',
      status: 'synced',
      synced_at: '2026-02-20T09:00:00.000Z',
      xero_id: 'xero_existing',
      sync_idempotency_key: 'existing-sync-key',
      updated_at: '2026-02-20T09:00:00.000Z',
    });
    const readyDoc = makeDocument({
      document_id: 'doc_ready',
      status: 'ready_to_sync',
      synced_at: null,
      xero_id: null,
      sync_idempotency_key: null,
      updated_at: '2026-02-25T00:00:00.000Z',
    });
    writeAssistantState({
      version: 1,
      documents: [readyDoc, syncedDoc],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_ready',
    ]);
    const nextState = readAssistantState();
    const nextDoc = nextState.documents.find(
      item => item.document_id === 'doc_ready'
    );

    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(1);
    expect(nextDoc?.status).toBe('sync_failed');
    expect(nextDoc?.sync_error).toContain('Duplicate precheck blocked');
    expect(nextDoc?.sync_error).toContain('doc_synced');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reports conflicts when document changed during recognize batch', async () => {
    const doc = makeDocument({
      status: 'uploaded',
      review: null,
      drive_file_id: null,
      drive_url: null,
    });
    writeAssistantState({
      version: 1,
      documents: [doc],
      suppliers: [],
      settings: baseSettings,
    });

    let resolveBlob!: (value: unknown) => void;
    (getInvoiceSourceBlob as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveBlob = resolve;
        })
    );

    const running = invoiceIngestionAssistantService.batchRecognize(['doc_1']);

    await new Promise<void>(resolve => {
      const waitForBlobRequest = () => {
        if (resolveBlob) {
          resolve();
          return;
        }
        setTimeout(waitForBlobRequest, 0);
      };
      waitForBlobRequest();
    });

    const midState = readAssistantState();
    midState.documents[0].updated_at = '2026-02-20T09:00:00.000Z';
    writeAssistantState(midState);

    resolveBlob({
      document_id: 'doc_1',
      blob: new Blob(['binary'], { type: 'image/jpeg' }),
      file_name: 'receipt-2026-02-20-100.00.jpg',
      mime_type: 'image/jpeg',
      updated_at: '2026-02-20T08:00:00.000Z',
    });

    const summary = await running;

    expect(summary.conflicted).toBe(1);
    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(0);
  });

  it('retries xero sync on transient failure and then succeeds', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      xero_sync_endpoint: 'https://xero.example/sync',
    };
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ review: makeReview({ abn: '53004085616' }) })],
      suppliers: [],
      settings,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ xero_id: 'xero_123' }),
      } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
    expect(nextState.documents[0].xero_id).toBe('xero_123');
  });

  it('uploads source image to xero attachment endpoint after sync', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      xero_sync_endpoint: 'https://xero.example/sync',
      xero_attachment_endpoint: 'https://xero.example/attachments',
    };
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings,
    });
    (getInvoiceSourceBlob as jest.Mock).mockResolvedValue({
      document_id: 'doc_1',
      file_name: 'receipt-2026-02-20-100.00.jpg',
      mime_type: 'image/jpeg',
      blob: new Blob(['binary'], { type: 'image/jpeg' }),
      updated_at: '2026-02-25T10:00:00.000Z',
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ xero_id: 'xero_with_attachment' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect(nextState.documents[0].status).toBe('synced');
    expect(nextState.documents[0].xero_id).toBe('xero_with_attachment');
    expect(getInvoiceSourceBlob).toHaveBeenCalledWith('doc_1');
    expect((global.fetch as jest.Mock).mock.calls[1]?.[0]).toBe(
      'https://xero.example/attachments'
    );
  });

  it('marks sync_failed when xero attachment upload is rejected', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      xero_sync_endpoint: 'https://xero.example/sync',
      xero_attachment_endpoint: 'https://xero.example/attachments',
    };
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings,
    });
    (getInvoiceSourceBlob as jest.Mock).mockResolvedValue({
      document_id: 'doc_1',
      file_name: 'receipt-2026-02-20-100.00.jpg',
      mime_type: 'image/jpeg',
      blob: new Blob(['binary'], { type: 'image/jpeg' }),
      updated_at: '2026-02-25T10:00:00.000Z',
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ xero_id: 'xero_attachment_rejected' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: 'attachment rejected' }),
      } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'Xero attachment upload failed'
    );
  });

  it('blocks sync when compliance rules are violated', async () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          review: makeReview({
            transaction_type: 'BILL',
            due_date: null,
            invoice_number: null,
          }),
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(summary.succeeded).toBe(0);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'Compliance rules blocked sync'
    );
  });

  it('blocks sync when no-gst status conflicts with tax binding', async () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          review: makeReview({
            gst_status: 'no_gst_indicated',
            gst_amount: 10,
            tax_type: 'INPUT',
            tax_invoice_flag: false,
          }),
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'No GST indicated requires tax_type NONE'
    );
  });

  it('blocks sync when batch approval gate is enabled and document is pending', async () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ approval_status: 'pending' })],
      suppliers: [],
      settings: {
        ...baseSettings,
        require_batch_approval: true,
      },
    });

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'Batch approval required before sync'
    );
  });

  it('approves selected documents and allows sync with approval gate', async () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ approval_status: 'pending' })],
      suppliers: [],
      settings: {
        ...baseSettings,
        require_batch_approval: true,
      },
    });

    const approvalSummary = invoiceIngestionAssistantService.batchSetApproval(
      ['doc_1'],
      'approved',
      'qa'
    );
    const afterApprove = readAssistantState();
    const syncSummary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);

    expect(approvalSummary.succeeded).toBe(1);
    expect(afterApprove.documents[0].approval_status).toBe('approved');
    expect(afterApprove.documents[0].approved_by).toBe('qa');
    expect(afterApprove.documents[0].approved_at).toBeTruthy();
    expect(syncSummary.succeeded).toBe(1);
  });

  it('marks synced documents as reconciled', () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ status: 'synced' })],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = invoiceIngestionAssistantService.batchSetReconciliation(
      ['doc_1'],
      'reconciled',
      'qa',
      'Matched to statement line'
    );
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect(nextState.documents[0].reconciliation_status).toBe('reconciled');
    expect(nextState.documents[0].reconciled_by).toBe('qa');
    expect(nextState.documents[0].reconciliation_note).toBe(
      'Matched to statement line'
    );
    expect(nextState.documents[0].reconciled_at).toBeTruthy();
  });

  it('does not reconcile non-synced documents', () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ status: 'ready_to_sync' })],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = invoiceIngestionAssistantService.batchSetReconciliation(
      ['doc_1'],
      'reconciled',
      'qa'
    );
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].reconciliation_status).toBe('pending');
  });

  it('adds manual guidance for non-retryable sync failures in playbook', async () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          status: 'sync_failed',
          sync_error: 'Missing required fields: invoice_date',
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = await invoiceIngestionAssistantService.runFailurePlaybook([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'manual correction required before retry'
    );
  });

  it('retries retryable sync failures via playbook', async () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          status: 'sync_failed',
          sync_error: 'Xero sync failed with HTTP 503',
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = await invoiceIngestionAssistantService.runFailurePlaybook([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(0);
    expect(nextState.documents[0].status).toBe('synced');
  });

  it('auto-binds tax_type from gst_status on review update', () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          status: 'recognized',
          review: makeReview({
            gst_status: 'explicit_amount',
            tax_type: 'INPUT',
          }),
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const updated = invoiceIngestionAssistantService.updateReview('doc_1', {
      gst_status: 'no_gst_indicated',
      tax_type: null,
      gst_amount: null,
      tax_invoice_flag: false,
    });

    expect(updated?.review?.tax_type).toBe('NONE');
  });

  it('learns supplier defaults from review corrections', () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ status: 'recognized' })],
      suppliers: [
        {
          id: 'supplier-coles',
          name: 'Coles',
          aliases: ['COLES'],
          abn: null,
          default_account_code: '400',
          default_tax_type: 'INPUT',
          default_currency: 'AUD',
          default_transaction_type: 'SPEND_MONEY',
        },
      ],
      settings: baseSettings,
    });

    invoiceIngestionAssistantService.updateReview('doc_1', {
      supplier_name: 'Coles',
      account_code: '510',
      tax_type: 'NONE',
      transaction_type: 'BILL',
      abn: '53004085616',
    });
    const nextState = readAssistantState();
    const learned = nextState.suppliers.find(
      item => item.id === 'supplier-coles'
    );

    expect(learned?.default_account_code).toBe('510');
    expect(learned?.default_tax_type).toBe('NONE');
    expect(learned?.default_transaction_type).toBe('BILL');
    expect(learned?.abn).toBe('53004085616');
  });

  it('creates supplier template from review correction when no match exists', () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ status: 'recognized' })],
      suppliers: [],
      settings: baseSettings,
    });

    invoiceIngestionAssistantService.updateReview('doc_1', {
      supplier_name: 'Officeworks',
      account_code: '501',
      tax_type: 'INPUT',
      transaction_type: 'SPEND_MONEY',
      abn: '53004085616',
    });
    const nextState = readAssistantState();
    const learned = nextState.suppliers.find(
      item => item.name === 'Officeworks'
    );

    expect(nextState.suppliers.length).toBeGreaterThanOrEqual(4);
    expect(learned?.aliases).toContain('OFFICEWORKS');
    expect(learned?.default_account_code).toBe('501');
  });

  it('does not learn supplier template when auto-learn is disabled', () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ status: 'recognized' })],
      suppliers: [],
      settings: {
        ...baseSettings,
        auto_learn_supplier_rules: false,
      },
    });

    invoiceIngestionAssistantService.updateReview('doc_1', {
      supplier_name: 'Officeworks',
      account_code: '501',
      tax_type: 'INPUT',
    });
    const nextState = readAssistantState();
    const learned = nextState.suppliers.find(
      item => item.name === 'Officeworks'
    );

    expect(nextState.suppliers).toHaveLength(3);
    expect(learned).toBeUndefined();
  });

  it('blocks sync when ABN checksum is invalid', async () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          review: makeReview({
            abn: '12345678901',
            tax_invoice_flag: false,
          }),
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'Compliance rules blocked sync'
    );
  });

  it('reuses ABN validation cache for same ABN in one batch', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      abn_validation_endpoint: 'https://abr.example/validate',
    };
    const firstDoc = makeDocument({
      document_id: 'doc_1',
      review: makeReview({ invoice_number: 'INV-ABN-1' }),
    });
    const secondDoc = makeDocument({
      document_id: 'doc_2',
      review: makeReview({ invoice_number: 'INV-ABN-2' }),
      updated_at: '2026-02-20T08:00:01.000Z',
    });
    writeAssistantState({
      version: 1,
      documents: [firstDoc, secondDoc],
      suppliers: [],
      settings,
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
      'doc_2',
    ]);

    expect(summary.succeeded).toBe(2);
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://abr.example/validate'
    );
  });

  it('blocks sync when ABR endpoint marks ABN invalid', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      abn_validation_endpoint: 'https://abr.example/validate',
    };
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ review: makeReview({ abn: '53004085616' }) })],
      suppliers: [],
      settings,
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        valid: false,
        reason: 'ABN not found',
      }),
    } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'ABN validation failed'
    );
  });

  it('blocks sync when xero duplicate precheck reports duplicate', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      xero_sync_endpoint: 'https://xero.example/sync',
      xero_duplicate_check_endpoint: 'https://xero.example/duplicate-check',
    };
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        is_duplicate: true,
        xero_id: 'xero_existing',
        reason: 'invoice already exists',
      }),
    } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(1);
    expect(nextState.documents[0].status).toBe('sync_failed');
    expect(nextState.documents[0].sync_error).toContain(
      'Duplicate precheck blocked by Xero'
    );
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
  });

  it('continues sync when xero duplicate precheck passes', async () => {
    const settings: InvoiceAssistantSettings = {
      ...baseSettings,
      dry_run_mode: false,
      xero_sync_endpoint: 'https://xero.example/sync',
      xero_duplicate_check_endpoint: 'https://xero.example/duplicate-check',
    };
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          is_duplicate: false,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ xero_id: 'xero_after_precheck' }),
      } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(0);
    expect(nextState.documents[0].status).toBe('synced');
    expect(nextState.documents[0].xero_id).toBe('xero_after_precheck');
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
  });

  it('uses orchestration endpoint for batch sync when configured', async () => {
    const orchestrationEndpoint = 'https://orchestrator.example/jobs';
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings: {
        ...baseSettings,
        dry_run_mode: false,
        orchestration_endpoint: orchestrationEndpoint,
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          job_id: 'job-sync-1',
          status: 'queued',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'succeeded',
          summary: {
            succeeded: 1,
            failed: 0,
            conflicted: 0,
            synced_document_ids: ['doc_1'],
          },
          state: {
            version: 2,
            documents: [
              makeDocument({
                status: 'synced',
                synced_at: '2026-02-25T10:00:00.000Z',
                xero_id: 'xero_orchestrated',
                sync_idempotency_key: 'sync-key-orchestrated',
              }),
            ],
            suppliers: [],
            settings: {
              ...baseSettings,
              dry_run_mode: false,
              orchestration_endpoint: orchestrationEndpoint,
            },
          },
        }),
      } as Response);

    const summary = await invoiceIngestionAssistantService.batchSyncToXero([
      'doc_1',
    ]);
    const nextState = readAssistantState();

    expect(summary.succeeded).toBe(1);
    expect(summary.synced_document_ids).toEqual(['doc_1']);
    expect(nextState.documents[0].status).toBe('synced');
    expect(nextState.documents[0].xero_id).toBe('xero_orchestrated');
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(2);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      orchestrationEndpoint
    );
  });

  it('generates reconciliation suggestions for synced documents', () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          document_id: 'doc_synced',
          status: 'synced',
          synced_at: '2026-02-25T10:00:00.000Z',
          review: makeReview({
            supplier_name: 'Coles',
            invoice_date: '2026-02-20',
            total: 88.5,
            currency: 'AUD',
          }),
        }),
        makeDocument({
          document_id: 'doc_pending',
          status: 'ready_to_sync',
        }),
        makeDocument({
          document_id: 'doc_reconciled',
          status: 'synced',
          reconciliation_status: 'reconciled',
          reconciled_at: '2026-02-25T12:00:00.000Z',
          reconciled_by: 'qa',
          review: makeReview({
            supplier_name: 'Bunnings',
            total: 45.2,
          }),
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const suggestions =
      invoiceIngestionAssistantService.getReconciliationSuggestions();

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.document_id).toBe('doc_synced');
    expect(suggestions[0]?.amount).toBe(88.5);
    expect(suggestions[0]?.suggestion).toContain('Match bank transaction');
  });

  it('exports security audit snapshot with masked fields', () => {
    writeAssistantState({
      version: 1,
      documents: [
        makeDocument({
          document_id: 'doc_security',
          status: 'synced',
          synced_at: '2026-02-20T10:00:00.000Z',
          sync_error:
            'Failed at https://example.com/private?token=super-secret-token-value-123456',
          review: makeReview({
            abn: '51824753556',
            drive_url: 'https://drive.example/private/doc_security',
          }),
          drive_url: 'https://drive.example/private/doc_security',
        }),
      ],
      suppliers: [],
      settings: baseSettings,
    });

    const snapshot =
      invoiceIngestionAssistantService.getSecurityAuditSnapshot();

    expect(snapshot.documents_total).toBe(1);
    expect(snapshot.redacted_documents).toBe(1);
    expect(snapshot.documents[0]?.abn_masked).toBe('51******556');
    expect(snapshot.documents[0]?.drive_url_redacted).toBe(true);
    expect(snapshot.documents[0]?.sync_error).toContain('[REDACTED_URL]');
  });

  it('runs security hardening sweep for stale synced documents', async () => {
    const oldSyncedDoc = makeDocument({
      document_id: 'doc_old_security',
      status: 'synced',
      synced_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
      review: makeReview({
        abn: '51824753556',
        drive_url: 'https://drive.example/private/old',
      }),
      drive_url: 'https://drive.example/private/old',
    });
    writeAssistantState({
      version: 1,
      documents: [oldSyncedDoc],
      suppliers: [],
      settings: {
        ...baseSettings,
        blob_retention_days: 1,
      },
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-02-25T10:00:00.000Z'));
    const summary =
      await invoiceIngestionAssistantService.runSecurityHardeningSweep();
    jest.useRealTimers();

    const nextState = readAssistantState();
    const redactedDoc = nextState.documents.find(
      item => item.document_id === 'doc_old_security'
    );

    expect(summary.stale_documents).toBe(1);
    expect(summary.blobs_removed).toBe(1);
    expect(summary.redacted_documents).toBe(1);
    expect(removeInvoiceSourceBlob).toHaveBeenCalledWith('doc_old_security');
    expect(redactedDoc?.drive_url).toBeNull();
    expect(redactedDoc?.review?.abn).toBeNull();
    expect(redactedDoc?.review?.drive_url).toBeNull();
  });

  it('requires a passphrase for encrypted security audit export', async () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings: baseSettings,
    });

    await expect(
      invoiceIngestionAssistantService.exportEncryptedSecurityAuditSnapshot('')
    ).rejects.toThrow('Passphrase is required');
  });

  it('cleans up old synced blobs after sync with retention policy', async () => {
    const oldSyncedDoc = makeDocument({
      document_id: 'doc_old',
      status: 'synced',
      synced_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
      review: makeReview(),
      sync_idempotency_key: 'old-key',
      xero_id: 'xero_old',
    });
    const readyDoc = makeDocument({
      document_id: 'doc_ready',
      status: 'ready_to_sync',
      synced_at: null,
      updated_at: '2026-02-25T00:00:00.000Z',
      review: makeReview(),
    });
    writeAssistantState({
      version: 1,
      documents: [readyDoc, oldSyncedDoc],
      suppliers: [],
      settings: {
        ...baseSettings,
        blob_retention_days: 1,
      },
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-02-25T10:00:00.000Z'));
    await invoiceIngestionAssistantService.batchSyncToXero(['doc_ready']);
    jest.useRealTimers();

    expect(removeInvoiceSourceBlob).toHaveBeenCalledWith('doc_old');
  });

  it('mirrors writes into state snapshot store', () => {
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings: baseSettings,
    });

    invoiceIngestionAssistantService.saveSettings({
      drive_root_folder: 'Invoices-Updated',
      blob_retention_days: 15,
    });

    expect(saveInvoiceAssistantStateSnapshot).toHaveBeenCalled();
  });

  it('hydrates from remote state endpoint when remote snapshot is newer', async () => {
    const remoteEndpoint = 'https://state.example/snapshot';
    writeAssistantState({
      version: 1,
      documents: [makeDocument({ document_id: 'doc_local' })],
      suppliers: [],
      settings: {
        ...baseSettings,
        state_sync_endpoint: remoteEndpoint,
      },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        state: {
          version: 3,
          documents: [makeDocument({ document_id: 'doc_remote' })],
          suppliers: [],
          settings: {
            ...baseSettings,
            state_sync_endpoint: remoteEndpoint,
          },
        },
      }),
    } as Response);

    const hydrated =
      await invoiceIngestionAssistantService.hydrateStateFromStorage();
    const persisted = readAssistantState();

    expect(hydrated.version).toBe(3);
    expect(hydrated.documents[0]?.document_id).toBe('doc_remote');
    expect(persisted.version).toBe(3);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(remoteEndpoint);
  });

  it('mirrors state writes to remote endpoint when configured', () => {
    const remoteEndpoint = 'https://state.example/snapshot';
    writeAssistantState({
      version: 1,
      documents: [makeDocument()],
      suppliers: [],
      settings: {
        ...baseSettings,
        state_sync_endpoint: remoteEndpoint,
      },
    });

    invoiceIngestionAssistantService.saveSettings({
      drive_root_folder: 'Invoices-Remote',
    });

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(remoteEndpoint);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[1]?.method).toBe('POST');
  });
});
