import { describe, expect, it } from "vitest";

import modules from "../../../../curriculum/modules.json";
import { LESSONS } from "@/lib/curriculum/lessons";
import { ZONES, zoneOf } from "./zones";

/** Relative luminance (WCAG) of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("ZONES", () => {
  it("gives every module a zone, in curriculum order, named after modules.json", () => {
    expect(ZONES.map(({ moduleId, module, name, index }) => ({ id: moduleId, name: module, zone: name, index }))).toEqual(
      modules.map((entry, index) => ({ ...entry, index: index + 1 })),
    );
  });

  it("resolves the zone of every lesson", () => {
    for (const lesson of LESSONS) {
      expect(zoneOf(lesson.module).moduleId).toBe(lesson.module);
    }
    expect(() => zoneOf("missing")).toThrow();
  });

  it("gives each zone its own accent, motif and glyph", () => {
    for (const key of ["accent", "motif", "glyph"] as const) {
      expect(new Set(ZONES.map((zone) => zone[key])).size).toBe(ZONES.length);
    }
  });

  it("uses plain #rrggbb colors", () => {
    for (const zone of ZONES) {
      for (const color of [zone.accent, zone.light, ...zone.plate]) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("keeps The Hearth and The Mint apart in lightness, not only hue", () => {
    const ratio = luminance(zoneOf("tokens").accent) / luminance(zoneOf("foundations").accent);
    expect(ratio).toBeGreaterThan(2);
  });
});
