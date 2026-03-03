type UrlShortenerRuntimeConfig = {
  baseUrl?: string;
  apiKey?: string;
  domain?: string;
};

type SupabaseRuntimeConfig = {
  url?: string;
};

type RuntimeWithShortener = typeof globalThis & {
  __WENDEAL_URL_SHORTENER_CONFIG__?: UrlShortenerRuntimeConfig;
  __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
};

type KuttCreateResponse = {
  link?: string;
  shortLink?: string;
  shortUrl?: string;
  address?: string;
};

const SHORTENER_TIMEOUT_MS = 6000;

const pickNonEmpty = (
  ...values: Array<string | undefined>
): string | undefined => {
  for (const value of values) {
    if (!value) {
      continue;
    }
    const normalized = value.trim();
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
};

const getShortenerConfig = (): {
  baseUrl: string;
  apiKey: string;
  domain?: string;
} | null => {
  const runtime = globalThis as RuntimeWithShortener;
  const runtimeConfig = runtime.__WENDEAL_URL_SHORTENER_CONFIG__;
  const baseUrl = pickNonEmpty(
    runtimeConfig?.baseUrl,
    import.meta.env.VITE_URL_SHORTENER_BASE_URL,
    import.meta.env.VITE_KUTT_BASE_URL
  );
  const apiKey = pickNonEmpty(
    runtimeConfig?.apiKey,
    import.meta.env.VITE_URL_SHORTENER_API_KEY,
    import.meta.env.VITE_KUTT_API_KEY
  );
  const domain = pickNonEmpty(
    runtimeConfig?.domain,
    import.meta.env.VITE_URL_SHORTENER_DOMAIN,
    import.meta.env.VITE_KUTT_DOMAIN
  );

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    ...(domain ? { domain } : {}),
  };
};

const getSparkeryApiBaseUrl = (): string | null => {
  const runtime = globalThis as RuntimeWithShortener;
  const supabaseUrl = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  if (!supabaseUrl) {
    return null;
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/sparkery-api`;
};

const getPreferredShortDomain = (): string | undefined => {
  const runtime = globalThis as RuntimeWithShortener;
  const runtimeConfig = runtime.__WENDEAL_URL_SHORTENER_CONFIG__;
  return pickNonEmpty(
    runtimeConfig?.domain,
    import.meta.env.VITE_URL_SHORTENER_DOMAIN,
    import.meta.env.VITE_KUTT_DOMAIN
  );
};

const resolveShortUrl = (
  response: KuttCreateResponse,
  baseUrl?: string
): string | null => {
  if (typeof response.link === 'string' && response.link.trim()) {
    return response.link.trim();
  }
  if (typeof response.shortLink === 'string' && response.shortLink.trim()) {
    return response.shortLink.trim();
  }
  if (typeof response.shortUrl === 'string' && response.shortUrl.trim()) {
    return response.shortUrl.trim();
  }
  if (
    baseUrl &&
    typeof response.address === 'string' &&
    response.address.trim()
  ) {
    return `${baseUrl}/${response.address.trim()}`;
  }
  return null;
};

const createSparkeryProxyShortLink = async (
  longUrl: string,
  options?: { description?: string }
): Promise<string> => {
  const apiBaseUrl = getSparkeryApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Sparkery API base URL is not configured');
  }

  const preferredDomain = getPreferredShortDomain();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    SHORTENER_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${apiBaseUrl}/sparkery/v1/short-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: longUrl,
        ...(preferredDomain ? { domain: preferredDomain } : {}),
        ...(options?.description ? { description: options.description } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Sparkery short-link proxy failed with status ${response.status}`
      );
    }

    const payload = (await response.json()) as KuttCreateResponse;
    const shortUrl = resolveShortUrl(payload);
    if (!shortUrl) {
      throw new Error('Sparkery short-link proxy returned no short URL');
    }
    return shortUrl;
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

const createKuttShortLink = async (
  longUrl: string,
  options?: { description?: string }
): Promise<string> => {
  const config = getShortenerConfig();
  if (!config) {
    return longUrl;
  }

  const attemptShorten = async (domain?: string): Promise<string> => {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      SHORTENER_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${config.baseUrl}/api/v2/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify({
          target: longUrl,
          reuse: true,
          ...(domain ? { domain } : {}),
          ...(options?.description ? { description: options.description } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Kutt shorten failed with status ${response.status}`);
      }

      const payload = (await response.json()) as KuttCreateResponse;
      const shortUrl = resolveShortUrl(payload, config.baseUrl);
      if (!shortUrl) {
        throw new Error('Kutt shorten succeeded but no short URL returned');
      }
      return shortUrl;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  };

  const attemptDomains = config.domain
    ? [config.domain, undefined]
    : [undefined];
  let lastError: Error | null = null;
  for (const domain of attemptDomains) {
    try {
      return await attemptShorten(domain);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Kutt shorten failed');
    }
  }

  throw lastError || new Error('Kutt shorten failed');
};

export const shortenUrlIfConfigured = async (
  longUrl: string,
  options?: { description?: string }
): Promise<string> => {
  try {
    return await createSparkeryProxyShortLink(longUrl, options);
  } catch {
    // Fall through to client-side direct mode.
  }

  try {
    return await createKuttShortLink(longUrl, options);
  } catch {
    return longUrl;
  }
};
