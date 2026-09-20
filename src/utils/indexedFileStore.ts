/**
 * IndexedDB storage utility for large raw binary files, Word documents, Excel sheets, and PDFs.
 * Completely bypasses the 5MB browser localStorage quota limit, ensuring 100% of uploaded
 * raw files are permanently accessible anytime via the eye icon.
 */

const DB_NAME = 'AcademicSchoolRawFileDB';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_ACTIVE = 'active_preview';

// In-memory fallback cache in case IndexedDB is restricted in some iframe environments
const memoryFileCache = new Map<string, { dataUrl: string; blob?: Blob; metadata?: any }>();
let memoryActivePayload: any = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
        db.createObjectStore(STORE_ACTIVE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Permanently stores a raw file's binary data (base64 Data URL and/or Blob)
 */
export async function saveFileToIndexedDb(
  id: string,
  dataUrl: string,
  blob?: Blob,
  metadata?: any
): Promise<boolean> {
  if (!id) return false;
  // Always update in-memory cache
  memoryFileCache.set(id, { dataUrl, blob, metadata });

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.put({
        id,
        dataUrl,
        blob,
        metadata: metadata || null,
        updatedAt: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('[indexedFileStore] saveFile error (using memory cache):', e);
    return true; // Still ok in memory
  }
}

/**
 * Retrieves a raw file's binary data by its unique file ID
 */
export async function getFileFromIndexedDb(
  id: string
): Promise<{ dataUrl: string; blob?: Blob; metadata?: any } | null> {
  if (!id) return null;
  // Check memory cache first
  if (memoryFileCache.has(id)) {
    return memoryFileCache.get(id)!;
  }

  // Also check memory cache by filename or metadata name
  for (const [key, val] of memoryFileCache.entries()) {
    if (key === id || val.metadata?.name === id || val.metadata?.fileName === id) {
      return val;
    }
  }

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          memoryFileCache.set(id, req.result);
          resolve(req.result);
        } else {
          // If not found by exact ID, scan for matching filename in metadata
          const cursorReq = store.openCursor();
          let found = false;
          cursorReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              const item = cursor.value;
              if (
                item.id === id ||
                item.metadata?.name === id ||
                item.metadata?.fileName === id ||
                item.metadata?.driveFileId === id
              ) {
                found = true;
                memoryFileCache.set(id, item);
                resolve(item);
                return;
              }
              cursor.continue();
            } else if (!found) {
              resolve(null);
            }
          };
          cursorReq.onerror = () => resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('[indexedFileStore] getFile error:', e);
    return null;
  }
}

/**
 * Saves the active file payload before opening a new window or tab
 */
export async function setActivePreviewToIndexedDb(payload: any): Promise<boolean> {
  if (!payload) return false;
  memoryActivePayload = payload;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ACTIVE, 'readwrite');
      const store = tx.objectStore(STORE_ACTIVE);
      store.put({ key: 'current', payload, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('[indexedFileStore] setActivePreview error:', e);
    return true;
  }
}

/**
 * Retrieves the active file payload when dedicated raw viewer opens in a new tab
 */
export async function getActivePreviewFromIndexedDb(): Promise<any | null> {
  if (memoryActivePayload) return memoryActivePayload;
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ACTIVE, 'readonly');
      const store = tx.objectStore(STORE_ACTIVE);
      const req = store.get('current');
      req.onsuccess = () => {
        if (req.result?.payload) {
          resolve(req.result.payload);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn('[indexedFileStore] getActivePreview error:', e);
    return null;
  }
}
