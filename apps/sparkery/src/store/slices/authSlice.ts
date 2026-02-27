import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/auth';
import {
  fetchSupabaseCurrentUser,
  isSupabaseAuthReady,
  loginWithSupabasePassword,
  logoutSupabaseSession,
} from '@/services/sparkeryAuthService';
import {
  resolveWorkspaceRoleForUser,
  syncCurrentUserWorkspaceMembership,
} from '@/services/sparkeryWorkspaceUserService';

const AUTH_USER_KEYS = ['auth_user', 'wendeal_user_info'] as const;
const AUTH_TOKEN_KEYS = ['auth_token', 'wendeal_auth_token'] as const;
const AUTH_REFRESH_TOKEN_KEYS = ['auth_refresh_token'] as const;
const AUTH_SESSION_EXPIRY_KEYS = ['auth_session_expiry'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = <T>(keys: readonly string[]): T | null => {
  try {
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) {
        continue;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (parsed !== null && parsed !== undefined) {
        return parsed as T;
      }
    }
  } catch {
    // ignore malformed local storage payloads
  }
  return null;
};

const readString = (keys: readonly string[]): string | null => {
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }
    const normalized = raw.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return null;
};

const parseTokenPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  const payload = parts.length >= 2 ? parts[1] : token;
  if (!payload) {
    return null;
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const decoded = atob(`${normalized}${padding}`);
    const parsed = JSON.parse(decoded) as unknown;
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    // ignore invalid token payload
  }
  return null;
};

const deriveSessionExpiry = (token: string | null): string | null => {
  if (!token) {
    return null;
  }
  const payload = parseTokenPayload(token);
  const exp = payload?.exp;
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return new Date(exp * 1000).toISOString();
  }
  return null;
};

const isExpired = (sessionExpiry: string | null): boolean => {
  if (!sessionExpiry) {
    return false;
  }
  const parsed = Date.parse(sessionExpiry);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return parsed <= Date.now();
};

const persistAuth = (state: {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  sessionExpiry: string | null;
}): void => {
  if (state.user) {
    const userRaw = JSON.stringify(state.user);
    AUTH_USER_KEYS.forEach(key => localStorage.setItem(key, userRaw));
  } else {
    AUTH_USER_KEYS.forEach(key => localStorage.removeItem(key));
  }

  if (state.token) {
    AUTH_TOKEN_KEYS.forEach(key => localStorage.setItem(key, state.token as string));
  } else {
    AUTH_TOKEN_KEYS.forEach(key => localStorage.removeItem(key));
  }

  if (state.refreshToken) {
    AUTH_REFRESH_TOKEN_KEYS.forEach(key =>
      localStorage.setItem(key, state.refreshToken as string)
    );
  } else {
    AUTH_REFRESH_TOKEN_KEYS.forEach(key => localStorage.removeItem(key));
  }

  if (state.sessionExpiry) {
    AUTH_SESSION_EXPIRY_KEYS.forEach(key =>
      localStorage.setItem(key, state.sessionExpiry as string)
    );
  } else {
    AUTH_SESSION_EXPIRY_KEYS.forEach(key => localStorage.removeItem(key));
  }
};

const clearPersistedAuth = (): void => {
  [...AUTH_USER_KEYS, ...AUTH_TOKEN_KEYS, ...AUTH_REFRESH_TOKEN_KEYS, ...AUTH_SESSION_EXPIRY_KEYS].forEach(
    key => localStorage.removeItem(key)
  );
};

export interface AuthSliceState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  sessionExpiry: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initState = (): AuthSliceState => {
  const user = readJson<User>(AUTH_USER_KEYS);
  const token = readString(AUTH_TOKEN_KEYS);
  const refreshToken = readString(AUTH_REFRESH_TOKEN_KEYS);
  const persistedExpiry = readString(AUTH_SESSION_EXPIRY_KEYS);
  const sessionExpiry = persistedExpiry || deriveSessionExpiry(token);
  const validSession = Boolean(user && token && !isExpired(sessionExpiry));
  return {
    user: validSession ? user : null,
    token: validSession ? token : null,
    refreshToken: validSession ? refreshToken : null,
    sessionExpiry: validSession ? sessionExpiry : null,
    isAuthenticated: validSession,
    isInitializing: false,
    isSubmitting: false,
    error: null,
  };
};

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResolvedPayload {
  user: User;
  token: string;
  refreshToken: string | null;
  sessionExpiry: string | null;
}

export const initializeAuthSession = createAsyncThunk<
  AuthResolvedPayload | null,
  void,
  { rejectValue: string }
