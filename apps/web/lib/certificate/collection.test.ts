import { describe, expect, it, vi } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { certificateCollection } from "./collection";
import { UNAVAILABLE_LESSON } from "@/test/unavailableLesson";

vi.mock("@/lib/curriculum/lessons", async (importOriginal) =>
  (await import("@/test/unavailableLesson")).withUnavailableLesson(importOriginal),
);

const none = new Set<number>();

describe("certificateCollection", () => {
  it("groups every lesson by module, in curriculum order, skipping modules without lessons", () => {
    const { groups } = certificateCollection(none, none);
    expect(groups.map((group) => group.zone.name)).toEqual(["The Hearth", "The Anvil", "The Mint", "The Bellows"]);
    expect(groups.flatMap((group) => group.cards.map((card) => card.lesson.id))).toEqual(LESSONS.map((lesson) => lesson.id));
  });

  it("keeps curriculum order within a zone, with locked cards where they fall", () => {
    const { groups } = certificateCollection(new Set([9, 11]), none);
    const anvil = groups.find((group) => group.zone.name === "The Anvil")!;
    expect(anvil.cards.map((card) => [card.lesson.id, card.state])).toEqual([
      [9, "claimed"],
      [3, "locked"],
      [10, "locked"],
      [11, "claimed"],
      [12, "locked"],
    ]);
  });

  it("marks passed but unclaimed lessons ready, and unavailable ones coming soon", () => {
    const { groups } = certificateCollection(new Set([1]), new Set([1, 7]));
    const cards = groups.flatMap((group) => group.cards);
    expect(cards.find((card) => card.lesson.id === 1)?.state).toBe("claimed");
    expect(cards.find((card) => card.lesson.id === 7)?.state).toBe("ready");
    expect(cards.find((card) => card.lesson.id === UNAVAILABLE_LESSON)?.state).toBe("soon");
  });

  it("counts claimed certificates against the available lessons only", () => {
    const collection = certificateCollection(new Set([1, 2, 6, 9, 11]), none);
    expect(collection.claimed).toBe(5);
    expect(collection.available).toBe(LESSONS.filter((lesson) => lesson.available).length);
    const availableIn = (module: string) => LESSONS.filter((lesson) => lesson.available && lesson.module === module).length;
    expect(collection.groups.map((group) => [group.claimed, group.available])).toEqual([
      [3, availableIn("foundations")],
      [2, availableIn("contract-logic")],
      [0, availableIn("tokens")],
      [0, availableIn("interoperability")],
    ]);
    expect(collection.groups.map((group) => group.available).slice(0, 2)).toEqual([5, 5]);
  });

  it("never counts a claimed id that is not an available lesson", () => {
    expect(certificateCollection(new Set([UNAVAILABLE_LESSON, 99]), none).claimed).toBe(0);
  });
});
