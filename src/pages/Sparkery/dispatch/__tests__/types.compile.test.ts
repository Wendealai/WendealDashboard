import type { DispatchJob } from '../types';

describe('dispatch types', () => {
  it('DispatchJob requires core scheduling fields', () => {
    const job: DispatchJob = {
      id: 'job-1',
      title: 'Bond clean',
      serviceType: 'bond',
      status: 'pending',
      priority: 3,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '09:00',
      scheduledEndTime: '12:00',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
    };

    expect(job.title).toBe('Bond clean');
  });
});
