import { getSupabaseConfig } from '@/services/sparkeryDispatch/apiLayer';
import type { User, UserRole } from '@/types/auth';

export interface SparkeryAuthSession {
  user: User;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

interface SupabaseAuthUser {
  id?: unknown;
  email?: unknown;
  user_metadata?: unknown;
  app_metadata?: unknown;
}

interface SupabaseAuthResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  expires_at?: unknown;
  user?: unknown;
}

const VALID_ROLES: ReadonlyArray<UserRole> = [
  'admin',
  'manager',
  'employee',
  'user',
  'guest',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRole = (value: unknown): UserRole | null => {
  const role = toNonEmptyString(value)?.toLowerCase();
  if (role && VALID_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  return null;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  const payload = parts[1];
  if (!payload) {
    return null;
  }
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const parsed = JSON.parse(atob(`${normalized}${padding}`)) as unknown;
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed token payload.
  }
  return null;
};

const deriveExpiry = (
  accessToken: string,
  expiresInRaw: unknown,
  expiresAtRaw: unknown
): string | null => {
  if (typeof expiresAtRaw === 'number' && Number.isFinite(expiresAtRaw)) {
    return new Date(expiresAtRaw * 1000).toISOString();
  }
  if (typeof expiresInRaw === 'number' && Number.isFinite(expiresInRaw)) {
    return new Date(Date.now() + expiresInRaw * 1000).toISOString();
  }
  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return new Date(exp * 1000).toISOString();
  }
  return null;
};

const deriveDisplayName = (user: SupabaseAuthUser): string => {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : {};
  const byName =
    toNonEmptyString(metadata.full_name) ||
    toNonEmptyString(metadata.display_name) ||
    toNonEmptyString(metadata.name);
  if (byName) {
    return byName;
  }
  const email = toNonEmptyString(user.email);
  if (email) {
    const localPart = email.split('@')[0]?.trim();
    if (localPart) {
      return localPart;
    }
  }
  return 'Sparkery User';
};

const deriveRole = (user: SupabaseAuthUser): UserRole => {
  const appMetadata = isRecord(user.app_metadata) ? user.app_metadata : {};
  const userMetadata = isRecord(user.user_metadata) ? user.user_metadata : {};
  return (
    normalizeRole(appMetadata.role) ||
    normalizeRole(userMetadata.role) ||
    'user'
  );
};

const buildUserFromSupabase = (payload: unknown): User => {
  const user = (isRecord(payload) ? payload : {}) as SupabaseAuthUser;
  const id = toNonEmptyString(user.id) || crypto.randomUUID();
  const email = toNonEmptyString(user.email) || `${id}@sparkery.local`;
  const displayName = deriveDisplayName(user);
  const role = deriveRole(user);
  const nowIso = new Date().toISOString();
  return {
    id,
    username: displayName,
    email,
    role,
    permissions: [],
    profile: {
      firstName: displayName,
    },
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastLoginAt: nowIso,
  };
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const raw = await response.json();
    if (isRecord(raw)) {
      return (
        toNonEmptyString(raw.msg) ||
        toNonEmptyString(raw.error_description) ||
        toNonEmptyString(raw.error) ||
        `Authentication failed (${response.status})`
      );
    }
  } catch {
    // ignore parse error
  }
  return `Authentication failed (${response.status})`;
};

const ensureCredentials = (email: string, password: string): void => {
  if (!email.trim()) {
    throw new Error('Email is required');
  }
  if (!password.trim()) {
    throw new Error('Password is required');
  }
};

const localFallbackLogin = (email: string): SparkeryAuthSession => {
  const nowIso = new Date().toISOString();
  const role: UserRole = email.toLowerCase().includes('admin')
    ? 'admin'
    : 'user';
  const fakeToken = `local.${btoa(
    JSON.stringify({
      email,
      role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    })
  )}.session`;
  return {
    user: {
      id: `local-${email.toLowerCase()}`,
      username: email.split('@')[0] || 'local-user',
      email,
      role,
      permissions: [],
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastLoginAt: nowIso,
    },
    accessToken: fakeToken,
    refreshToken: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 12 * 1000).toISOString(),
  };
};

const buildAuthHeaders = (anonKey: string): HeadersInit => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
});

export const isSupabaseAuthReady = (): boolean => Boolean(getSupabaseConfig());

export const loginWithSupabasePassword = async (
  email: string,
  password: string
): Promise<SparkeryAuthSession> => {
  ensureCredentials(email, password);
  const config = getSupabaseConfig();
  if (!config) {
    return localFallbackLogin(email.trim());
  }

  const response = await fetch(
    `${config.url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: buildAuthHeaders(config.anonKey),
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as SupabaseAuthResponse;
  const accessToken = toNonEmptyString(payload.access_token);
  if (!accessToken) {
    throw new Error('Authentication token is missing from response');
  }

  return {
    user: buildUserFromSupabase(payload.user),
    accessToken,
    refreshToken: toNonEmptyString(payload.refresh_token),
    expiresAt: deriveExpiry(accessToken, payload.expires_in, payload.expires_at),
  };
};

export const fetchSupabaseCurrentUser = async (
  accessToken: string
): Promise<User> => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase auth is not configured');
  }

  const response = await fetch(
    `${config.url.replace(/\/$/, '')}/auth/v1/user`,
    {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as unknown;
  return buildUserFromSupabase(payload);
};

export const logoutSupabaseSession = async (
  accessToken: string | null
): Promise<void> => {
  if (!accessToken) {
    return;
  }
  const config = getSupabaseConfig();
  if (!config) {
    return;
  }

  await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => {
    // Keep client-side logout resilient even if remote logout fails.
  });
};
