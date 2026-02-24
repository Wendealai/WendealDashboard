type SparkeryTelemetryEventName =
  | 'quote.print.started'
  | 'quote.print.succeeded'
  | 'quote.print.failed'
  | 'quote.custom_report.print.started'
  | 'quote.custom_report.print.succeeded'
  | 'quote.custom_report.print.failed'
  | 'dispatch.offline.enqueue'
  | 'dispatch.offline.flush.completed'
  | 'dispatch.job.create.succeeded'
  | 'dispatch.job.create.failed'
  | 'dispatch.job.update.succeeded'
  | 'dispatch.job.update.failed';

interface SparkeryTelemetryEvent {
  id: string;
  name: SparkeryTelemetryEventName;
  timestamp: string;
  success?: boolean;
  durationMs?: number;
  data?: Record<string, unknown>;
}

const SPARKERY_TELEMETRY_STORAGE_KEY = 'sparkery_telemetry_events_v1';
const SPARKERY_TELEMETRY_LIMIT = 300;
const SPARKERY_TELEMETRY_USER_STORAGE_KEYS = [
  'auth_user',
  'wendeal_user_info',
] as const;
const SPARKERY_TELEMETRY_TOKEN_STORAGE_KEYS = [
  'auth_token',
  'wendeal_auth_token',
] as const;

