/**
 * IndexedDB-backed local gallery for persisting generated images on the client.
 * Falls back to in-memory store in environments where IndexedDB is unavailable (SSR, testing).
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
 * Save an artwork to the gallery. Prunes items beyond MAX_GALLERY_ITEMS.
 */
export async function saveToGallery(
  item: Omit<GalleryItem, "id" | "createdAt"> & { id?: string; createdAt?: number },
): Promise<GalleryItem> {
  const newItem: GalleryItem = {
    ...item,
    id: item.id || `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: item.createdAt || Date.now(),
  };

  if (!isIndexedDBAvailable()) {
    memoryStore.set(newItem.id, newItem);
    return newItem;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const putReq = store.put(newItem);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    // Prune oldest items if count exceeds limit
    const allItems = await loadFromGallery();
    if (allItems.length > MAX_GALLERY_ITEMS) {
      const itemsToDelete = allItems.slice(MAX_GALLERY_ITEMS);
      const deleteTx = db.transaction(STORE_NAME, "readwrite");
      const delStore = deleteTx.objectStore(STORE_NAME);
      for (const toDelete of itemsToDelete) {
        delStore.delete(toDelete.id);
      }
    }

    return newItem;
  } catch {
    memoryStore.set(newItem.id, newItem);
    return newItem;
  }
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
