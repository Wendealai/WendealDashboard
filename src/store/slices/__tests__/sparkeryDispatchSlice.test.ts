import reducer, {
  clearDispatchError,
  createDispatchJob,
  setFilters,
  type SparkeryDispatchState,
} from '../sparkeryDispatchSlice';

describe('sparkeryDispatchSlice', () => {
  const initial = reducer(undefined, {
    type: 'unknown',
  }) as SparkeryDispatchState;

  it('has expected initial state', () => {
    expect(initial.jobs).toEqual([]);
    expect(initial.employees).toEqual([]);
    expect(initial.isLoading).toBe(false);
    expect(initial.error).toBeNull();
  });

  it('handles createDispatchJob fulfilled', () => {
    const action = {
      type: createDispatchJob.fulfilled.type,
      payload: {
        id: 'job-1',
        title: 'Bond clean',
        serviceType: 'bond',
        status: 'pending',
        priority: 2,
        scheduledDate: '2026-02-20',
        scheduledStartTime: '09:00',
        scheduledEndTime: '12:00',
        createdAt: '2026-02-19T00:00:00.000Z',
        updatedAt: '2026-02-19T00:00:00.000Z',
      },
    };

    const next = reducer(initial, action);
    expect(next.jobs).toHaveLength(1);
    expect(next.jobs[0]?.id).toBe('job-1');
  });

  it('handles filter update and clear error', () => {
    const withFilter = reducer(
      initial,
      setFilters({ status: 'pending', serviceType: 'bond' })
    );

    expect(withFilter.filters.status).toBe('pending');
    const withError = { ...withFilter, error: 'boom' } as SparkeryDispatchState;
    const cleared = reducer(withError, clearDispatchError());
    expect(cleared.error).toBeNull();
  });
});
