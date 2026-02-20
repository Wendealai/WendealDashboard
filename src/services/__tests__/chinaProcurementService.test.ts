import {
  loadDraftIndex,
  saveDraft,
  loadDraftData,
  deleteDraft,
  renameDraft,
  getDailySequence,
} from '../chinaProcurementService';

type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
};

describe('chinaProcurementService', () => {
  const originalFetch = global.fetch;
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  };

  beforeEach(() => {
    runtime.__WENDEAL_SUPABASE_CONFIG__ = {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete runtime.__WENDEAL_SUPABASE_CONFIG__;
    global.fetch = originalFetch;
  });

  it('loads draft index list from supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'd1',
          meta_name: 'Draft 1',
          meta_supplier_name: 'Supplier',
          meta_product_name: 'Product',
          created_at: '2026-02-20 10:00:00',
          updated_at: '2026-02-20 11:00:00',
          image_count: 3,
          item_count: 2,
          progress: 20,
        },
      ],
    });

    const result = await loadDraftIndex();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/china_procurement_drafts?select=*'),
      expect.any(Object)
    );
  });

  it('saves one draft by upsert', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'd1' }],
    });

    await saveDraft({
      meta: {
        id: 'd1',
        name: 'Draft 1',
        supplierName: 'Supplier',
        productName: 'Product',
        createdAt: '2026-02-20 10:00:00',
        updatedAt: '2026-02-20 11:00:00',
        imageCount: 3,
        itemCount: 2,
        progress: 30,
      },
      currentRecord: {
        supplierName: 'Supplier',
      },
      purchaseItems: [],
      gstEnabled: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/china_procurement_drafts?on_conflict=id'
      ),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('loads full draft data by id', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'd1',
          meta_name: 'Draft 1',
          meta_supplier_name: 'Supplier',
          meta_product_name: 'Product',
          created_at: '2026-02-20 10:00:00',
          updated_at: '2026-02-20 11:00:00',
          image_count: 3,
          item_count: 2,
          progress: 30,
          record_payload: { supplierName: 'Supplier' },
          purchase_items: [
            { id: 'i1', productName: 'A', unitPrice: 1, quantity: 1 },
          ],
          gst_enabled: true,
        },
      ],
    });

    const draft = await loadDraftData('d1');

    expect(draft?.meta.id).toBe('d1');
    expect(draft?.purchaseItems).toHaveLength(1);
  });

  it('renames and deletes draft', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'd1', meta_name: 'Old' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'd1' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    await renameDraft('d1', 'New Name');
    await deleteDraft('d1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/china_procurement_drafts?id=eq.d1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('increments daily sequence in supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ seq: 1 }] });

    const seq = await getDailySequence('20260220');

    expect(seq).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/china_procurement_daily_sequences'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
