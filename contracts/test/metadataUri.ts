import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { metadataUri } from "../scripts/metadata-uri.js";

describe("metadataUri", function () {
  it("appends the metadata route to an https origin", function () {
    assert.equal(metadataUri("https://stylusforge.example"), "https://stylusforge.example/api/metadata/{id}");
    assert.equal(metadataUri("https://stylusforge.example/"), "https://stylusforge.example/api/metadata/{id}");
  });

  it("keeps a base path", function () {
    assert.equal(metadataUri("https://example.com/forge/"), "https://example.com/forge/api/metadata/{id}");
  });

  it("accepts http only for localhost", function () {
    assert.equal(metadataUri("http://localhost:3000"), "http://localhost:3000/api/metadata/{id}");
    assert.throws(() => metadataUri("http://stylusforge.example"), /https/);
  });

  it("rejects malformed bases", function () {
    assert.throws(() => metadataUri("stylusforge.example"), /not a URL/);
    assert.throws(() => metadataUri("https://stylusforge.example/?a=1"), /query/);
  });
});
