export interface Rank {
  name: string;
  /** XP needed to reach this rank. */
  minXp: number;
}

/**
 * Ranks in ascending order, for the full curriculum (6000 XP). Each new rank lands on the last
 * lesson of a module: Journeyman ends Foundations (775 XP), Bladesmith Contract logic (1850),
 * Armorer Tokens (3150); Master Forger needs two lessons of Stylus specifics (4850) and
 * Forgemaster every lesson.
 */
export const RANKS: readonly Rank[] = [
  { name: 'Apprentice', minXp: 0 },
  { name: 'Smith', minXp: 250 },
  { name: 'Journeyman', minXp: 750 },
  { name: 'Bladesmith', minXp: 1800 },
  { name: 'Armorer', minXp: 3100 },
  { name: 'Master Forger', minXp: 4800 },
  { name: 'Forgemaster', minXp: 6000 },
];

export interface RankProgress {
  rank: Rank;
  /** The next rank, or null at the top rank. */
  next: Rank | null;
  /** XP still needed for the next rank (0 at the top rank). */
  xpToNext: number;
  /** Progress from the current rank to the next one, between 0 and 1 (1 at the top rank). */
  fraction: number;
  /**
   * XP as a share of the next rank's threshold, between 0 and 1 (1 at the top rank). Unlike
   * `fraction`, it does not drop to 0 on a rank-up.
   */
  thresholdFraction: number;
}

export function rankProgress(xp: number): RankProgress {
  const total = Math.max(0, xp);
  let index = 0;
  while (index + 1 < RANKS.length && total >= RANKS[index + 1].minXp) {
    index += 1;
  }
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  if (!next) {
    return { rank, next: null, xpToNext: 0, fraction: 1, thresholdFraction: 1 };
  }
  return {
    rank,
    next,
    xpToNext: next.minXp - total,
    fraction: (total - rank.minXp) / (next.minXp - rank.minXp),
    thresholdFraction: total / next.minXp,
  };
}
