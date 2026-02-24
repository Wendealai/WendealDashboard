interface OptimizedApiCallOptions<T> {
  call: () => Promise<T>;
  cacheKey?: string;
  cacheTtlMs?: number;
  rateLimitKey?: string;
  minIntervalMs?: number;
  shouldCache?: (value: T) => boolean;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const resultCache = new Map<string, CacheEntry<unknown>>();
const lastCallAt = new Map<string, number>();

const sleep = async (ms: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

const normalizeKey = (key?: string): string | undefined =>
  typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;

export const runOptimizedApiCall = async <T>(
  options: OptimizedApiCallOptions<T>
): Promise<T> => {
  const cacheKey = normalizeKey(options.cacheKey);
  const rateLimitKey = normalizeKey(options.rateLimitKey);
  const cacheTtlMs = Math.max(0, options.cacheTtlMs || 0);
  const minIntervalMs = Math.max(0, options.minIntervalMs || 0);

  if (cacheKey && cacheTtlMs > 0) {
    const cached = resultCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  if (rateLimitKey && minIntervalMs > 0) {
    const lastCall = lastCallAt.get(rateLimitKey) || 0;
    const elapsed = Date.now() - lastCall;
    if (elapsed < minIntervalMs) {
      await sleep(minIntervalMs - elapsed);
    }
  }

  const value = await options.call();
  if (rateLimitKey) {
    lastCallAt.set(rateLimitKey, Date.now());
  }

  const shouldCache = options.shouldCache ? options.shouldCache(value) : true;
  if (cacheKey && cacheTtlMs > 0 && shouldCache) {
    resultCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + cacheTtlMs,
    });
  }

  return value;
};

export const clearOptimizedApiCache = (): void => {
  resultCache.clear();
  lastCallAt.clear();
};
