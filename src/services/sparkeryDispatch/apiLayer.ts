export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

type SupabaseRuntime = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
    anonKey?: string;
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

export const supabaseFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase is not configured');
  }

  const requestUrl = `${config.url.replace(/\/$/, '')}${path}`;
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${details || 'No details'}`
    );
  }

  return (await response.json()) as T;
};
