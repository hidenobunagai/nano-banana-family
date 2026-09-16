/**
 * IndexedDB-backed local gallery for persisting generated images on the client.
 * Falls back to an in-memory store where IndexedDB is unavailable (SSR, testing).
 * A failed IndexedDB write is reported to the caller instead of being masked by an
 * in-memory copy, which would look like a successful save but vanish on reload.
 */

export interface GalleryItem {
  id: string;
  createdAt: number;
  mode: "freestyle" | "icon" | "story";
  title?: string;
  prompt?: string;
  imageBase64: string;
  mimeType: string;
}

const DB_NAME = "hide-nb-studio-gallery";
const STORE_NAME = "artworks";
const DB_VERSION = 1;
const MAX_GALLERY_ITEMS = 50;

// In-memory fallback
const memoryStore = new Map<string, GalleryItem>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.indexedDB);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete the oldest items beyond MAX_GALLERY_ITEMS by walking the createdAt index,
 * so pruning advances one item at a time instead of loading every stored image.
 * The index has existed since the first database version, so no migration is needed.
 */
function pruneGallery(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = db.transaction(STORE_NAME, "readwrite");
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onerror = () => reject(countRequest.error);
    countRequest.onsuccess = () => {
      let remainingToDelete = countRequest.result - MAX_GALLERY_ITEMS;
      if (remainingToDelete <= 0) {
        resolve();
        return;
      }

      // Oldest first: the items to drop are the first ones out of the index.
      let cursorRequest: IDBRequest<IDBCursorWithValue | null>;
      try {
        cursorRequest = store.index("createdAt").openCursor();
      } catch (error) {
        reject(error);
        return;
      }

      cursorRequest.onerror = () => reject(cursorRequest.error);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || remainingToDelete <= 0) {
          resolve();
          return;
        }
        cursor.delete();
        remainingToDelete -= 1;
        cursor.continue();
      };
    };
  });
}

/**
 * Put one item and wait for the transaction to commit. A quota failure can be
 * reported either on the request or as an abort of the whole transaction, so
 * both are treated as a failed write.
 */
function writeItem(db: IDBDatabase, item: GalleryItem): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Gallery transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("Gallery transaction failed"));

    const putReq = store.put(item);
    putReq.onerror = () => reject(putReq.error);
  });
}

/**
 * Save an artwork to the gallery. Prunes items beyond MAX_GALLERY_ITEMS.
 * Returns null when IndexedDB is present but the write failed, so callers can
 * tell the user the artwork was not saved.
 */
export async function saveToGallery(
  item: Omit<GalleryItem, "id" | "createdAt"> & { id?: string; createdAt?: number },
): Promise<GalleryItem | null> {
  const newItem: GalleryItem = {
    ...item,
    id: item.id || `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: item.createdAt || Date.now(),
  };

  if (!isIndexedDBAvailable()) {
    memoryStore.set(newItem.id, newItem);
    return newItem;
  }

  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch {
    // IndexedDB was present but unusable (blocked/denied upgrade); nothing was
    // persisted, so report the failure rather than pretending to have saved.
    return null;
  }

  try {
    await writeItem(db, newItem);
  } catch {
    // QuotaExceededError and friends: the artwork is not in the database.
    return null;
  }

  try {
    await pruneGallery(db);
  } catch {
    // Pruning is best-effort; the artwork itself was saved.
  }

  return newItem;
}

/**
 * Load all gallery items, newest first.
 */
export async function loadFromGallery(): Promise<GalleryItem[]> {
  if (!isIndexedDBAvailable()) {
    return Array.from(memoryStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as GalleryItem[]) || [];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return Array.from(memoryStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}

/**
 * Delete a single gallery item by id.
 */
export async function deleteFromGallery(id: string): Promise<boolean> {
  if (!isIndexedDBAvailable()) {
    return memoryStore.delete(id);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return memoryStore.delete(id);
  }
}
