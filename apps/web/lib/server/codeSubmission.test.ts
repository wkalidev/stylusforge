import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { SOLUTIONS } from "@/lib/curriculum/solutions";
import { MAX_BODY_BYTES, MAX_CODE_LENGTH } from "./codeSubmission";

describe("code submission limits", () => {
  it("leave room for twice the longest reference solution or starter", () => {
    const lengths = LESSONS.flatMap((lesson) =>
      lesson.available ? [SOLUTIONS[lesson.id].length, lesson.exercise.starterCode.length] : [],
    );
    expect(2 * Math.max(...lengths)).toBeLessThanOrEqual(MAX_CODE_LENGTH);
  });

  it("fit the longest accepted code once encoded as JSON", () => {
    // A UTF-16 unit takes at most 3 bytes in UTF-8, plus a little for the rest of the body.
    expect(MAX_BODY_BYTES).toBeGreaterThan(3 * MAX_CODE_LENGTH);
  });
});
