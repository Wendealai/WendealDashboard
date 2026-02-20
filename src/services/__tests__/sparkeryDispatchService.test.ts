import { sparkeryDispatchService } from '../sparkeryDispatchService';

type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
};

describe('sparkeryDispatchService', () => {
  const originalFetch = global.fetch;
  const originalLocalStorage = global.localStorage;
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  };

  beforeEach(() => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: jest.fn((key: string) => storage.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
      }),
      clear: jest.fn(() => {
        storage.clear();
      }),
      key: jest.fn(
        (index: number) => Array.from(storage.keys())[index] ?? null
      ),
      get length() {
        return storage.size;
      },
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    localStorage.clear();
    delete runtime.__WENDEAL_SUPABASE_CONFIG__;
    global.fetch = originalFetch;
  });

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  it('creates a job with generated id', async () => {
    const job = await sparkeryDispatchService.createJob({
      title: 'Bond clean - Unit 12',
      serviceType: 'bond',
      priority: 2,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '09:00',
      scheduledEndTime: '12:00',
    });

    expect(job.id).toBeTruthy();
    expect(job.status).toBe('pending');
  });

  it('lists jobs in week range', async () => {
    await sparkeryDispatchService.createJob({
      title: 'Inside week',
      serviceType: 'airbnb',
      priority: 3,
      scheduledDate: '2026-02-21',
      scheduledStartTime: '10:00',
      scheduledEndTime: '12:00',
    });
    await sparkeryDispatchService.createJob({
      title: 'Outside week',
      serviceType: 'regular',
      priority: 4,
      scheduledDate: '2026-03-01',
      scheduledStartTime: '10:00',
      scheduledEndTime: '12:00',
    });

    const jobs = await sparkeryDispatchService.getJobs({
      weekStart: '2026-02-16',
      weekEnd: '2026-02-22',
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Inside week');
  });

  it('assigns employee and sets status assigned', async () => {
    const employees = await sparkeryDispatchService.getEmployees();
    const created = await sparkeryDispatchService.createJob({
      title: 'Assign me',
      serviceType: 'bond',
      priority: 1,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '08:00',
      scheduledEndTime: '10:00',
    });

    const updated = await sparkeryDispatchService.assignJob(
      created.id,
      employees[0].id
    );

    expect(updated.assignedEmployeeIds).toContain(employees[0].id);
    expect(updated.status).toBe('assigned');
  });

  it('updates status and persists value', async () => {
    const created = await sparkeryDispatchService.createJob({
      title: 'Status update',
      serviceType: 'commercial',
      priority: 5,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '13:00',
      scheduledEndTime: '15:00',
    });

    await sparkeryDispatchService.updateJobStatus(created.id, 'completed');
    const jobs = await sparkeryDispatchService.getJobs();

    expect(jobs.find(j => j.id === created.id)?.status).toBe('completed');
  });

  it('deletes job from collection', async () => {
    const created = await sparkeryDispatchService.createJob({
      title: 'Delete me',
      serviceType: 'regular',
      priority: 3,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '09:00',
      scheduledEndTime: '10:00',
    });

    await sparkeryDispatchService.deleteJob(created.id);
    const jobs = await sparkeryDispatchService.getJobs();

    expect(jobs.find(j => j.id === created.id)).toBeUndefined();
  });

  it('exports and imports backup JSON', async () => {
    await sparkeryDispatchService.createJob({
      title: 'Backup job',
      serviceType: 'regular',
      priority: 2,
      scheduledDate: '2026-03-10',
      scheduledStartTime: '09:00',
      scheduledEndTime: '11:00',
    });

    const backup = await sparkeryDispatchService.exportBackup();
    localStorage.clear();
    await sparkeryDispatchService.importBackup(backup);

    const jobs = await sparkeryDispatchService.getJobs();
    expect(jobs.some(job => job.title === 'Backup job')).toBe(true);
  });

  it('migrates local employees and customers to Supabase', async () => {
    await sparkeryDispatchService.upsertCustomerProfile({
      name: 'Migrated Customer',
      address: 'Brisbane',
    });

    await sparkeryDispatchService.createJob({
      title: 'Migrated local job',
      serviceType: 'regular',
      priority: 2,
      scheduledDate: '2026-03-08',
      scheduledStartTime: '10:00',
      scheduledEndTime: '12:00',
    });

    runtime.__WENDEAL_SUPABASE_CONFIG__ = {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    };

    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    global.fetch = fetchMock;

    const result = await sparkeryDispatchService.migrateLocalPeopleToSupabase();

    expect(result.employees).toBeGreaterThan(0);
    expect(result.jobs).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_employees?on_conflict=id'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/dispatch_customer_profiles?on_conflict=id'
      ),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/dispatch_jobs?on_conflict=id'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
