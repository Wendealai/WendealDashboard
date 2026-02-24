const APP_SHELL_CACHE = 'wendeal-app-shell-v1';
const RUNTIME_CACHE = 'wendeal-runtime-v1';
const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/vite.svg'];
const STATIC_ASSET_PATTERN =
  /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|json)$/i;

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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
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
