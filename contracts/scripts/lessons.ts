import { readFileSync } from "node:fs";

export interface Lesson {
  id: bigint;
  name: string;
  xp: bigint;
}

/** curriculum/lessons.json: the single source of truth for lesson ids, names and XP. */
export const LESSONS_PATH = new URL("../../curriculum/lessons.json", import.meta.url);

/**
 * Reads and validates curriculum/lessons.json and returns the available lessons, with ids
 * and XP converted to bigint for the contract. Unavailable lessons ("available": false) are
 * listed in the curriculum but never registered on-chain, since a registered lesson cannot change.
 */
export function loadLessons(): Lesson[] {
  const raw: unknown = JSON.parse(readFileSync(LESSONS_PATH, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("curriculum/lessons.json must be a non-empty array");
  }

  const seen = new Set<number>();
  const lessons = raw.map((entry: unknown, index) => {
    const { id, name, xp, available } = (entry ?? {}) as Record<string, unknown>;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error(`curriculum/lessons.json[${index}]: id must be a positive integer`);
    }
    if (seen.has(id)) {
      throw new Error(`curriculum/lessons.json[${index}]: duplicate id ${id}`);
    }
    seen.add(id);
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`curriculum/lessons.json[${index}]: name must be a non-empty string`);
    }
    if (typeof xp !== "number" || !Number.isSafeInteger(xp) || xp < 0) {
      throw new Error(`curriculum/lessons.json[${index}]: xp must be a non-negative integer`);
    }
    if (typeof available !== "boolean") {
      throw new Error(`curriculum/lessons.json[${index}]: available must be a boolean`);
    }
    return { id: BigInt(id), name, xp: BigInt(xp), available };
  });

  return lessons
    .filter((lesson) => lesson.available)
    .map(({ id, name, xp }) => ({ id, name, xp }));
}
