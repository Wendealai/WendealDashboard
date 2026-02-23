import { sparkeryDispatchService } from '../../services/sparkeryDispatchService';

type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
};

describe('sparkeryDispatchService Supabase integration', () => {
  const originalFetch = global.fetch;
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  };

  beforeEach(() => {
    runtime.__WENDEAL_SUPABASE_CONFIG__ = {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    };
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete runtime.__WENDEAL_SUPABASE_CONFIG__;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('loads employees from Supabase when configured', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'emp-99',
            name: 'Remote User',
            name_cn: 'Remote CN',
            phone: '0400 111 222',
            skills: ['bond'],
            status: 'available',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const result = await sparkeryDispatchService.getEmployees();

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_employees?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_employee_locations?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/cleaning_inspection_employees?select=*'
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
    expect(result[0]).toMatchObject({
      id: 'emp-99',
      name: 'Remote User',
      nameCN: 'Remote CN',
      status: 'available',
    });
  });

  it('upserts customer profile to Supabase when configured', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'customer-1',
          name: 'ACME',
          address: 'Brisbane',
          phone: '0400 888 999',
          default_job_title: null,
          default_description: null,
          default_notes: null,
          recurring_enabled: false,
          recurring_weekday: null,
          recurring_start_time: null,
          recurring_end_time: null,
          recurring_service_type: null,
          recurring_priority: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const result = await sparkeryDispatchService.upsertCustomerProfile({
      name: 'ACME',
      address: 'Brisbane',
      phone: '0400 888 999',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/dispatch_customer_profiles?on_conflict=id'
      ),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Prefer: expect.stringContaining('resolution=merge-duplicates'),
        }),
      })
    );
    expect(result).toMatchObject({
      id: 'customer-1',
      name: 'ACME',
      address: 'Brisbane',
    });
  });

  it('creates and loads jobs from Supabase when configured', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'job-1',
            title: 'Cloud Job',
            description: null,
            notes: null,
            image_urls: null,
            customer_profile_id: null,
            customer_name: null,
            customer_address: null,
            customer_phone: null,
            service_type: 'regular',
            property_type: null,
            estimated_duration_hours: null,
            status: 'pending',
            priority: 3,
            scheduled_date: '2026-01-10',
            scheduled_start_time: '09:00',
            scheduled_end_time: '11:00',
            assigned_employee_ids: [],
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'job-1',
            title: 'Cloud Job',
            description: null,
            notes: null,
            image_urls: null,
            customer_profile_id: null,
            customer_name: null,
            customer_address: null,
            customer_phone: null,
            service_type: 'regular',
            property_type: null,
            estimated_duration_hours: null,
            status: 'pending',
            priority: 3,
            scheduled_date: '2026-01-10',
            scheduled_start_time: '09:00',
            scheduled_end_time: '11:00',
            assigned_employee_ids: [],
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

    await sparkeryDispatchService.createJob({
      title: 'Cloud Job',
      serviceType: 'regular',
      priority: 3,
      scheduledDate: '2026-01-10',
      scheduledStartTime: '09:00',
      scheduledEndTime: '11:00',
    });
    const jobs = await sparkeryDispatchService.getJobs({
      weekStart: '2026-01-06',
      weekEnd: '2026-01-12',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_jobs?on_conflict=id'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_jobs?select='),
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
        }),
      })
    );
    const createCallBody = (global.fetch as jest.Mock).mock.calls[0]?.[1]?.body;
    const createRows = JSON.parse(String(createCallBody || '[]')) as Array<
      Record<string, unknown>
    >;
    expect(createRows[0]).not.toHaveProperty('payment_received_at');
    expect(createRows[0]).not.toHaveProperty('payment_received_by');
    expect(jobs[0]).toMatchObject({
      id: 'job-1',
      title: 'Cloud Job',
      serviceType: 'regular',
    });
  });

  it('updates status without sending unrelated payment fields', async () => {
    const baseRow = {
      id: 'job-1',
      title: 'Cloud Job',
      description: null,
      notes: null,
      image_urls: null,
      customer_profile_id: null,
      customer_name: null,
      customer_address: null,
      customer_phone: null,
      service_type: 'regular',
      property_type: null,
      estimated_duration_hours: null,
      status: 'pending',
      priority: 3,
      scheduled_date: '2026-01-10',
      scheduled_start_time: '09:00',
      scheduled_end_time: '11:00',
      assigned_employee_ids: [],
      pricing_mode: 'one_time_manual',
      fee_currency: 'AUD',
      base_fee: 120,
      manual_adjustment: 0,
      receivable_total: 120,
      finance_confirmed_at: null,
      finance_confirmed_by: null,
      finance_locked_at: null,
      finance_lock_reason: null,
      payment_received_at: null,
      payment_received_by: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [baseRow],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [baseRow],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            ...baseRow,
            status: 'completed',
          },
        ],
      });

    await sparkeryDispatchService.updateJobStatus('job-1', 'completed');

    const patchCallBody = (global.fetch as jest.Mock).mock.calls[2]?.[1]?.body;
    const patchPayload = JSON.parse(String(patchCallBody || '{}')) as Record<
      string,
      unknown
    >;
    expect(patchPayload.status).toBe('completed');
    expect(patchPayload).toHaveProperty('updated_at');
    expect(patchPayload).not.toHaveProperty('payment_received_at');
    expect(patchPayload).not.toHaveProperty('payment_received_by');
  });

  it('falls back to non-payment select when payment tracking columns are missing', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            code: 'PGRST204',
            message:
              "Could not find the 'payment_received_at' column of 'dispatch_jobs' in the schema cache",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'job-legacy',
            title: 'Legacy Job',
            description: null,
            notes: null,
            image_urls: null,
            customer_profile_id: null,
            customer_name: null,
            customer_address: null,
            customer_phone: null,
            service_type: 'regular',
            property_type: null,
            estimated_duration_hours: null,
            status: 'pending',
            priority: 3,
            scheduled_date: '2026-01-10',
            scheduled_start_time: '09:00',
            scheduled_end_time: '11:00',
            assigned_employee_ids: [],
            pricing_mode: 'one_time_manual',
            fee_currency: 'AUD',
            base_fee: 90,
            manual_adjustment: 0,
            receivable_total: 90,
            finance_confirmed_at: null,
            finance_confirmed_by: null,
            finance_locked_at: null,
            finance_lock_reason: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

    const jobs = await sparkeryDispatchService.getJobs({
      weekStart: '2026-01-06',
      weekEnd: '2026-01-12',
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(jobs[0]).toMatchObject({
      id: 'job-legacy',
      receivableTotal: 90,
    });
  });

  it('auto-creates missing dispatch employee when reporting location hits FK error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () =>
          JSON.stringify({
            code: '23503',
            details: 'Key is not present in table "dispatch_employees".',
            message:
              'insert or update on table "dispatch_employee_locations" violates foreign key constraint "dispatch_employee_locations_employee_id_fkey"',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'emp-1',
            name: 'Alex Chen',
            name_cn: 'Alex CN',
            phone: null,
            skills: ['regular'],
            status: 'available',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            employee_id: 'emp-1',
            lat: -27.47,
            lng: 153.02,
            accuracy_m: 12,
            source: 'gps',
            label: null,
            updated_at: '2026-02-21T10:00:00.000Z',
          },
        ],
      });

    const result = await sparkeryDispatchService.reportEmployeeLocation(
      'emp-1',
      {
        lat: -27.47,
        lng: 153.02,
        source: 'gps',
        accuracyM: 12,
      }
    );

    expect(result).toMatchObject({
      lat: -27.47,
      lng: 153.02,
      source: 'gps',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/dispatch_employee_locations?on_conflict=employee_id'
      ),
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/dispatch_employees?select=*&id=eq.emp-1'
      ),
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: 'anon-key' }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_employees?on_conflict=id'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
