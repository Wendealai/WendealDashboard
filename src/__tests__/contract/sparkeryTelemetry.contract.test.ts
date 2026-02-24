import {
  clearSparkeryTelemetryEvents,
  getSparkeryTelemetryEvents,
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
});
