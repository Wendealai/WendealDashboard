const APP_SHELL_CACHE = 'wendeal-app-shell-v1';
const RUNTIME_CACHE = 'wendeal-runtime-v1';
const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/vite.svg'];
const STATIC_ASSET_PATTERN =
  /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|json)$/i;

const DISPATCH_SYNC_TAG = 'sparkery-dispatch-offline-sync-v1';
const DISPATCH_SYNC_DB_NAME = 'wendeal-dispatch-sync-v1';
const DISPATCH_SYNC_DB_VERSION = 1;
const DISPATCH_SYNC_QUEUE_STORE = 'dispatch_queue';
const DISPATCH_SYNC_META_STORE = 'dispatch_meta';
const DISPATCH_SYNC_META_KEY = 'supabase_config';
const DISPATCH_MAX_RETRIES = 5;
const DISPATCH_BASE_RETRY_DELAY_MS = 1000;
const DISPATCH_MAX_RETRY_DELAY_MS = 60000;

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(name))
          .map(name => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'DISPATCH_OFFLINE_QUEUE_SYNC') {
    event.waitUntil(saveDispatchQueueSnapshot(data.payload?.queue));
    return;
  }

  if (data.type === 'DISPATCH_SYNC_CONFIG') {
    event.waitUntil(saveDispatchSyncConfig(data.payload || {}));
    return;
  }

  if (data.type === 'DISPATCH_BACKGROUND_SYNC_REQUEST') {
    event.waitUntil(processDispatchBackgroundSyncQueue());
  }
});

self.addEventListener('sync', event => {
  if (event.tag === DISPATCH_SYNC_TAG) {
    event.waitUntil(processDispatchBackgroundSyncQueue());
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigateRequest(request));
    return;
  }

  if (STATIC_ASSET_PATTERN.test(requestUrl.pathname)) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});

async function handleNavigateRequest(request) {
  try {
    const networkResponse = await fetch(request);
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    runtimeCache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const shellFallback = await caches.match('/index.html');
    if (shellFallback) {
      return shellFallback;
    }
    throw error;
  }
}

async function handleStaticAssetRequest(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await runtimeCache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && (response.status === 200 || response.type === 'opaque')) {
        runtimeCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkFetch;
}

function openDispatchSyncDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DISPATCH_SYNC_DB_NAME, DISPATCH_SYNC_DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Failed to open DB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DISPATCH_SYNC_QUEUE_STORE)) {
        db.createObjectStore(DISPATCH_SYNC_QUEUE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DISPATCH_SYNC_META_STORE)) {
        db.createObjectStore(DISPATCH_SYNC_META_STORE, { keyPath: 'key' });
      }
    };
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error || new Error('IndexedDB transaction aborted'));
    transaction.onerror = () =>
      reject(transaction.error || new Error('IndexedDB transaction failed'));
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function toTrimmedString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeDispatchQueueAction(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const type = value.type;
  if (type !== 'update_job_status' && type !== 'report_location') {
    return null;
  }

  const id = toTrimmedString(value.id);
  const createdAt = toTrimmedString(value.createdAt);
  const idempotencyKey = toTrimmedString(value.idempotencyKey);
  if (!id || !createdAt || !idempotencyKey) {
    return null;
  }

  const attempts = Number.isFinite(value.attempts) ? value.attempts : 0;
  const base = {
    id,
    type,
    createdAt,
    idempotencyKey,
    attempts: Math.max(0, attempts),
    traceId: toTrimmedString(value.traceId),
    lastAttemptAt: toTrimmedString(value.lastAttemptAt),
    nextRetryAt: toTrimmedString(value.nextRetryAt),
    lastError: toTrimmedString(value.lastError),
  };

  const payload = value.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (type === 'update_job_status') {
    const jobId = toTrimmedString(payload.jobId);
    const status = toTrimmedString(payload.status);
    if (!jobId || !status) {
      return null;
    }

    return {
      ...base,
      payload: {
        jobId,
        status,
      },
    };
  }

  const employeeId = toTrimmedString(payload.employeeId);
  const location = payload.location;
  if (!employeeId || !location || typeof location !== 'object') {
    return null;
  }

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const normalizedLocation = {
    lat,
    lng,
    source: toTrimmedString(location.source) || 'mobile',
    updatedAt: toTrimmedString(location.updatedAt) || new Date().toISOString(),
    label: toTrimmedString(location.label),
  };
  if (Number.isFinite(location.accuracyM)) {
    normalizedLocation.accuracyM = location.accuracyM;
  }

  return {
    ...base,
    payload: {
      employeeId,
      location: normalizedLocation,
    },
  };
}

async function saveDispatchQueueSnapshot(snapshot) {
  const db = await openDispatchSyncDb();
  const queue = Array.isArray(snapshot) ? snapshot : [];
  const transaction = db.transaction([DISPATCH_SYNC_QUEUE_STORE], 'readwrite');
  const store = transaction.objectStore(DISPATCH_SYNC_QUEUE_STORE);
  store.clear();

  for (let i = 0; i < queue.length; i += 1) {
    const normalized = normalizeDispatchQueueAction(queue[i]);
    if (normalized) {
      store.put(normalized);
    }
  }

  await waitForTransaction(transaction);
}

async function getDispatchQueueSnapshot() {
  const db = await openDispatchSyncDb();
  const transaction = db.transaction([DISPATCH_SYNC_QUEUE_STORE], 'readonly');
  const store = transaction.objectStore(DISPATCH_SYNC_QUEUE_STORE);
  const result = await requestValue(store.getAll());
  await waitForTransaction(transaction);

  if (!Array.isArray(result)) {
    return [];
  }

  return result
    .map(normalizeDispatchQueueAction)
    .filter(item => item !== null);
}

