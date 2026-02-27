import {
  buildDispatchJobLinkUrl,
  parseDispatchJobIdsFromParams,
} from '../weeklyPlanLink';

const buildContextFromUrl = (url: string) => {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  return {
    params,
    context: {
      employeeId: (params.get('employeeId') || '').trim(),
      weekStart: (params.get('weekStart') || '').trim(),
      weekEnd: (params.get('weekEnd') || '').trim(),
    },
  };
};

describe('weeklyPlanLink', () => {
  it('builds compact params and parses them back', () => {
    const url = buildDispatchJobLinkUrl({
      origin: 'https://example.com',
      path: '/dispatch-week-plan',
      employeeId: 'emp-1',
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
      jobIds: ['job-1', 'job-2', 'job-1'],
      nowMs: 1000,
      ttlMs: 60000,
    });

    const { params, context } = buildContextFromUrl(url);
    const parsed = parseDispatchJobIdsFromParams(params, context, 2000);

    expect(params.get('j')).toBeTruthy();
    expect(params.get('sig')).toBeTruthy();
    expect(params.get('exp')).toBeTruthy();
    expect(params.get('jobIds')).toBeNull();
    expect(parsed.source).toBe('compact');
    expect(parsed.jobIds).toEqual(['job-1', 'job-2']);
    expect(parsed.compact.present).toBe(true);
    expect(parsed.compact.payloadValid).toBe(true);
    expect(parsed.compact.signatureValid).toBe(true);
    expect(parsed.compact.versionValid).toBe(true);
    expect(parsed.compact.expired).toBe(false);
  });

  it('marks compact link as expired when exp is in the past', () => {
    const url = buildDispatchJobLinkUrl({
      origin: 'https://example.com',
      path: '/dispatch-week-plan',
      employeeId: 'emp-1',
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
      jobIds: ['job-1'],
      nowMs: 1000,
      ttlMs: 10,
    });

    const { params, context } = buildContextFromUrl(url);
    const parsed = parseDispatchJobIdsFromParams(params, context, 2000);

    expect(parsed.source).toBe('none');
    expect(parsed.jobIds).toEqual([]);
    expect(parsed.compact.present).toBe(true);
    expect(parsed.compact.expired).toBe(true);
  });

  it('falls back to none when compact signature is invalid', () => {
    const url = buildDispatchJobLinkUrl({
      origin: 'https://example.com',
      path: '/dispatch-week-plan',
      employeeId: 'emp-1',
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
      jobIds: ['job-1'],
      nowMs: 1000,
      ttlMs: 60000,
    });
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('sig', 'tampered-signature');

    const params = parsedUrl.searchParams;
    const parsed = parseDispatchJobIdsFromParams(
      params,
      {
        employeeId: (params.get('employeeId') || '').trim(),
        weekStart: (params.get('weekStart') || '').trim(),
        weekEnd: (params.get('weekEnd') || '').trim(),
      },
      2000
    );

    expect(parsed.source).toBe('none');
    expect(parsed.jobIds).toEqual([]);
    expect(parsed.compact.present).toBe(true);
    expect(parsed.compact.signatureValid).toBe(false);
  });

  it('parses legacy jobIds csv when compact params are absent', () => {
    const params = new URLSearchParams({
      employeeId: 'emp-1',
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
      jobIds: 'job-1,job-2,job-1',
    });
    const parsed = parseDispatchJobIdsFromParams(params, {
      employeeId: 'emp-1',
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
    });

    expect(parsed.source).toBe('legacy');
    expect(parsed.jobIds).toEqual(['job-1', 'job-2']);
    expect(parsed.compact.present).toBe(false);
  });

  it('falls back to legacy jobIds when compact payload is invalid', () => {
    const url = buildDispatchJobLinkUrl({
      origin: 'https://example.com',
      path: '/dispatch-week-plan',
      employeeId: 'emp-1',
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
      jobIds: ['job-1'],
      nowMs: 1000,
      ttlMs: 60000,
      includeLegacyJobIds: true,
    });
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('j', 'invalid-compact-payload');

    const params = parsedUrl.searchParams;
    const parsed = parseDispatchJobIdsFromParams(
      params,
      {
        employeeId: (params.get('employeeId') || '').trim(),
        weekStart: (params.get('weekStart') || '').trim(),
        weekEnd: (params.get('weekEnd') || '').trim(),
      },
      2000
    );

    expect(parsed.source).toBe('legacy');
    expect(parsed.jobIds).toEqual(['job-1']);
    expect(parsed.compact.present).toBe(true);
    expect(parsed.compact.payloadValid).toBe(false);
  });
});
