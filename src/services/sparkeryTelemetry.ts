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
const SPARKERY_TELEMETRY_PENDING_STORAGE_KEY = 'sparkery_telemetry_pending_v1';
const SPARKERY_TELEMETRY_DEVICE_ID_STORAGE_KEY =
  'sparkery_telemetry_device_id_v1';
const SPARKERY_TELEMETRY_LIMIT = 300;
const SPARKERY_TELEMETRY_PENDING_LIMIT = 500;
const SPARKERY_TELEMETRY_REMOTE_BATCH_SIZE = 30;
const SPARKERY_TELEMETRY_REMOTE_MIN_FLUSH_INTERVAL_MS = 2000;
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
  __SPARKERY_TELEMETRY_DEVICE_ID__?: unknown;
  __WENDEAL_APP_VERSION__?: unknown;
  __WENDEAL_RUNTIME_CONFIG__?: {
    appVersion?: unknown;
  };
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

const resolveAppVersionFromRuntime = (): string | undefined => {
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_APP_VERSION__?: unknown;
    __WENDEAL_RUNTIME_CONFIG__?: {
      appVersion?: unknown;
    };
  };

  const runtimeVersion = toNonEmptyString(runtime.__WENDEAL_APP_VERSION__);
  if (runtimeVersion) {
    return runtimeVersion;
  }

  const runtimeConfigVersion = toNonEmptyString(
    runtime.__WENDEAL_RUNTIME_CONFIG__?.appVersion
  );
  if (runtimeConfigVersion) {
    return runtimeConfigVersion;
  }

  const browserWindow =
    typeof window !== 'undefined'
      ? (window as SparkeryTelemetryWindow)
      : undefined;
  return toNonEmptyString(
    browserWindow?.__WENDEAL_RUNTIME_CONFIG__?.appVersion
  );
};

const resolveNetworkTypeFromRuntime = (): string | undefined => {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      type?: string;
      downlink?: number;
    };
  };
  const effectiveType = toNonEmptyString(nav.connection?.effectiveType);
  if (effectiveType) {
    return effectiveType;
  }

  const connectionType = toNonEmptyString(nav.connection?.type);
  if (connectionType) {
    return connectionType;
  }

  if (typeof nav.connection?.downlink === 'number') {
    return `downlink_${nav.connection.downlink}`;
  }

  if (typeof nav.onLine === 'boolean') {
    return nav.onLine ? 'online' : 'offline';
  }

  return undefined;
};

