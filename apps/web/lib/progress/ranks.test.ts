import { describe, expect, it } from "vitest";

import { RANKS, rankProgress } from "./ranks";

describe("rankProgress", () => {
  it("starts as an Apprentice with no XP", () => {
    expect(rankProgress(0)).toEqual({ rank: RANKS[0], next: RANKS[1], xpToNext: 250, fraction: 0 });
  });

  it("reports progress towards the next rank", () => {
    const progress = rankProgress(100);
    expect(progress.rank.name).toBe("Apprentice");
    expect(progress.xpToNext).toBe(150);
    expect(progress.fraction).toBeCloseTo(0.4);
  });

  it("promotes exactly at the threshold", () => {
    expect(rankProgress(249).rank.name).toBe("Apprentice");
    expect(rankProgress(250).rank.name).toBe("Smith");
    expect(rankProgress(250).fraction).toBe(0);
    expect(rankProgress(600).rank.name).toBe("Master Forger");
  });

  it("caps at the top rank", () => {
    expect(rankProgress(750)).toEqual({ rank: RANKS[2], next: null, xpToNext: 0, fraction: 1 });
  });

  it("treats negative XP as zero", () => {
    expect(rankProgress(-10).rank.name).toBe("Apprentice");
    expect(rankProgress(-10).fraction).toBe(0);
  });
});
