import { sparkeryDispatchService } from '@/services/sparkeryDispatchService';

const setupMemoryStorage = (): void => {
  const data: Record<string, string> = {};
  const mocked = window.localStorage as unknown as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
    clear: jest.Mock;
  };

  mocked.getItem.mockImplementation((key: string) => data[key] ?? null);
  mocked.setItem.mockImplementation((key: string, value: string) => {
    data[key] = value;
  });
  mocked.removeItem.mockImplementation((key: string) => {
    delete data[key];
  });
  mocked.clear.mockImplementation(() => {
    Object.keys(data).forEach(key => delete data[key]);
  });
};

describe('dispatch service smoke', () => {
  beforeEach(() => {
    setupMemoryStorage();
    delete (globalThis as { __WENDEAL_SUPABASE_CONFIG__?: unknown })
      .__WENDEAL_SUPABASE_CONFIG__;
  });

  it('creates and reads local jobs without supabase runtime config', async () => {
    const created = await sparkeryDispatchService.createJob({
      title: 'Smoke test job',
      serviceType: 'regular',
      priority: 3,
      scheduledDate: '2026-02-24',
      scheduledStartTime: '09:00',
      scheduledEndTime: '11:00',
      customerName: 'Smoke Customer',
      customerAddress: '1 Smoke Street, Brisbane',
    });

    expect(created.id).toContain('job-');
    expect(created.pricingMode).toBe('one_time_manual');
    expect(created.feeCurrency).toBe('AUD');

    const jobs = await sparkeryDispatchService.getJobs({
      weekStart: '2026-02-24',
      weekEnd: '2026-03-02',
    });
    expect(jobs.find(job => job.id === created.id)).toBeTruthy();
  });
});
