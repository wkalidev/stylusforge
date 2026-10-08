import { describe, expect, it, vi } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { certificateLesson, certificateMetadata, parseTokenId } from "./metadata";
import { UNAVAILABLE_LESSON } from "@/test/unavailableLesson";

vi.mock("@/lib/curriculum/lessons", async (importOriginal) =>
  (await import("@/test/unavailableLesson")).withUnavailableLesson(importOriginal),
);

describe("parseTokenId", () => {
  it("accepts decimal ids", () => {
    expect(parseTokenId("1")).toBe(1);
    expect(parseTokenId("42")).toBe(42);
  });

  it("accepts the 64-hex-digit {id} substitution", () => {
    expect(parseTokenId("0000000000000000000000000000000000000000000000000000000000000004")).toBe(4);
    expect(parseTokenId("000000000000000000000000000000000000000000000000000000000000000A")).toBe(10);
  });

  it.each(["", "0", "-1", "1.5", "0x1", "abc", "1e3", "0".repeat(63) + "g", "9".repeat(16)])(
    "rejects %j",
    (raw) => {
      expect(parseTokenId(raw)).toBeNull();
    },
  );
});

describe("certificateLesson", () => {
  it("returns available lessons only", () => {
    expect(certificateLesson(1)?.slug).toBe("hello-world");
    expect(certificateLesson(UNAVAILABLE_LESSON)).toBeNull();
    expect(certificateLesson(99)).toBeNull();
  });
});

describe("certificateMetadata", () => {
  it("describes the lesson with absolute URLs", () => {
    const lesson = LESSONS[0];
    const metadata = certificateMetadata(lesson, "https://stylusforge.example");
    expect(metadata.name).toContain(lesson.title);
    expect(metadata.image).toBe(`https://stylusforge.example/api/metadata/${lesson.id}/image`);
    expect(metadata.external_url).toBe(`https://stylusforge.example/learn/${lesson.slug}`);
    expect(metadata.attributes).toContainEqual({ trait_type: "XP", value: lesson.xp, display_type: "number" });
  });

  it("names the module and its forge zone, so marketplaces can filter by them", () => {
    const anvil = LESSONS.find((lesson) => lesson.id === 3)!;
    const { attributes } = certificateMetadata(anvil, "https://stylusforge.example");
    expect(attributes).toContainEqual({ trait_type: "Module", value: "Contract logic" });
    expect(attributes).toContainEqual({ trait_type: "Zone", value: "The Anvil" });
  });
});
