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

const resolveSparkeryTelemetryUserId = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitUserId = toNonEmptyString(data?.userId);
  if (explicitUserId) {
    return explicitUserId;
  }
  return resolveUserIdFromRuntime() ?? resolveUserIdFromStorage();
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

export const clearSparkeryTelemetryEvents = (): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(SPARKERY_TELEMETRY_STORAGE_KEY);
};