const createDeviceId = (): string =>
  `sparkery-device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const resolveDeviceIdFromStorage = (): string | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  const storedDeviceId = toNonEmptyString(
    readStorageItem(localStorage, SPARKERY_TELEMETRY_DEVICE_ID_STORAGE_KEY)
  );
  if (storedDeviceId) {
    return storedDeviceId;
  }

  const generatedDeviceId = createDeviceId();
  try {
    localStorage.setItem(
      SPARKERY_TELEMETRY_DEVICE_ID_STORAGE_KEY,
      generatedDeviceId
    );
  } catch {
    return undefined;
  }
  return generatedDeviceId;
};

const resolveDeviceIdFromRuntime = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const explicitDeviceId = toNonEmptyString(
    telemetryWindow.__SPARKERY_TELEMETRY_DEVICE_ID__
  );
  if (explicitDeviceId) {
    return explicitDeviceId;
  }

  return undefined;
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

const resolveSparkeryTelemetryAppVersion = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitAppVersion = toNonEmptyString(data?.appVersion);
  if (explicitAppVersion) {
    return explicitAppVersion;
  }
  return resolveAppVersionFromRuntime();
};

const resolveSparkeryTelemetryDeviceId = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitDeviceId = toNonEmptyString(data?.deviceId);
  if (explicitDeviceId) {
    return explicitDeviceId;
  }
  return resolveDeviceIdFromRuntime() ?? resolveDeviceIdFromStorage();
};

const resolveSparkeryTelemetryNetworkType = (
  data?: Record<string, unknown>
): string | undefined => {
  const explicitNetworkType = toNonEmptyString(data?.networkType);
  if (explicitNetworkType) {
    return explicitNetworkType;
  }
  return resolveNetworkTypeFromRuntime();
};

const buildTelemetryEventData = (
  data?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const resolvedUserId = resolveSparkeryTelemetryUserId(data);
  const resolvedActorRole = resolveSparkeryTelemetryActorRole(data);
  const resolvedSessionId = resolveSparkeryTelemetrySessionId(data);
  const resolvedAppVersion = resolveSparkeryTelemetryAppVersion(data);
  const resolvedDeviceId = resolveSparkeryTelemetryDeviceId(data);
  const resolvedNetworkType = resolveSparkeryTelemetryNetworkType(data);

  const normalized = {
    ...(data || {}),
    ...(resolvedUserId && !toNonEmptyString(data?.userId)
      ? { userId: resolvedUserId }
      : {}),
    ...(resolvedActorRole && !toNonEmptyString(data?.actorRole)
      ? { actorRole: resolvedActorRole }
      : {}),
    ...(resolvedSessionId && !toNonEmptyString(data?.sessionId)
      ? { sessionId: resolvedSessionId }
      : {}),
    ...(resolvedAppVersion && !toNonEmptyString(data?.appVersion)
      ? { appVersion: resolvedAppVersion }
      : {}),
    ...(resolvedDeviceId && !toNonEmptyString(data?.deviceId)
      ? { deviceId: resolvedDeviceId }
      : {}),
    ...(resolvedNetworkType && !toNonEmptyString(data?.networkType)
      ? { networkType: resolvedNetworkType }
      : {}),
  };

  if (Object.keys(normalized).length > 0) {
    return normalized;
  }
  return undefined;
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

const loadPendingTelemetryEvents = (): SparkeryTelemetryEvent[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SPARKERY_TELEMETRY_PENDING_STORAGE_KEY);
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

const savePendingTelemetryEvents = (events: SparkeryTelemetryEvent[]): void => {
  if (!isBrowser()) {
    return;
  }

  const trimmedEvents =
    events.length > SPARKERY_TELEMETRY_PENDING_LIMIT
      ? events.slice(events.length - SPARKERY_TELEMETRY_PENDING_LIMIT)
      : events;
  localStorage.setItem(
    SPARKERY_TELEMETRY_PENDING_STORAGE_KEY,
    JSON.stringify(trimmedEvents)
  );
};

const enqueuePendingTelemetryEvent = (event: SparkeryTelemetryEvent): void => {
  const pending = loadPendingTelemetryEvents();
  pending.push(event);
  savePendingTelemetryEvents(pending);
};

const getSupabaseTelemetryConfig = ():
  | {
      url: string;
      anonKey: string;
    }
  | undefined => {
  const runtime = globalThis as typeof globalThis & {
    __WENDEAL_SUPABASE_CONFIG__?: {
      url?: unknown;
      anonKey?: unknown;
    };
  };

  const runtimeUrl = toNonEmptyString(runtime.__WENDEAL_SUPABASE_CONFIG__?.url);
  const runtimeAnonKey = toNonEmptyString(
    runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey
  );
  if (!runtimeUrl || !runtimeAnonKey) {
    return undefined;
  }

  return {
    url: runtimeUrl,
    anonKey: runtimeAnonKey,
  };
};

const toSupabaseTelemetryRow = (event: SparkeryTelemetryEvent) => {
  const data = isRecord(event.data) ? event.data : {};
  return {
    id: event.id,
    name: event.name,
    timestamp: event.timestamp,
    success: typeof event.success === 'boolean' ? event.success : null,
    duration_ms: typeof event.durationMs === 'number' ? event.durationMs : null,
    data,
    user_id: toNonEmptyString(data.userId) || null,
    actor_role: toNonEmptyString(data.actorRole) || null,
    session_id: toNonEmptyString(data.sessionId) || null,
    app_version: toNonEmptyString(data.appVersion) || null,
    device_id: toNonEmptyString(data.deviceId) || null,
    network_type: toNonEmptyString(data.networkType) || null,
  };
};

let telemetryFlushInFlight = false;
let telemetryLastFlushAt = 0;
let telemetryOnlineListenerBound = false;

const canFlushTelemetryNow = (): boolean =>
  Date.now() - telemetryLastFlushAt >=
  SPARKERY_TELEMETRY_REMOTE_MIN_FLUSH_INTERVAL_MS;

const ensureTelemetryOnlineFlushListener = (): void => {
  if (!isBrowser() || telemetryOnlineListenerBound) {
    return;
  }

  telemetryOnlineListenerBound = true;
  window.addEventListener('online', () => {
    void flushSparkeryTelemetryEventsToServer();
  });
};

export const flushSparkeryTelemetryEventsToServer = async (): Promise<void> => {
  if (!isBrowser() || typeof fetch !== 'function') {
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  if (telemetryFlushInFlight || !canFlushTelemetryNow()) {
    return;
  }

  const supabaseConfig = getSupabaseTelemetryConfig();
  if (!supabaseConfig) {
    return;
  }

  let pending = loadPendingTelemetryEvents();
  if (pending.length === 0) {
    return;
  }

  telemetryFlushInFlight = true;
  telemetryLastFlushAt = Date.now();

  try {
    while (pending.length > 0) {
      const batch = pending.slice(0, SPARKERY_TELEMETRY_REMOTE_BATCH_SIZE);
      const response = await fetch(
        `${supabaseConfig.url.replace(/\/$/, '')}/rest/v1/sparkery_telemetry_events?on_conflict=id`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseConfig.anonKey,
            Authorization: `Bearer ${supabaseConfig.anonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(batch.map(toSupabaseTelemetryRow)),
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `telemetry upload failed (${response.status}): ${details || 'No details'}`
        );
      }

      pending = pending.slice(batch.length);
      savePendingTelemetryEvents(pending);
    }
  } catch {
    // Keep remaining pending events for the next retry.
    savePendingTelemetryEvents(pending);
  } finally {
    telemetryFlushInFlight = false;
  }
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
  enqueuePendingTelemetryEvent(event);
  ensureTelemetryOnlineFlushListener();

  if (isDevRuntime() && typeof window !== 'undefined') {
    (window as SparkeryTelemetryWindow).__SPARKERY_TELEMETRY_LAST__ = event;
  }

  void flushSparkeryTelemetryEventsToServer();
};

