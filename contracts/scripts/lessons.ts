import { readFileSync } from "node:fs";

export interface Lesson {
  id: bigint;
  name: string;
  xp: bigint;
}

/** curriculum/lessons.json: the single source of truth for lesson ids, names and XP. */
export const LESSONS_PATH = new URL("../../curriculum/lessons.json", import.meta.url);

/** curriculum/modules.json: the modules, in curriculum order. */
export const MODULES_PATH = new URL("../../curriculum/modules.json", import.meta.url);

/** Reads curriculum/modules.json and returns the module ids, in order. */
function loadModuleIds(): string[] {
  const raw: unknown = JSON.parse(readFileSync(MODULES_PATH, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("curriculum/modules.json must be a non-empty array");
  }
  const ids = raw.map((entry: unknown, index) => {
    const { id, name, zone } = (entry ?? {}) as Record<string, unknown>;
    for (const [field, value] of Object.entries({ id, name, zone })) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`curriculum/modules.json[${index}]: ${field} must be a non-empty string`);
      }
    }
    return id as string;
  });
  if (new Set(ids).size !== ids.length) {
    throw new Error("curriculum/modules.json: module ids must be unique");
  }
  return ids;
}

/**
 * Reads and validates curriculum/lessons.json and returns the available lessons, with ids
 * and XP converted to bigint for the contract. Unavailable lessons ("available": false) are
 * listed in the curriculum but never registered on-chain, since a registered lesson cannot change.
 * Every lesson belongs to a module of curriculum/modules.json, and lessons are listed module by
 * module, in the order of modules.json.
 */
export function loadLessons(): Lesson[] {
  const moduleIds = loadModuleIds();
  const raw: unknown = JSON.parse(readFileSync(LESSONS_PATH, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("curriculum/lessons.json must be a non-empty array");
  }

  const seen = new Set<number>();
  let moduleIndex = 0;
  const lessons = raw.map((entry: unknown, index) => {
    const { id, name, xp, available, module } = (entry ?? {}) as Record<string, unknown>;
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
    const lessonModuleIndex = typeof module === "string" ? moduleIds.indexOf(module) : -1;
    if (lessonModuleIndex === -1) {
      throw new Error(`curriculum/lessons.json[${index}]: module must be an id from curriculum/modules.json`);
    }
    if (lessonModuleIndex < moduleIndex) {
      throw new Error(`curriculum/lessons.json[${index}]: lessons must be listed module by module, in the order of curriculum/modules.json`);
    }
    moduleIndex = lessonModuleIndex;
    return { id: BigInt(id), name, xp: BigInt(xp), available };
  });

  return lessons
    .filter((lesson) => lesson.available)
    .map(({ id, name, xp }) => ({ id, name, xp }));
}
