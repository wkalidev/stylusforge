export interface Rank {
  name: string;
  /** XP needed to reach this rank. */
  minXp: number;
}

/** Ranks in ascending order. Lessons 1 to 4 total 750 XP, so finishing them makes a Master Forger. */
export const RANKS: readonly Rank[] = [
  { name: 'Apprentice', minXp: 0 },
  { name: 'Smith', minXp: 250 },
  { name: 'Master Forger', minXp: 600 },
];

export interface RankProgress {
  rank: Rank;
  /** The next rank, or null at the top rank. */
  next: Rank | null;
  /** XP still needed for the next rank (0 at the top rank). */
  xpToNext: number;
  /** Progress from the current rank to the next one, between 0 and 1 (1 at the top rank). */
  fraction: number;
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
    return { rank, next: null, xpToNext: 0, fraction: 1 };
  }
  return {
    rank,
    next,
    xpToNext: next.minXp - total,
    fraction: (total - rank.minXp) / (next.minXp - rank.minXp),
  };
}
