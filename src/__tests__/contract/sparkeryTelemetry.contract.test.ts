import {
  clearSparkeryTelemetryUserId,
  clearSparkeryTelemetryEvents,
  getSparkeryTelemetryEvents,
  setSparkeryTelemetryUserId,
  trackSparkeryEvent,
} from '@/services/sparkeryTelemetry';

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

describe('sparkery telemetry contracts', () => {
  beforeEach(() => {
    setupMemoryStorage();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    clearSparkeryTelemetryUserId();
    clearSparkeryTelemetryEvents();
  });

  it('stores telemetry events with metadata and preserves order', () => {
    trackSparkeryEvent('dispatch.job.create.succeeded', {
      success: true,
      durationMs: 120,
      data: { source: 'local', jobId: 'job-1' },
    });
    trackSparkeryEvent('dispatch.offline.enqueue', {
      data: { actionType: 'update_job_status' },
    });

    const events = getSparkeryTelemetryEvents();
    expect(events).toHaveLength(2);
    expect(events[0]?.name).toBe('dispatch.job.create.succeeded');
    expect(events[0]?.durationMs).toBe(120);
    expect(events[1]?.name).toBe('dispatch.offline.enqueue');
  });

  it('auto-enriches telemetry with userId from auth storage', () => {
    window.localStorage.setItem(
      'auth_user',
      JSON.stringify({ id: 'telemetry-user-001', name: 'QA User' })
    );

    trackSparkeryEvent('dispatch.offline.enqueue', {
      data: { actionType: 'update_job_status' },
    });

    const events = getSparkeryTelemetryEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.data?.userId).toBe('telemetry-user-001');
  });

  it('keeps explicit payload userId over inferred userId', () => {
    window.localStorage.setItem(
      'auth_user',
      JSON.stringify({ id: 'storage-user-001' })
    );

    trackSparkeryEvent('dispatch.offline.enqueue', {
      data: { actionType: 'report_location', userId: 'payload-user-001' },
    });

    const events = getSparkeryTelemetryEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.data?.userId).toBe('payload-user-001');
  });

  it('uses runtime telemetry userId when provided', () => {
    setSparkeryTelemetryUserId('runtime-user-001');

    trackSparkeryEvent('dispatch.offline.enqueue', {
      data: { actionType: 'update_job_status' },
    });

    const events = getSparkeryTelemetryEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.data?.userId).toBe('runtime-user-001');
  });
});
