import { createMemoryStorage } from "@/test/memory-storage";

// The store's persist middleware and the save-slot system both touch
// `localStorage` as soon as any state changes. Node has no such global, so
// every test file gets a fresh in-memory stand-in before it runs.
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
