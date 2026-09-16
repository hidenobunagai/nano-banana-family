import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteFromGallery,
  loadFromGallery,
  saveToGallery,
  type GalleryItem,
} from "./galleryStorage";

type Handler = () => void;

interface FakeRequest<T = unknown> {
  result: T | undefined;
  error: DOMException | null;
  onsuccess: Handler | null;
  onerror: Handler | null;
  onupgradeneeded: Handler | null;
}

interface FakeOptions {
  /** Fail every put request, the usual way a quota error surfaces. */
  failPutWith?: DOMException;
  /** Abort the transaction at commit instead of failing the put request. */
  abortTransactionOnPut?: DOMException;
  /** Fail `indexedDB.open` (blocked upgrade, private browsing). */
  failOpen?: DOMException;
}

interface FakeIndexedDB {
  factory: IDBFactory;
  records: Map<string, GalleryItem>;
  state: { getAllCalls: number };
}

/**
 * In-memory stand-in for the slice of IndexedDB galleryStorage uses: open, put,
 * count, getAll, the createdAt index cursor, and delete. Callbacks are deferred to
 * microtasks like the real API, and a write transaction commits (or aborts) once
 * its put request has settled.
 */
function createFakeIndexedDB(options: FakeOptions = {}): FakeIndexedDB {
  const records = new Map<string, GalleryItem>();
  const state = { getAllCalls: 0 };

  function request<T>(run: () => T, failWith: DOMException | null = null): FakeRequest<T> {
    const req: FakeRequest<T> = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    queueMicrotask(() => {
      if (failWith) {
        req.error = failWith;
        req.onerror?.();
      } else {
        req.result = run();
        req.onsuccess?.();
      }
    });
    return req;
  }

  function makeDatabase(): IDBDatabase {
    return {
      objectStoreNames: { contains: (name: string) => name === "artworks" },
      createObjectStore: () => ({ createIndex: () => {} }),
      transaction: () => {
        const tx = {
          error: null as DOMException | null,
          oncomplete: null as Handler | null,
          onabort: null as Handler | null,
          onerror: null as Handler | null,
          objectStore: () => store,
        };

        const store = {
          put: (item: GalleryItem) => {
            const req = request(() => records.set(item.id, item), options.failPutWith ?? null);
            // Commit one microtask after the request settles, as IndexedDB does.
            queueMicrotask(() =>
              queueMicrotask(() => {
                if (options.abortTransactionOnPut) {
                  tx.error = options.abortTransactionOnPut;
                  tx.onabort?.();
                } else if (!options.failPutWith) {
                  tx.oncomplete?.();
                }
              }),
            );
            return req;
          },
          count: () => request(() => records.size),
          getAll: () =>
            request(() => {
              state.getAllCalls += 1;
              return [...records.values()];
            }),
          index: () => ({ openCursor: () => makeCursor() }),
          delete: (id: string) => request(() => records.delete(id)),
        };

        return tx;
      },
    } as unknown as IDBDatabase;
  }

  function makeCursor(): FakeRequest<unknown> {
    const req: FakeRequest<unknown> = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    let visited = 0;

    const advance = () => {
      queueMicrotask(() => {
        const items = [...records.values()].sort((a, b) => a.createdAt - b.createdAt);
        if (visited >= items.length) {
          req.result = null;
          req.onsuccess?.();
          return;
        }
        const item = items[visited];
        visited += 1;
        req.result = { delete: () => records.delete(item.id), continue: advance };
        req.onsuccess?.();
      });
    };

    advance();
    return req;
  }

  const factory = {
    open: () => {
      const req: FakeRequest<unknown> = {
        result: undefined,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      queueMicrotask(() => {
        if (options.failOpen) {
          req.error = options.failOpen;
          req.onerror?.();
          return;
        }
        req.result = makeDatabase();
        req.onsuccess?.();
      });
      return req;
    },
  } as unknown as IDBFactory;

  return { factory, records, state };
}

describe("galleryStorage", () => {
  beforeEach(async () => {
    const items = await loadFromGallery();
    for (const item of items) {
      await deleteFromGallery(item.id);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves, loads, and deletes artwork in gallery store", async () => {
    const saved = await saveToGallery({
      mode: "freestyle",
      prompt: "テストプロンプト",
      imageBase64: "QUJD",
      mimeType: "image/png",
    });

    expect(saved).not.toBeNull();
    const item = saved as GalleryItem;
    expect(item.id).toBeDefined();
    expect(item.mode).toBe("freestyle");

    const items = await loadFromGallery();
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(item.id);
    expect(items[0].prompt).toBe("テストプロンプト");

    const deleted = await deleteFromGallery(item.id);
    expect(deleted).toBe(true);

    const itemsAfterDelete = await loadFromGallery();
    expect(itemsAfterDelete.length).toBe(0);
  });

  it("reports a failed write instead of parking the artwork in memory", async () => {
    const fake = createFakeIndexedDB({
      failPutWith: new DOMException("Quota exceeded", "QuotaExceededError"),
    });
    vi.stubGlobal("indexedDB", fake.factory);

    const saved = await saveToGallery({
      mode: "freestyle",
      prompt: "容量オーバー",
      imageBase64: "QUJD",
      mimeType: "image/png",
    });

    expect(saved).toBeNull();
    expect(fake.records.size).toBe(0);

    // Nothing may sit in the in-memory store either: that fallback only serves
    // environments without IndexedDB, and hiding the failure would still lose the
    // artwork on reload.
    expect(await loadFromGallery()).toEqual([]);
  });

  it("reports a failed write when the transaction aborts at commit", async () => {
    const fake = createFakeIndexedDB({
      abortTransactionOnPut: new DOMException("Quota exceeded", "QuotaExceededError"),
    });
    vi.stubGlobal("indexedDB", fake.factory);

    const saved = await saveToGallery({
      mode: "icon",
      imageBase64: "QUJD",
      mimeType: "image/png",
    });

    expect(saved).toBeNull();
  });

  it("reports a failed write when the database cannot be opened", async () => {
    const fake = createFakeIndexedDB({
      failOpen: new DOMException("Blocked", "InvalidStateError"),
    });
    vi.stubGlobal("indexedDB", fake.factory);

    const saved = await saveToGallery({
      mode: "story",
      imageBase64: "QUJD",
      mimeType: "image/png",
    });

    expect(saved).toBeNull();
  });

  it("prunes the oldest overflow through the createdAt cursor without reading every item", async () => {
    const fake = createFakeIndexedDB();
    vi.stubGlobal("indexedDB", fake.factory);

    for (let index = 1; index <= 51; index += 1) {
      const saved = await saveToGallery({
        mode: "icon",
        id: `art-${index}`,
        createdAt: index,
        imageBase64: "QUJD",
        mimeType: "image/png",
      });
      expect(saved).not.toBeNull();
    }

    // Pruning must not go through getAll: that loads every base64 image at once.
    expect(fake.state.getAllCalls).toBe(0);
    expect(fake.records.size).toBe(50);
    expect(fake.records.has("art-1")).toBe(false);
    expect(fake.records.has("art-2")).toBe(true);
    expect(fake.records.has("art-51")).toBe(true);
  });

  it("keeps the in-memory fallback when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);

    const saved = await saveToGallery({
      mode: "freestyle",
      imageBase64: "QUJD",
      mimeType: "image/png",
    });

    expect(saved).not.toBeNull();
    const items = await loadFromGallery();
    expect(items.map((item) => item.id)).toContain((saved as GalleryItem).id);

    await deleteFromGallery((saved as GalleryItem).id);
  });
});
