const DISPATCH_OFFLINE_SYNC_TAG = 'sparkery-dispatch-offline-sync-v1';

type DispatchSyncConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const isServiceWorkerRuntime = (): boolean =>
  typeof window !== 'undefined' && typeof navigator !== 'undefined';

const normalizeValue = (value?: string): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const postMessageToServiceWorker = async (message: unknown): Promise<void> => {
  if (!isServiceWorkerRuntime() || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker =
      navigator.serviceWorker.controller ||
      registration?.active ||
      registration?.waiting ||
      registration?.installing;
    worker?.postMessage(message);
  } catch {
    // Keep dispatch queue logic functional even when SW messaging fails.
  }
};

export const getDispatchOfflineSyncTag = (): string =>
  DISPATCH_OFFLINE_SYNC_TAG;

export const requestDispatchOfflineBackgroundSync =
  async (): Promise<boolean> => {
    if (!isServiceWorkerRuntime() || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const syncManager = (
        registration as ServiceWorkerRegistration & {
          sync?: {
            register: (tag: string) => Promise<void>;
          };
        }
      ).sync;
      if (!syncManager) {
        return false;
      }
      await syncManager.register(DISPATCH_OFFLINE_SYNC_TAG);
      return true;
    } catch {
      return false;
    }
  };

export const syncDispatchOfflineQueueToServiceWorker = (
  queueSnapshot: unknown[]
): void => {
  void postMessageToServiceWorker({
    type: 'DISPATCH_OFFLINE_QUEUE_SYNC',
    payload: {
      queue: Array.isArray(queueSnapshot) ? queueSnapshot : [],
    },
  });
};

export const syncDispatchConfigToServiceWorker = (
  config: DispatchSyncConfig
): void => {
  const supabaseUrl = normalizeValue(config.supabaseUrl);
  const supabaseAnonKey = normalizeValue(config.supabaseAnonKey);
  if (!supabaseUrl || !supabaseAnonKey) {
    return;
  }

  void postMessageToServiceWorker({
    type: 'DISPATCH_SYNC_CONFIG',
    payload: {
      supabaseUrl,
      supabaseAnonKey,
    },
  });
};
