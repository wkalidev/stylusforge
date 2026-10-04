import { describe, expect, it } from "vitest";

import { certificateSvg, escapeXml } from "./svg";

describe("escapeXml", () => {
  it("escapes markup characters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;");
  });
});

describe("certificateSvg", () => {
  const lesson = { id: 3, title: "Events and Errors", xp: 200, difficulty: "Intermediate" };

  it("is a standalone SVG naming the lesson", () => {
    const svg = certificateSvg(lesson);
    expect(svg.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"")).toBe(true);
    expect(svg).toContain(">Events and Errors</text>");
    expect(svg).toContain(">200 XP</text>");
    expect(svg).toContain("Lesson 3, Intermediate");
    expect(svg).not.toMatch(/href=|url\(http|<script/);
  });

  it("escapes the title", () => {
    const svg = certificateSvg({ ...lesson, title: "<script>alert(1)</script>" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });
});
