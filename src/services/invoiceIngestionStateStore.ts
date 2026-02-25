import type { InvoiceAssistantState } from '@/pages/Tools/types/invoiceIngestionAssistant';

const DB_NAME = 'invoice_ingestion_state_store_v1';
const DB_VERSION = 1;
const STORE_NAME = 'assistant_state';
const STATE_KEY = 'state';

interface StoredStateRecord {
  key: string;
  state: InvoiceAssistantState;
  updated_at: string;
}

const hasIndexedDb = (): boolean => typeof indexedDB !== 'undefined';

const withStateStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
  if (!hasIndexedDb()) {
    throw new Error('IndexedDB is unavailable in current runtime');
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error || new Error('Failed to open assistant state store')
      );
  });

  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await callback(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error('Assistant state transaction failed'));
      tx.onabort = () =>
        reject(tx.error || new Error('Assistant state transaction aborted'));
    });
    return result;
  } finally {
    db.close();
  }
};

export const saveInvoiceAssistantStateSnapshot = async (
  state: InvoiceAssistantState
): Promise<void> => {
  if (!hasIndexedDb()) {
    return;
  }

  const record: StoredStateRecord = {
    key: STATE_KEY,
    state,
    updated_at: new Date().toISOString(),
  };

  await withStateStore('readwrite', store => {
    store.put(record);
  });
};

export const getInvoiceAssistantStateSnapshot =
  async (): Promise<InvoiceAssistantState | null> => {
    if (!hasIndexedDb()) {
      return null;
    }

    return withStateStore('readonly', store => {
      return new Promise<InvoiceAssistantState | null>((resolve, reject) => {
        const request = store.get(STATE_KEY);
        request.onsuccess = () => {
          const record = request.result as StoredStateRecord | undefined;
          resolve(record?.state || null);
        };
        request.onerror = () =>
          reject(request.error || new Error('Failed to read assistant state'));
      });
    });
  };