async function saveDispatchSyncConfig(payload) {
  const supabaseUrl = toTrimmedString(payload?.supabaseUrl);
  const supabaseAnonKey = toTrimmedString(payload?.supabaseAnonKey);
  if (!supabaseUrl || !supabaseAnonKey) {
    return;
  }

  const db = await openDispatchSyncDb();
  const transaction = db.transaction([DISPATCH_SYNC_META_STORE], 'readwrite');
  const store = transaction.objectStore(DISPATCH_SYNC_META_STORE);
  store.put({
    key: DISPATCH_SYNC_META_KEY,
    value: {
      supabaseUrl,
      supabaseAnonKey,
    },
  });
  await waitForTransaction(transaction);
}

async function getDispatchSyncConfig() {
  const db = await openDispatchSyncDb();
  const transaction = db.transaction([DISPATCH_SYNC_META_STORE], 'readonly');
  const store = transaction.objectStore(DISPATCH_SYNC_META_STORE);
  const rawConfig = await requestValue(store.get(DISPATCH_SYNC_META_KEY));
  await waitForTransaction(transaction);

  const value = rawConfig?.value;
  if (!value || typeof value !== 'object') {
    return null;
  }

  const supabaseUrl = toTrimmedString(value.supabaseUrl);
  const supabaseAnonKey = toTrimmedString(value.supabaseAnonKey);
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function buildRetryDelayMs(attempt) {
  const safeAttempt = Math.max(1, attempt);
  const exponentialDelay = Math.min(
    DISPATCH_MAX_RETRY_DELAY_MS,
    DISPATCH_BASE_RETRY_DELAY_MS * 2 ** (safeAttempt - 1)
  );
  const jitter = Math.floor(Math.random() * Math.max(250, exponentialDelay * 0.25));
  return exponentialDelay + jitter;
}

function isLikelyNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('load failed')
  );
}

function createSupabaseHeaders(anonKey, extraHeaders) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };
}

async function executeDispatchQueueAction(action, config) {
  if (action.type === 'update_job_status') {
    const response = await fetch(
      `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/dispatch_jobs?id=eq.${encodeURIComponent(action.payload.jobId)}`,
      {
        method: 'PATCH',
        headers: createSupabaseHeaders(config.supabaseAnonKey, {
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify({
          status: action.payload.status,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `dispatch status sync failed (${response.status}): ${details || 'No details'}`
      );
    }
    return;
  }

  const location = action.payload.location;
  const payload = {
    employee_id: action.payload.employeeId,
    lat: location.lat,
    lng: location.lng,
    source: location.source || 'mobile',
    updated_at: location.updatedAt || new Date().toISOString(),
  };
  if (Number.isFinite(location.accuracyM)) {
    payload.accuracy_m = location.accuracyM;
  }
  if (location.label) {
    payload.label = location.label;
  }

  const response = await fetch(
    `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/dispatch_employee_locations?on_conflict=employee_id`,
    {
      method: 'POST',
      headers: createSupabaseHeaders(config.supabaseAnonKey, {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify([payload]),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `dispatch location sync failed (${response.status}): ${details || 'No details'}`
    );
  }
}

async function registerNextDispatchSync() {
  try {
    if (self.registration && self.registration.sync) {
      await self.registration.sync.register(DISPATCH_SYNC_TAG);
    }
  } catch {
    // Ignore sync registration errors and keep queue persisted.
  }
}

async function notifyDispatchSyncResult(summary) {
  try {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    windows.forEach(client => {
      client.postMessage({
        type: 'DISPATCH_BACKGROUND_SYNC_RESULT',
        payload: summary,
      });
    });
  } catch {
    // Ignore client messaging failure.
  }
}

async function processDispatchBackgroundSyncQueue() {
  const queue = await getDispatchQueueSnapshot();
  if (queue.length === 0) {
    return;
  }

  const config = await getDispatchSyncConfig();
  if (!config) {
    await registerNextDispatchSync();
    return;
  }

  const remainingQueue = [];
  let synced = 0;
  let failed = 0;
  let dropped = 0;
  let networkFailed = false;

  for (let index = 0; index < queue.length; index += 1) {
    const action = queue[index];

    if (action.nextRetryAt && Date.parse(action.nextRetryAt) > Date.now()) {
      remainingQueue.push(action);
      continue;
    }

    try {
      await executeDispatchQueueAction(action, config);
      synced += 1;
    } catch (error) {
      failed += 1;
      const nextAttempts = (Number(action.attempts) || 0) + 1;
      const errorMessage = String(error?.message || error || 'unknown_error');
      const retryable = nextAttempts < DISPATCH_MAX_RETRIES;

      if (retryable) {
        remainingQueue.push({
          ...action,
          attempts: nextAttempts,
          lastAttemptAt: new Date().toISOString(),
          nextRetryAt: new Date(Date.now() + buildRetryDelayMs(nextAttempts)).toISOString(),
          lastError: errorMessage,
        });
      } else {
        dropped += 1;
      }

      if (isLikelyNetworkError(error)) {
        networkFailed = true;
        for (let pendingIndex = index + 1; pendingIndex < queue.length; pendingIndex += 1) {
          remainingQueue.push(queue[pendingIndex]);
        }
        break;
      }
    }
  }

  await saveDispatchQueueSnapshot(remainingQueue);
  if (remainingQueue.length > 0) {
    await registerNextDispatchSync();
  }

  await notifyDispatchSyncResult({
    synced,
    failed,
    dropped,
    remaining: remainingQueue.length,
    networkFailed,
  });
}
