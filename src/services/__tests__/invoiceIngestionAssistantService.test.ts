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
  drive_archive_endpoint: null,
  ocr_extract_endpoint: null,
  xero_sync_endpoint: null,
  xero_duplicate_check_endpoint: null,
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
  abn: '12345678901',
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
      documents: [makeDocument()],
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
