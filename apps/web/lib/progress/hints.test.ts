import { afterEach, describe, expect, it, vi } from "vitest";

import { parseRevealedHints } from "./hints";

describe("parseRevealedHints", () => {
  it("reads revealed hint counts by check index", () => {
    expect(parseRevealedHints("[0,2,1]")).toEqual([0, 2, 1]);
  });

  it("treats malformed entries as no hint revealed", () => {
    expect(parseRevealedHints('[1,-1,"2",1.5,null,3]')).toEqual([1, 0, 0, 0, 0, 3]);
  });

  it("ignores missing or malformed values", () => {
    expect(parseRevealedHints(null)).toEqual([]);
    expect(parseRevealedHints("not json")).toEqual([]);
    expect(parseRevealedHints('{"0":1}')).toEqual([]);
  });
});

describe("revealNextHint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function load() {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
        removeItem: (key: string) => void values.delete(key),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.resetModules();
    const hints = await import("./hints");
    return { ...hints, stored: (lessonId: number) => values.get(`stylusforge:hints:v1:${lessonId}`) ?? null };
  }

  it("reveals one more hint for the given check only", async () => {
    const { revealNextHint, stored } = await load();
    revealNextHint(2, 1, 3);
    revealNextHint(2, 1, 3);
    revealNextHint(2, 3, 3);
    expect(parseRevealedHints(stored(2))).toEqual([0, 2, 0, 1]);
    expect(stored(1)).toBeNull();
  });

  it("never reveals more hints than the check has", async () => {
    const { revealNextHint, stored } = await load();
    for (let i = 0; i < 5; i += 1) {
      revealNextHint(1, 0, 2);
    }
    expect(parseRevealedHints(stored(1))).toEqual([2]);
  });
});
