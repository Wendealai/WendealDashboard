const DB_NAME = 'invoice_ingestion_blob_store_v1';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

interface StoredBlobRecord {
  document_id: string;
  blob: Blob;
  file_name: string;
  mime_type: string;
  updated_at: string;
}

const withBlobStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'document_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Failed to open IndexedDB'));
  });

  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await callback(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () =>
        reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    return result;
  } finally {
    db.close();
  }
};

export const saveInvoiceSourceBlob = async (
  documentId: string,
  file: Blob,
  fileName: string,
  mimeType: string
): Promise<void> => {
  const record: StoredBlobRecord = {
    document_id: documentId,
    blob: file,
    file_name: fileName,
    mime_type: mimeType,
    updated_at: new Date().toISOString(),
  };

  await withBlobStore('readwrite', store => {
    store.put(record);
  });
};

export const getInvoiceSourceBlob = async (
  documentId: string
): Promise<StoredBlobRecord | null> =>
  withBlobStore('readonly', store => {
    return new Promise<StoredBlobRecord | null>((resolve, reject) => {
      const request = store.get(documentId);
      request.onsuccess = () => {
        resolve((request.result as StoredBlobRecord | undefined) || null);
      };
      request.onerror = () =>
        reject(request.error || new Error('Failed to read source blob'));
    });
  });

export const removeInvoiceSourceBlob = async (
  documentId: string
): Promise<void> => {
  await withBlobStore('readwrite', store => {
    store.delete(documentId);
  });
};
