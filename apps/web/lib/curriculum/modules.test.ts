import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { MODULES } from "./modules";

describe("MODULES", () => {
  it("lists every lesson once, module by module, in curriculum order", () => {
    expect(MODULES.flatMap((entry) => entry.lessons)).toEqual(LESSONS);
  });

  it("gives every module a name and a forge zone", () => {
    for (const entry of MODULES) {
      expect(entry.name.trim()).not.toBe("");
      expect(entry.zone.trim()).not.toBe("");
    }
    expect(new Set(MODULES.map((entry) => entry.id)).size).toBe(MODULES.length);
  });
});