export const getSparkeryTelemetryEvents = (): SparkeryTelemetryEvent[] =>
  loadTelemetryEvents();

export const getSparkeryTelemetryUserId = (): string | undefined =>
  resolveSparkeryTelemetryUserId();

export const getSparkeryTelemetryActorRole = (): string | undefined =>
  resolveSparkeryTelemetryActorRole();

export const getSparkeryTelemetrySessionId = (): string | undefined =>
  resolveSparkeryTelemetrySessionId();

export const getSparkeryTelemetryDeviceId = (): string | undefined =>
  resolveSparkeryTelemetryDeviceId();

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

export const setSparkeryTelemetryDeviceId = (deviceId: unknown): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const telemetryWindow = window as SparkeryTelemetryWindow;
  const normalizedDeviceId = toNonEmptyString(deviceId);
  if (normalizedDeviceId) {
    telemetryWindow.__SPARKERY_TELEMETRY_DEVICE_ID__ = normalizedDeviceId;
    localStorage.setItem(
      SPARKERY_TELEMETRY_DEVICE_ID_STORAGE_KEY,
      normalizedDeviceId
    );
    return;
  }

  delete telemetryWindow.__SPARKERY_TELEMETRY_DEVICE_ID__;
  localStorage.removeItem(SPARKERY_TELEMETRY_DEVICE_ID_STORAGE_KEY);
};

export const clearSparkeryTelemetryDeviceId = (): void => {
  setSparkeryTelemetryDeviceId(null);
};

export const clearSparkeryTelemetryEvents = (): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(SPARKERY_TELEMETRY_STORAGE_KEY);
  localStorage.removeItem(SPARKERY_TELEMETRY_PENDING_STORAGE_KEY);
};
