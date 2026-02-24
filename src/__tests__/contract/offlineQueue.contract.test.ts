import {
  enqueueDispatchOfflineAction,
  flushDispatchOfflineQueue,
  getDispatchOfflineQueue,
  clearDispatchOfflineQueue,
  getDispatchOfflineDeadLetterQueue,
  clearDispatchOfflineDeadLetterQueue,
} from '@/pages/Sparkery/dispatch/offlineQueue';

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

describe('dispatch offline queue contracts', () => {
  beforeEach(() => {
    setupMemoryStorage();
    clearDispatchOfflineQueue();
    clearDispatchOfflineDeadLetterQueue();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('keeps only latest status action per job id', () => {
    enqueueDispatchOfflineAction({
      type: 'update_job_status',
      payload: { jobId: 'job-1', status: 'assigned' },
    });
    enqueueDispatchOfflineAction({
      type: 'update_job_status',
      payload: { jobId: 'job-1', status: 'completed' },
    });

    const queue = getDispatchOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe('update_job_status');
    if (queue[0]?.type === 'update_job_status') {
      expect(queue[0].payload.status).toBe('completed');
    }
  });

  it('moves terminal failures into dead letter queue after max retries', async () => {
    enqueueDispatchOfflineAction({
      type: 'update_job_status',
      payload: { jobId: 'job-2', status: 'assigned' },
    });

    const result = await flushDispatchOfflineQueue(
      {
        updateJobStatus: async () => {
          throw new Error('forced failure');
        },
        reportEmployeeLocation: async () => {},
      },
      {
        maxRetries: 1,
        stopOnNetworkError: false,
      }
    );

    expect(result.deadLettered).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getDispatchOfflineDeadLetterQueue()).toHaveLength(1);
  });
});