>('auth/initializeAuthSession', async (_: void, { rejectWithValue }) => {
  const user = readJson<User>(AUTH_USER_KEYS);
  const token = readString(AUTH_TOKEN_KEYS);
  const refreshToken = readString(AUTH_REFRESH_TOKEN_KEYS);
  const persistedExpiry = readString(AUTH_SESSION_EXPIRY_KEYS);
  const sessionExpiry = persistedExpiry || deriveSessionExpiry(token);

  if (!user || !token || isExpired(sessionExpiry)) {
    clearPersistedAuth();
    return null;
  }

  if (!isSupabaseAuthReady()) {
    return {
      user,
      token,
      refreshToken,
      sessionExpiry,
    };
  }

  try {
    const remoteUser = await fetchSupabaseCurrentUser(token);
    const resolvedRole = await resolveWorkspaceRoleForUser(remoteUser, {
      accessToken: token,
    });
    const normalizedUser: User = {
      ...remoteUser,
      role: resolvedRole,
      lastLoginAt: remoteUser.lastLoginAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await syncCurrentUserWorkspaceMembership(normalizedUser, {
      accessToken: token,
    });
    return {
      user: normalizedUser,
      token,
      refreshToken,
      sessionExpiry: sessionExpiry || deriveSessionExpiry(token),
    };
  } catch (error) {
    clearPersistedAuth();
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to initialize session'
    );
  }
});

export const loginWithPassword = createAsyncThunk<
  AuthResolvedPayload,
  LoginPayload,
  { rejectValue: string }
>('auth/loginWithPassword', async (payload, { rejectWithValue }) => {
  try {
    const session = await loginWithSupabasePassword(payload.email, payload.password);
    const resolvedRole = await resolveWorkspaceRoleForUser(session.user, {
      accessToken: session.accessToken,
    });
    const nextUser: User = {
      ...session.user,
      role: resolvedRole,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: session.user.createdAt || new Date().toISOString(),
    };
    await syncCurrentUserWorkspaceMembership(nextUser, {
      accessToken: session.accessToken,
    });
    return {
      user: nextUser,
      token: session.accessToken,
      refreshToken: session.refreshToken,
      sessionExpiry: session.expiresAt || deriveSessionExpiry(session.accessToken),
    };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Sign in failed'
    );
  }
});

export const logout = createAsyncThunk<void, void, { state: { auth: AuthSliceState } }>(
  'auth/logout',
  async (_: void, { getState }) => {
    const token = getState().auth.token;
    await logoutSupabaseSession(token);
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: initState(),
  reducers: {
    setAuthUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload && state.token);
      persistAuth({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        sessionExpiry: state.sessionExpiry,
      });
    },
    setAuthToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
      state.sessionExpiry = deriveSessionExpiry(action.payload);
      state.isAuthenticated = Boolean(state.user && action.payload);
      persistAuth({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        sessionExpiry: state.sessionExpiry,
      });
    },
    syncAuthFromStorage(state) {
      const next = initState();
      state.user = next.user;
      state.token = next.token;
      state.refreshToken = next.refreshToken;
      state.sessionExpiry = next.sessionExpiry;
      state.isAuthenticated = next.isAuthenticated;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(initializeAuthSession.pending, state => {
        state.isInitializing = true;
        state.error = null;
      })
      .addCase(initializeAuthSession.fulfilled, (state, action) => {
        state.isInitializing = false;
        const payload = action.payload;
        if (!payload) {
          state.user = null;
          state.token = null;
          state.refreshToken = null;
          state.sessionExpiry = null;
          state.isAuthenticated = false;
          persistAuth({
            user: null,
            token: null,
            refreshToken: null,
            sessionExpiry: null,
          });
          return;
        }
        state.user = payload.user;
        state.token = payload.token;
        state.refreshToken = payload.refreshToken;
        state.sessionExpiry = payload.sessionExpiry;
        state.isAuthenticated = true;
        persistAuth(payload);
      })
      .addCase(initializeAuthSession.rejected, (state, action) => {
        state.isInitializing = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.sessionExpiry = null;
        state.isAuthenticated = false;
        state.error = action.payload || action.error.message || 'Session restore failed';
        clearPersistedAuth();
      })
      .addCase(loginWithPassword.pending, state => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.isAuthenticated = true;
        state.error = null;
        persistAuth(action.payload);
      })
      .addCase(loginWithPassword.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || action.error.message || 'Sign in failed';
      })
      .addCase(logout.pending, state => {
        state.isSubmitting = true;
      })
      .addCase(logout.fulfilled, state => {
        state.isSubmitting = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.sessionExpiry = null;
        state.isAuthenticated = false;
        state.error = null;
        clearPersistedAuth();
      })
      .addCase(logout.rejected, state => {
        state.isSubmitting = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.sessionExpiry = null;
        state.isAuthenticated = false;
        state.error = null;
        clearPersistedAuth();
      });
  },
});

export const { setAuthUser, setAuthToken, syncAuthFromStorage, clearAuthError } =
  authSlice.actions;

export const selectAuth = (state: { auth: AuthSliceState }): AuthSliceState =>
  state.auth;
export const selectUser = (state: { auth: AuthSliceState }): User | null =>
  state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthSliceState }): boolean =>
  state.auth.isAuthenticated;

export default authSlice.reducer;
