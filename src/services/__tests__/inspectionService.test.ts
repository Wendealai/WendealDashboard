import type {
  CleaningInspection,
  Employee,
} from '../../pages/CleaningInspection/types';
import {
  submitInspection,
  loadInspection,
  loadAllInspections,
  deleteInspection,
  loadPropertyTemplates,
  savePropertyTemplates,
  loadEmployees,
  saveEmployees,
} from '../inspectionService';

type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
};

describe('inspectionService (supabase)', () => {
  const originalFetch = global.fetch;
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  };

  const mockInspection = (): CleaningInspection => ({
    id: 'insp-123',
    propertyId: 'Unit 1',
    propertyAddress: '123 Test St',
    checkOutDate: '2026-02-20',
    submittedAt: '',
    sections: [],
    submitterName: 'Tester',
    status: 'pending',
    templateName: undefined,
    checkIn: null,
    checkOut: null,
    damageReports: [],
  });

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

  it('submits inspection to supabase via upsert', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'insp-123' }],
    });

    const result = await submitInspection(mockInspection());

    expect(result).toEqual({ success: true, source: 'supabase' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/cleaning_inspections?on_conflict=id'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('loads one inspection by id from supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    const inspection = mockInspection();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'insp-123', payload: inspection }],
    });

    const result = await loadInspection('insp-123');

    expect(result?.id).toBe('insp-123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/cleaning_inspections?select=*&id=eq.insp-123'
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
  });

  it('lists all inspections from supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    const first = mockInspection();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'insp-123', payload: first },
        { id: 'insp-456', payload: { ...first, id: 'insp-456' } },
      ],
    });

    const result = await loadAllInspections();

    expect(result).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/cleaning_inspections?select=*'),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
  });

  it('deletes inspection from supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    await deleteInspection('insp-123');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/cleaning_inspections?id=eq.insp-123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('loads and saves property templates in supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'prop-1', name: 'Property A', payload: {} }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'prop-1' }],
      });

    const loaded = await loadPropertyTemplates();
    await savePropertyTemplates([
      {
        id: 'prop-1',
        name: 'Property A',
        address: 'Addr',
        sections: [],
        referenceImages: {},
      },
    ]);

    expect(loaded).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        '/rest/v1/cleaning_inspection_properties?select=*'
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        '/rest/v1/cleaning_inspection_properties?on_conflict=id'
      ),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('loads and saves employees in supabase', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'emp-1', payload: {} }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'emp-1' }],
      });

    const loaded = await loadEmployees();
    await saveEmployees([
      {
        id: 'emp-1',
        name: 'Cleaner',
      } as Employee,
    ]);

    expect(loaded).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        '/rest/v1/cleaning_inspection_employees?select=*'
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        '/rest/v1/cleaning_inspection_employees?on_conflict=id'
      ),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
