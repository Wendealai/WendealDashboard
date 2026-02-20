import {
  createSubmission,
  listSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  type BondQuoteSubmissionPayload,
} from '../bondQuoteSubmissionService';

type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
};

describe('bondQuoteSubmissionService', () => {
  const originalFetch = global.fetch;
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  };

  const payload: BondQuoteSubmissionPayload = {
    submittedAt: '2026-02-21T10:00:00.000Z',
    formType: 'bond_clean_quote_request',
    customerName: 'Test User',
    email: 'test@example.com',
    phone: '0400000000',
    propertyAddress: 'Brisbane',
    propertyType: 'apartment',
    roomType: '2_bed_1b',
    hasCarpet: false,
    carpetRooms: 0,
    garage: false,
    glassDoorWindowCount: 0,
    oven: false,
    fridge: false,
    wallStainsCount: 0,
    acFilterCount: 0,
    blindsCount: 0,
    moldCount: 0,
    heavySoiling: false,
    rubbishRemoval: false,
    preferredDate: '2026-03-01',
    additionalNotes: '',
    status: 'new',
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

  it('creates one submission in supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'BCQ-1', payload }],
    });

    const result = await createSubmission(payload);

    expect(result.id).toBe('BCQ-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/bond_clean_quote_submissions?on_conflict=id'
      ),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('lists submissions from supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'BCQ-1', payload }],
    });

    const result = await listSubmissions();

    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe('Test User');
  });

  it('updates status in supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'BCQ-1', payload }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'BCQ-1',
            submitted_at: payload.submittedAt,
            status: 'quoted',
            payload: { ...payload, status: 'quoted' },
          },
        ],
      });

    const result = await updateSubmissionStatus('BCQ-1', 'quoted');

    expect(result.status).toBe('quoted');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/bond_clean_quote_submissions?id=eq.BCQ-1'
      ),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('deletes submission in supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    await deleteSubmission('BCQ-1');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/bond_clean_quote_submissions?id=eq.BCQ-1'
      ),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
