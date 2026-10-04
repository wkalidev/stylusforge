import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { MODULES } from "./modules";

describe("MODULES", () => {
  it("lists every lesson once, module by module, in curriculum order", () => {
    expect(MODULES.flatMap((module) => module.lessons)).toEqual(LESSONS);
  });

  it("gives every module a name and a forge zone", () => {
    for (const module of MODULES) {
      expect(module.name.trim()).not.toBe("");
      expect(module.zone.trim()).not.toBe("");
    }
    expect(new Set(MODULES.map((module) => module.id)).size).toBe(MODULES.length);
  });
});
