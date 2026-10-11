import { describe, expect, it } from "vitest";

import { SITE_URL } from "@/lib/site";
import { GET } from "./route";

function get(url: string, id: string) {
  return GET(new Request(url), { params: Promise.resolve({ id }) });
}

describe("GET /api/metadata/[id]", () => {
  it("links to the canonical site whatever host the request came through", async () => {
    const response = await get("https://stylusforge-git-preview.vercel.app/api/metadata/1", "1");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.image).toBe(`${SITE_URL}/api/metadata/1/image`);
    expect(body.external_url).toBe(`${SITE_URL}/learn/hello-world`);
    expect(JSON.stringify(body)).not.toContain("vercel.app");
  });

  it("accepts the 64-hex-digit {id} substitution", async () => {
    const response = await get(`${SITE_URL}/api/metadata/x`, "1".padStart(64, "0"));
    expect((await response.json()).image).toBe(`${SITE_URL}/api/metadata/1/image`);
  });

  it("answers 404 for an id without a certificate", async () => {
    expect((await get(`${SITE_URL}/api/metadata/999`, "999")).status).toBe(404);
  });
});