type SparkeryTelemetryWindow = Window & {
  __SPARKERY_TELEMETRY_LAST__?: SparkeryTelemetryEvent;
  __SPARKERY_TELEMETRY_USER_ID__?: unknown;
  __SPARKERY_TELEMETRY_ACTOR_ROLE__?: unknown;
  __SPARKERY_TELEMETRY_SESSION_ID__?: unknown;
  __REDUX_STORE__?: {
    getState?: () => unknown;
  };
};

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const createEventId = (): string =>
  `sparkery-telemetry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const resolveUserIdFromObject = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const directUserId =
    toNonEmptyString(value.userId) ??
    toNonEmptyString(value.id) ??
    toNonEmptyString(value.sub);
  if (directUserId) {
    return directUserId;
  }

  if (isRecord(value.user)) {
    return resolveUserIdFromObject(value.user);
  }

  return undefined;
};

const resolveActorRoleFromObject = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const directRole =
    toNonEmptyString(value.actorRole) ?? toNonEmptyString(value.role);
  if (directRole) {
    return directRole;
  }

  if (isRecord(value.user)) {
    return resolveActorRoleFromObject(value.user);
  }

  return undefined;
};

const readStorageItem = (
  storage: Storage | undefined,
  key: string
): string | null => {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const getSessionStorage = (): Storage | undefined => {
  if (typeof sessionStorage === 'undefined') {
    return undefined;
  }
  return sessionStorage;
};

const normalizeBase64 = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (base64.length % 4)) % 4;
  return `${base64}${'='.repeat(paddingLength)}`;
};

const decodeBase64 = (value: string): string | null => {
  if (!value || typeof atob !== 'function') {
    return null;
  }

  try {
    return atob(normalizeBase64(value));
  } catch {
    return null;
  }
};

const extractUserIdFromSerializedUser = (
  serializedUser: string | null
): string | undefined => {
  if (!serializedUser) {
    return undefined;
  }

  return resolveUserIdFromObject(tryParseJson(serializedUser));
};

const parseTokenPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length >= 2) {
    const decodedPayload = decodeBase64(parts[1] || '');
    if (decodedPayload) {
      const parsedPayload = tryParseJson(decodedPayload);
      if (isRecord(parsedPayload)) {
        return parsedPayload;
      }
    }
  }

  const decodedToken = decodeBase64(token);
  if (!decodedToken) {
    return null;
  }

  const parsedToken = tryParseJson(decodedToken);
  if (!isRecord(parsedToken)) {
    return null;
  }

  if (isRecord(parsedToken.payload)) {
    return parsedToken.payload;
  }

  return parsedToken;
};

const extractUserIdFromToken = (token: string | null): string | undefined => {
  if (!token) {
    return undefined;
  }
  return resolveUserIdFromObject(parseTokenPayload(token));
};

const extractSessionIdFromTokenPayload = (
  payload: Record<string, unknown> | null
): string | undefined => {
  if (!payload) {
    return undefined;
  }

  const explicitSessionId =
    toNonEmptyString(payload.sessionId) ??
    toNonEmptyString(payload.session_id) ??
    toNonEmptyString(payload.sid) ??
    toNonEmptyString(payload.jti);
  if (explicitSessionId) {
    return explicitSessionId;
  }

  const subject = toNonEmptyString(payload.sub);
  const issuedAt = toNonEmptyString(payload.iat);
  if (subject && issuedAt) {
    return `${subject}:${issuedAt}`;
  }

  return undefined;
};

const extractSessionIdFromToken = (
  token: string | null
): string | undefined => {
  if (!token) {
    return undefined;
  }
  return extractSessionIdFromTokenPayload(parseTokenPayload(token));
};

const resolveUserIdFromStorage = (): string | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  const session = getSessionStorage();
  for (const key of SPARKERY_TELEMETRY_USER_STORAGE_KEYS) {
    const userId =
      extractUserIdFromSerializedUser(readStorageItem(localStorage, key)) ??
      extractUserIdFromSerializedUser(readStorageItem(session, key));
    if (userId) {
      return userId;
    }
  }

  for (const key of SPARKERY_TELEMETRY_TOKEN_STORAGE_KEYS) {
    const userId =
      extractUserIdFromToken(readStorageItem(localStorage, key)) ??
      extractUserIdFromToken(readStorageItem(session, key));
    if (userId) {
      return userId;
    }
  }

  return undefined;
};

const resolveActorRoleFromStorage = (): string | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  const session = getSessionStorage();
  for (const key of SPARKERY_TELEMETRY_USER_STORAGE_KEYS) {
    const actorRole =
      resolveActorRoleFromObject(
        tryParseJson(readStorageItem(localStorage, key) || '')
      ) ??
      resolveActorRoleFromObject(
        tryParseJson(readStorageItem(session, key) || '')
      );
    if (actorRole) {
      return actorRole;
    }
  }

  return undefined;
};

const resolveSessionIdFromStorage = (): string | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  const session = getSessionStorage();
  for (const key of SPARKERY_TELEMETRY_TOKEN_STORAGE_KEYS) {
    const sessionId =
      extractSessionIdFromToken(readStorageItem(localStorage, key)) ??
      extractSessionIdFromToken(readStorageItem(session, key));
    if (sessionId) {
      return sessionId;
    }
  }

  return undefined;
};

const resolveUserIdFromReduxState = (state: unknown): string | undefined => {
  if (!isRecord(state)) {
    return undefined;
  }

  const authState = state.auth;
  if (isRecord(authState)) {
    const authUserId = resolveUserIdFromObject(authState.user);
    if (authUserId) {
      return authUserId;
    }
  }

  const userState = state.user;
  if (isRecord(userState)) {
    const storeUserId = resolveUserIdFromObject(userState.currentUser);
    if (storeUserId) {
      return storeUserId;
    }
  }

  return undefined;
};

const resolveActorRoleFromReduxState = (state: unknown): string | undefined => {
  if (!isRecord(state)) {
    return undefined;
  }

  const authState = state.auth;
  if (isRecord(authState)) {
    const authActorRole = resolveActorRoleFromObject(authState.user);
    if (authActorRole) {
      return authActorRole;
    }
  }

  const userState = state.user;
  if (isRecord(userState)) {
    const storeActorRole = resolveActorRoleFromObject(userState.currentUser);
    if (storeActorRole) {
      return storeActorRole;
    }
  }

  return undefined;
};

const resolveSessionIdFromReduxState = (state: unknown): string | undefined => {
  if (!isRecord(state)) {
    return undefined;
  }

  const authState = state.auth;
  if (!isRecord(authState)) {
    return undefined;
  }

  const explicitSessionId =
    toNonEmptyString(authState.sessionId) ??
    toNonEmptyString(authState.session_id) ??
    toNonEmptyString(authState.sid);
  if (explicitSessionId) {
    return explicitSessionId;
  }

  const tokenSessionId = extractSessionIdFromToken(
    toNonEmptyString(authState.token) || null
  );
  if (tokenSessionId) {
    return tokenSessionId;
  }

  const userId = resolveUserIdFromObject(authState.user);
  const sessionExpiry = toNonEmptyString(authState.sessionExpiry);
  if (userId && sessionExpiry) {
    return `${userId}:${sessionExpiry}`;
  }

  return undefined;
};

const resolveUserIdFromRuntime = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const explicitUserId = toNonEmptyString(
    telemetryWindow.__SPARKERY_TELEMETRY_USER_ID__
  );
  if (explicitUserId) {
    return explicitUserId;
  }

  const reduxState =
    typeof telemetryWindow.__REDUX_STORE__?.getState === 'function'
      ? telemetryWindow.__REDUX_STORE__.getState()
      : undefined;
  return resolveUserIdFromReduxState(reduxState);
};

const resolveActorRoleFromRuntime = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const explicitActorRole = toNonEmptyString(
    telemetryWindow.__SPARKERY_TELEMETRY_ACTOR_ROLE__
  );
  if (explicitActorRole) {
    return explicitActorRole;
  }

  const reduxState =
    typeof telemetryWindow.__REDUX_STORE__?.getState === 'function'
      ? telemetryWindow.__REDUX_STORE__.getState()
      : undefined;
  return resolveActorRoleFromReduxState(reduxState);
};

const resolveSessionIdFromRuntime = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const explicitSessionId = toNonEmptyString(
    telemetryWindow.__SPARKERY_TELEMETRY_SESSION_ID__
  );
  if (explicitSessionId) {
    return explicitSessionId;
  }

  const reduxState =
    typeof telemetryWindow.__REDUX_STORE__?.getState === 'function'
      ? telemetryWindow.__REDUX_STORE__.getState()
      : undefined;
  return resolveSessionIdFromReduxState(reduxState);
};

const resolveSparkeryTelemetryUserId = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitUserId = toNonEmptyString(data?.userId);
  if (explicitUserId) {
    return explicitUserId;
  }
  return resolveUserIdFromRuntime() ?? resolveUserIdFromStorage();
};

const resolveSparkeryTelemetryActorRole = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitActorRole = toNonEmptyString(data?.actorRole);
  if (explicitActorRole) {
    return explicitActorRole;
  }
  return resolveActorRoleFromRuntime() ?? resolveActorRoleFromStorage();
};

const resolveSparkeryTelemetrySessionId = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitSessionId = toNonEmptyString(data?.sessionId);
  if (explicitSessionId) {
    return explicitSessionId;
  }
  return resolveSessionIdFromRuntime() ?? resolveSessionIdFromStorage();
};

const buildTelemetryEventData = (
  data?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const resolvedUserId = resolveSparkeryTelemetryUserId(data);
  if (!data && !resolvedUserId) {
    return undefined;
  }
  if (!data && resolvedUserId) {
    return { userId: resolvedUserId };
  }
  if (data && resolvedUserId && !toNonEmptyString(data.userId)) {
    return {
      ...data,
      userId: resolvedUserId,
    };
  }
  return data;
};

const isDevRuntime = (): boolean => {
  return (
    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  );
};

const loadTelemetryEvents = (): SparkeryTelemetryEvent[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SPARKERY_TELEMETRY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(item => item && typeof item === 'object');
  } catch {
    return [];
  }
};

const saveTelemetryEvents = (events: SparkeryTelemetryEvent[]): void => {
  if (!isBrowser()) {
    return;
  }

  const trimmedEvents =
    events.length > SPARKERY_TELEMETRY_LIMIT
      ? events.slice(events.length - SPARKERY_TELEMETRY_LIMIT)
      : events;
  localStorage.setItem(
    SPARKERY_TELEMETRY_STORAGE_KEY,
    JSON.stringify(trimmedEvents)
  );
};

export const trackSparkeryEvent = (
  name: SparkeryTelemetryEventName,
  payload: {
    success?: boolean;
    durationMs?: number;
    data?: Record<string, unknown>;
  } = {}
): void => {
  const eventData = buildTelemetryEventData(payload.data);
  const event: SparkeryTelemetryEvent = {
    id: createEventId(),
    name,
    timestamp: new Date().toISOString(),
    ...(typeof payload.success === 'boolean'
      ? { success: payload.success }
      : {}),
    ...(typeof payload.durationMs === 'number'
      ? { durationMs: payload.durationMs }
      : {}),
    ...(eventData ? { data: eventData } : {}),
  };

  const currentEvents = loadTelemetryEvents();
  currentEvents.push(event);
  saveTelemetryEvents(currentEvents);

  if (isDevRuntime() && typeof window !== 'undefined') {
    (window as SparkeryTelemetryWindow).__SPARKERY_TELEMETRY_LAST__ = event;
  }
};

export const getSparkeryTelemetryEvents = (): SparkeryTelemetryEvent[] =>
  loadTelemetryEvents();

export const getSparkeryTelemetryUserId = (): string | undefined =>
  resolveSparkeryTelemetryUserId();

export const getSparkeryTelemetryActorRole = (): string | undefined =>
  resolveSparkeryTelemetryActorRole();

export const getSparkeryTelemetrySessionId = (): string | undefined =>
  resolveSparkeryTelemetrySessionId();

export const setSparkeryTelemetryUserId = (userId: unknown): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const normalizedUserId = toNonEmptyString(userId);
  if (normalizedUserId) {
    telemetryWindow.__SPARKERY_TELEMETRY_USER_ID__ = normalizedUserId;
    return;
  }

  delete telemetryWindow.__SPARKERY_TELEMETRY_USER_ID__;
};

export const clearSparkeryTelemetryUserId = (): void => {
  setSparkeryTelemetryUserId(null);
};

export const setSparkeryTelemetryActorRole = (actorRole: unknown): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const normalizedActorRole = toNonEmptyString(actorRole);
  if (normalizedActorRole) {
    telemetryWindow.__SPARKERY_TELEMETRY_ACTOR_ROLE__ = normalizedActorRole;
    return;
  }

  delete telemetryWindow.__SPARKERY_TELEMETRY_ACTOR_ROLE__;
};

export const clearSparkeryTelemetryActorRole = (): void => {
  setSparkeryTelemetryActorRole(null);
};

export const setSparkeryTelemetrySessionId = (sessionId: unknown): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const normalizedSessionId = toNonEmptyString(sessionId);
  if (normalizedSessionId) {
    telemetryWindow.__SPARKERY_TELEMETRY_SESSION_ID__ = normalizedSessionId;
    return;
  }

  delete telemetryWindow.__SPARKERY_TELEMETRY_SESSION_ID__;
};

export const clearSparkeryTelemetrySessionId = (): void => {
  setSparkeryTelemetrySessionId(null);
};

export const clearSparkeryTelemetryEvents = (): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(SPARKERY_TELEMETRY_STORAGE_KEY);
};
