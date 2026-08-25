/**
 * Minimal in-memory implementation of the Web Storage API, used to stub
 * `localStorage` in tests (no jsdom needed) and as a `StorageLike` for
 * save-slot unit tests.
 */
export function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  const storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };

  return storage as Storage;
}
