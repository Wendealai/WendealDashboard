import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types/auth';

export interface AuthSliceState {
  user: User | null;
  token: string | null;
  sessionExpiry: string | null;
}

const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
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
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
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

const initState = (): AuthSliceState => {
  const user = readJson<User>('auth_user') || readJson<User>('wendeal_user_info');
  const token = localStorage.getItem('auth_token') || localStorage.getItem('wendeal_auth_token');
  return {
    user,
    token,
    sessionExpiry: deriveSessionExpiry(token),
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initState(),
  reducers: {
    setAuthUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    setAuthToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
      state.sessionExpiry = deriveSessionExpiry(action.payload);
    },
    syncAuthFromStorage(state) {
      const next = initState();
      state.user = next.user;
      state.token = next.token;
      state.sessionExpiry = next.sessionExpiry;
    },
  },
});

export const { setAuthUser, setAuthToken, syncAuthFromStorage } = authSlice.actions;

export const selectAuth = (state: { auth: AuthSliceState }): AuthSliceState => state.auth;
export const selectUser = (state: { auth: AuthSliceState }): User | null => state.auth.user;

export default authSlice.reducer;