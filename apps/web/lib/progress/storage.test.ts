import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

const blockedStorage: Storage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

/** Fresh module per test, with window.localStorage replaced by the given storage. */
async function loadWith(localStorage: Storage) {
  vi.stubGlobal("window", { localStorage, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.resetModules();
  return import("./storage");
}

describe("storage", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("reads back what it writes and notifies subscribers", async () => {
    const { readItem, writeItem, subscribe } = await loadWith(memoryStorage());
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    writeItem("k", "v");
    expect(readItem("k")).toBe("v");
    expect(listener).toHaveBeenCalledTimes(1);

    writeItem("k", null);
    expect(readItem("k")).toBeNull();
    unsubscribe();
    writeItem("k", "w");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps values in memory when localStorage is blocked", async () => {
    const { readItem, writeItem } = await loadWith(blockedStorage);

    expect(readItem("k")).toBeNull();
    writeItem("k", "v");
    expect(readItem("k")).toBe("v");
    writeItem("k", null);
    expect(readItem("k")).toBeNull();
  });
});
