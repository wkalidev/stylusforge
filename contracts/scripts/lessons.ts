import { readFileSync } from "node:fs";

export interface Lesson {
  id: bigint;
  name: string;
  xp: bigint;
}

/** curriculum/lessons.json: the single source of truth for lesson ids, names and XP. */
export const LESSONS_PATH = new URL("../../curriculum/lessons.json", import.meta.url);

/** Reads and validates curriculum/lessons.json, converting ids and XP to bigint for the contract. */
export function loadLessons(): Lesson[] {
  const raw: unknown = JSON.parse(readFileSync(LESSONS_PATH, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("curriculum/lessons.json must be a non-empty array");
  }

  const seen = new Set<number>();
  return raw.map((entry: unknown, index) => {
    const { id, name, xp } = (entry ?? {}) as Record<string, unknown>;
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
    return { id: BigInt(id), name, xp: BigInt(xp) };
  });
}
