import { describe, expect, it, vi } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { SOLUTIONS } from "@/lib/curriculum/solutions";
import { POST } from "./route";
import { UNAVAILABLE_LESSON } from "@/test/unavailableLesson";

vi.mock("@/lib/curriculum/lessons", async (importOriginal) =>
  (await import("@/test/unavailableLesson")).withUnavailableLesson(importOriginal),
);

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

  it("refuses the starter code and returns the objectives it misses", async () => {
    const lesson = LESSONS.find((candidate) => candidate.id === 1)!;
    const response = await post({ lessonId: 1, code: lesson.exercise!.starterCode });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.solution).toBeUndefined();
    expect(body.objectives).toEqual(lesson.exercise!.checks.map((check) => check.objective));
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
    ["an unavailable lesson", { lessonId: UNAVAILABLE_LESSON, code: "" }, 404],
  ])("rejects %s", async (_label, body, status) => {
    expect((await post(body)).status).toBe(status);
  });

  it("answers 413 to a declared body over 200,000 bytes, before reading it", async () => {
    let pulled = false;
    const body = new ReadableStream(
      {
        pull(controller) {
          pulled = true;
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );
    const response = await POST(
      new Request("http://localhost/api/solution", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "200001" },
        body,
        duplex: "half",
      } as RequestInit),
    );
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error).toBe("The request body is too large.");
    expect(pulled).toBe(false);
  });

  it("answers 413 to a chunked body that grows past 200,000 bytes", async () => {
    const chunk = new TextEncoder().encode("x".repeat(64 * 1024));
    let sent = 0;
    const body = new ReadableStream({
      pull(controller) {
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const response = await POST(new Request("http://localhost/api/solution", { method: "POST", body, duplex: "half" } as RequestInit));
    expect(response.status).toBe(413);
    expect(sent).toBeLessThan(400_000);
  });

  it("still answers code of the maximum length, mostly escaped quotes", async () => {
    // 50,000 characters, about 49,000 of them quotes that JSON escapes to 2 bytes: ~100 kB.
    const code = `${SOLUTIONS[2]}${'"'.repeat(50_000)}`.slice(0, 50_000);
    const response = await post({ lessonId: 2, code });
    expect(response.status).toBe(200);
  });
});
