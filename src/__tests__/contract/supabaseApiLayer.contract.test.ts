import {
  resetSupabaseFetchCircuit,
  supabaseFetch,
} from '@/services/sparkeryDispatch/apiLayer';

const setupSupabaseRuntimeConfig = (): void => {
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: {
      url?: string;
      anonKey?: string;
    };
  };
  runtime.__WENDEAL_SUPABASE_CONFIG__ = {
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  };
};

const asResponse = (payload: {
  ok: boolean;
  status: number;
  text: string;
}): Response =>
  ({
    ok: payload.ok,
    status: payload.status,
    text: async () => payload.text,
  }) as unknown as Response;

describe('supabase api layer contracts', () => {
  beforeEach(() => {
    setupSupabaseRuntimeConfig();
    resetSupabaseFetchCircuit();
    jest.restoreAllMocks();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  it('retries transient 5xx errors and succeeds on a later attempt', async () => {
    const fetchSpy = globalThis.fetch as unknown as jest.Mock;
    fetchSpy
      .mockResolvedValueOnce(
        asResponse({
          ok: false,
          status: 500,
          text: 'temporary_failure',
        })
      )
      .mockResolvedValueOnce(
        asResponse({
          ok: true,
          status: 200,
          text: '[]',
        })
      );

    const rows = await supabaseFetch<unknown[]>('/rest/v1/dispatch_jobs', {
      retry: {
        maxAttempts: 2,
        baseDelayMs: 1,
      },
      circuitBreaker: {
        failureThreshold: 5,
      },
    });

    expect(Array.isArray(rows)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('opens circuit breaker after configured failure threshold', async () => {
    const fetchSpy = globalThis.fetch as unknown as jest.Mock;
    fetchSpy.mockRejectedValue(new Error('network_unreachable'));

    await expect(
      supabaseFetch('/rest/v1/dispatch_jobs', {
        retry: {
          maxAttempts: 1,
        },
        circuitBreaker: {
          failureThreshold: 1,
          cooldownMs: 60000,
        },
      })
    ).rejects.toThrow('network_unreachable');

    await expect(
      supabaseFetch('/rest/v1/dispatch_jobs', {
        retry: {
          maxAttempts: 1,
        },
        circuitBreaker: {
          failureThreshold: 1,
          cooldownMs: 60000,
        },
      })
    ).rejects.toThrow('circuit breaker is open');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
