import { describe, expect, it } from "vitest";

import { RANKS, rankProgress } from "./ranks";

describe("RANKS", () => {
  it("lists the ranks in ascending order of XP, from 0", () => {
    expect(RANKS.map((rank) => [rank.name, rank.minXp])).toEqual([
      ["Apprentice", 0],
      ["Smith", 250],
      ["Journeyman", 750],
      ["Bladesmith", 1800],
      ["Armorer", 3100],
      ["Master Forger", 4800],
      ["Forgemaster", 6000],
    ]);
  });
});

describe("rankProgress", () => {
  it("starts as an Apprentice with no XP", () => {
    expect(rankProgress(0)).toMatchObject({ rank: RANKS[0], next: RANKS[1], xpToNext: 250, fraction: 0 });
  });

  it("reports progress towards the next rank", () => {
    const progress = rankProgress(1000);
    expect(progress.rank.name).toBe("Journeyman");
    expect(progress.next?.name).toBe("Bladesmith");
    expect(progress.xpToNext).toBe(800);
    expect(progress.fraction).toBeCloseTo(250 / 1050);
  });

  it("promotes exactly at the threshold", () => {
    for (const [index, rank] of RANKS.entries()) {
      if (index > 0) {
        expect(rankProgress(rank.minXp - 1).rank).toBe(RANKS[index - 1]);
      }
      expect(rankProgress(rank.minXp).rank).toBe(rank);
    }
    expect(rankProgress(750).fraction).toBe(0);
  });

  it("caps at the top rank", () => {
    expect(rankProgress(6000)).toMatchObject({ rank: RANKS[6], next: null, xpToNext: 0, fraction: 1 });
    expect(rankProgress(7000).rank.name).toBe("Forgemaster");
  });

  it("treats negative XP as zero", () => {
    expect(rankProgress(-10).rank.name).toBe("Apprentice");
    expect(rankProgress(-10).fraction).toBe(0);
  });

  it("measures XP against the next threshold, without resetting on a rank-up", () => {
    expect(rankProgress(0).thresholdFraction).toBe(0);
    expect(rankProgress(250).thresholdFraction).toBeCloseTo(250 / 750);
    expect(rankProgress(750).thresholdFraction).toBeCloseTo(750 / 1800);
    expect(rankProgress(6000).thresholdFraction).toBe(1);
  });
});
