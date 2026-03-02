export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

interface SupabaseCircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
}

export interface SupabaseFetchOptions extends RequestInit {
  retry?: SupabaseRetryOptions;
  circuitBreaker?: SupabaseCircuitBreakerOptions;
}

type SupabaseRuntime = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
    anonKey?: string;
  };
  __WENDEAL_SUPABASE_FETCH_CONFIG__?: {
    retry?: SupabaseRetryOptions;
    circuitBreaker?: SupabaseCircuitBreakerOptions;
  };
};

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const runtime = globalThis as SupabaseRuntime;
  const runtimeConfig = runtime.__WENDEAL_SUPABASE_CONFIG__;
  const runtimeUrl = runtimeConfig?.url?.trim();
  const runtimeAnonKey = runtimeConfig?.anonKey?.trim();
  if (runtimeUrl && runtimeAnonKey) {
    return { url: runtimeUrl, anonKey: runtimeAnonKey };
  }

  return null;
};

const DEFAULT_RETRY_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 300;
const DEFAULT_RETRY_TIMEOUT_MS = 15000;
const DEFAULT_CB_FAILURE_THRESHOLD = 5;
const DEFAULT_CB_COOLDOWN_MS = 20000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

const sleep = async (ms: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

const isRetryableStatusCode = (status: number): boolean =>
  status === 408 || status === 425 || status === 429 || status >= 500;

const toMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return String(error || 'unknown_error');
};

const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === 'AbortError' ||
    error.message.toLowerCase().includes('aborted')
  );
};

const buildBackoffMs = (attempt: number, baseDelayMs: number): number => {
  const safeAttempt = Math.max(1, attempt);
  const exponential = baseDelayMs * 2 ** (safeAttempt - 1);
  const jitter = Math.floor(Math.random() * Math.max(75, baseDelayMs * 0.2));
  return Math.min(5000, exponential + jitter);
};

const mergeHeaders = (anonKey: string, headers?: HeadersInit): Headers => {
  const merged = new Headers(headers || {});
  if (!merged.has('apikey')) {
    merged.set('apikey', anonKey);
  }
  if (!merged.has('Authorization')) {
    merged.set('Authorization', `Bearer ${anonKey}`);
  }
  if (!merged.has('Content-Type')) {
    merged.set('Content-Type', 'application/json');
  }
  return merged;
};

const getRuntimeFetchConfig = (): {
  retry: Required<SupabaseRetryOptions>;
  circuitBreaker: Required<SupabaseCircuitBreakerOptions>;
} => {
  const runtime = globalThis as SupabaseRuntime;
  const runtimeConfig = runtime.__WENDEAL_SUPABASE_FETCH_CONFIG__;

  const retry = runtimeConfig?.retry || {};
  const circuitBreaker = runtimeConfig?.circuitBreaker || {};

  return {
    retry: {
      maxAttempts: Math.max(1, retry.maxAttempts || DEFAULT_RETRY_MAX_ATTEMPTS),
      baseDelayMs: Math.max(
        50,
        retry.baseDelayMs || DEFAULT_RETRY_BASE_DELAY_MS
      ),
      timeoutMs: Math.max(1000, retry.timeoutMs || DEFAULT_RETRY_TIMEOUT_MS),
    },
    circuitBreaker: {
      failureThreshold: Math.max(
        1,
        circuitBreaker.failureThreshold || DEFAULT_CB_FAILURE_THRESHOLD
      ),
      cooldownMs: Math.max(
        1000,
        circuitBreaker.cooldownMs || DEFAULT_CB_COOLDOWN_MS
      ),
    },
  };
};

const markSupabaseSuccess = (): void => {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
};

const markSupabaseFailure = (
  circuitBreaker: Required<SupabaseCircuitBreakerOptions>
): void => {
  consecutiveFailures += 1;
  if (consecutiveFailures >= circuitBreaker.failureThreshold) {
    circuitOpenUntil = Date.now() + circuitBreaker.cooldownMs;
  }
};

export const resetSupabaseFetchCircuit = (): void => {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
};

export const supabaseFetch = async <T>(
  path: string,
  options: SupabaseFetchOptions = {}
): Promise<T> => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase is not configured');
  }

  const runtimeFetchConfig = getRuntimeFetchConfig();
  const retryConfig = {
    ...runtimeFetchConfig.retry,
    ...(options.retry || {}),
  };
  const circuitBreakerConfig = {
    ...runtimeFetchConfig.circuitBreaker,
    ...(options.circuitBreaker || {}),
  };

  if (Date.now() < circuitOpenUntil) {
    const remainingMs = Math.max(0, circuitOpenUntil - Date.now());
    throw new Error(
      `Supabase circuit breaker is open, retry after ${Math.ceil(remainingMs / 1000)}s`
    );
  }

  const {
    retry: _ignoreRetry,
    circuitBreaker: _ignoreCircuitBreaker,
    headers,
    ...requestInit
  } = options;

  const requestUrl = `${config.url.replace(/\/$/, '')}${path}`;
  const requestCache = requestInit.cache || 'no-store';
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), retryConfig.timeoutMs);

    try {
      const response = await fetch(requestUrl, {
        ...requestInit,
        cache: requestCache,
        signal: controller.signal,
        headers: mergeHeaders(config.anonKey, headers),
      });

      if (!response.ok) {
        const details = await response.text();
        const error = new Error(
          `Supabase request failed (${response.status}): ${details || 'No details'}`
        );
        const retryable =
          isRetryableStatusCode(response.status) &&
          attempt < retryConfig.maxAttempts;
        if (retryable) {
          await sleep(buildBackoffMs(attempt, retryConfig.baseDelayMs));
          continue;
        }
        throw error;
      }

      markSupabaseSuccess();
      const rawBody = await response.text();
      if (!rawBody) {
        return [] as unknown as T;
      }
      return JSON.parse(rawBody) as T;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Supabase request failed: ${toMessage(error)}`);

      const retryableNetworkFailure =
        (isAbortError(error) ||
          toMessage(error).toLowerCase().includes('network')) &&
        attempt < retryConfig.maxAttempts;

      if (retryableNetworkFailure) {
        await sleep(buildBackoffMs(attempt, retryConfig.baseDelayMs));
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  markSupabaseFailure(circuitBreakerConfig);
  throw lastError || new Error('Supabase request failed after retry attempts');
};
