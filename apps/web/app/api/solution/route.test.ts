import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { SOLUTIONS } from "@/lib/curriculum/solutions";
import { POST } from "./route";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/solution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/solution", () => {
  it("returns the reference solution to code that passes the checks", async () => {
    const response = await post({ lessonId: 2, code: SOLUTIONS[2] });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ lessonId: 2, solution: SOLUTIONS[2] });
  });

  it("refuses the starter code and returns the hints", async () => {
    const lesson = LESSONS.find((candidate) => candidate.id === 1)!;
    const response = await post({ lessonId: 1, code: lesson.exercise!.starterCode });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.solution).toBeUndefined();
    expect(body.hints.length).toBeGreaterThan(0);
  });

  it("refuses a solution copied into comments", async () => {
    const response = await post({ lessonId: 1, code: `/* ${SOLUTIONS[1]} */` });
    expect(response.status).toBe(422);
  });

  it("does not leak another lesson's solution", async () => {
    const response = await post({ lessonId: 3, code: SOLUTIONS[1] });
    expect(response.status).toBe(422);
  });

  it.each([
    ["invalid JSON", "{", 400],
    ["a non-integer lesson id", { lessonId: "1", code: "" }, 400],
    ["oversized code", { lessonId: 1, code: "x".repeat(50_001) }, 400],
    ["an unknown lesson", { lessonId: 99, code: "" }, 404],
    ["an unavailable lesson", { lessonId: 5, code: "" }, 404],
  ])("rejects %s", async (_label, body, status) => {
    expect((await post(body)).status).toBe(status);
  });
});
