import { describe, expect, it } from "vitest";

import { LESSONS } from "@/lib/curriculum/lessons";
import { certificateSvg, escapeXml, titleLines } from "./svg";
import { zoneOf } from "./zones";

const NETWORK = "Arbitrum Sepolia";
const events = { id: 3, title: "Events and Errors", xp: 200, difficulty: "Intermediate", module: "contract-logic" };

/** The text content of every <text> element, in order. */
function texts(svg: string): string[] {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
}

describe("escapeXml", () => {
  it("escapes markup characters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;");
  });
});

describe("titleLines", () => {
  it("keeps short titles and single words on one line", () => {
    expect(titleLines("Mappings")).toEqual(["Mappings"]);
    expect(titleLines("ERC-20 Token")).toEqual(["ERC-20 Token"]);
    expect(titleLines("Interoperability")).toEqual(["Interoperability"]);
  });

  it("breaks long titles between words, balancing the two lines", () => {
    expect(titleLines("Payable and sending ETH")).toEqual(["Payable and", "sending ETH"]);
    expect(titleLines("Hello World Stylus")).toEqual(["Hello World", "Stylus"]);
  });

  it("gives the first line the extra word on a tie", () => {
    expect(titleLines("Events and Errors")).toEqual(["Events and", "Errors"]);
  });
});

describe("certificateSvg", () => {
  const svg = certificateSvg(events, NETWORK);

  it("is a square, standalone SVG with no scripts or external resources", () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000"')).toBe(true);
    expect(svg).not.toMatch(/<script|<image|<foreignObject|<style|@import|href=|url\((?!#)/);
  });

  it("puts the title, in its largest type, under the certificate line", () => {
    const all = texts(svg);
    expect(all.indexOf("CERTIFICATE OF COMPLETION")).toBeLessThan(all.indexOf("Events and"));
    expect(all).toContain("Errors");
    const sizes = [...svg.matchAll(/font-size="(\d+)"[^>]*>([^<]*)<\/text>/g)].map(([, size, text]) => ({ size: Number(size), text }));
    const largest = Math.max(...sizes.map(({ size }) => size));
    expect(sizes.filter(({ size }) => size === largest).map(({ text }) => text)).toEqual(["Events and", "Errors"]);
  });

  it("shows the zone badge, the module, the lesson number, the difficulty and the XP", () => {
    const all = texts(svg);
    expect(all).toContain("ZONE 2 · THE ANVIL");
    expect(all).toContain("Contract logic");
    expect(all).toContain("03");
    expect(all).toContain("Intermediate");
    expect(all).toContain("200");
  });

  it("fills one difficulty pip per level", () => {
    const filled = (difficulty: string) =>
      [...certificateSvg({ ...events, difficulty }, NETWORK).matchAll(/<circle cx="\d+" cy="774" r="11" fill="(#[0-9a-f]{6}|none)"/g)].filter(
        ([, fill]) => fill !== "none",
      ).length;
    expect([filled("Beginner"), filled("Intermediate"), filled("Advanced")]).toEqual([1, 2, 3]);
  });

  it("names the network it was given, never a hardcoded one", () => {
    expect(texts(svg)).toContain("SOUL-BOUND · ARBITRUM SEPOLIA");
    expect(texts(certificateSvg(events, "Hardhat"))).toContain("SOUL-BOUND · HARDHAT");
  });

  it("escapes the title and the network", () => {
    const hostile = certificateSvg({ ...events, title: "<script>alert(1)</script>" }, "<b>&");
    expect(hostile).not.toMatch(/<script|<b>/);
    expect(hostile).toContain("&lt;script&gt;");
    expect(hostile).toContain("&lt;B&gt;&amp;");
  });

  it("squeezes a line that would overflow with a wide fallback font, and only then", () => {
    expect(svg).not.toMatch(/textLength="860"/);
    const long = certificateSvg({ ...events, title: "Supercalifragilisticexpialidocious" }, NETWORK);
    expect(long).toMatch(/textLength="860" lengthAdjust="spacingAndGlyphs">Supercalifragilisticexpialidocious</);
  });

  it("refers only to gradients it defines, under ids unique to the lesson", () => {
    const defined = [...svg.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);
    const used = [...svg.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id);
    expect(new Set(used).size).toBeGreaterThan(0);
    for (const id of used) expect(defined).toContain(id);
    for (const id of defined) expect(id.startsWith("sf-cert-3-")).toBe(true);
    const other = certificateSvg({ ...events, id: 9 }, NETWORK);
    expect([...other.matchAll(/ id="([^"]+)"/g)].some(([, id]) => defined.includes(id))).toBe(false);
  });

  it("draws every lesson in its module's zone colors", () => {
    for (const lesson of LESSONS) {
      const zone = zoneOf(lesson.module);
      const drawn = certificateSvg(lesson, NETWORK);
      expect(drawn).toContain(`stop-color="${zone.plate[0]}"`);
      expect(drawn).toContain(`stroke="${zone.accent}"`);
      expect(texts(drawn)).toContain(`ZONE ${zone.index} · ${zone.name.toUpperCase()}`);
    }
  });
});
