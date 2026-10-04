import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { metadataUri } from "../scripts/metadata-uri.js";

describe("metadataUri", function () {
  it("appends the metadata route to a bare https domain", function () {
    assert.equal(metadataUri("https://stylusforge.example"), "https://stylusforge.example/api/metadata/{id}");
    assert.equal(metadataUri("https://stylusforge.wkalidev.com"), "https://stylusforge.wkalidev.com/api/metadata/{id}");
  });

  it("accepts http only for localhost, with a port", function () {
    assert.equal(metadataUri("http://localhost:3000"), "http://localhost:3000/api/metadata/{id}");
    assert.throws(() => metadataUri("http://stylusforge.example"), /https/);
  });

  it("refuses the full metadata URL, raw or encoded", function () {
    assert.throws(() => metadataUri("https://stylusforge.example/api/metadata/{id}"), /domain only.*\{id\}/);
    assert.throws(() => metadataUri("https://stylusforge.example/api/metadata/%7Bid%7D"), /domain only.*\{id\}/);
  });

  it("refuses a path", function () {
    assert.throws(() => metadataUri("https://stylusforge.example/api/metadata"), /domain only.*remove the path \/api\/metadata/);
    assert.throws(() => metadataUri("https://example.com/forge"), /remove the path \/forge/);
  });

  it("refuses a trailing slash", function () {
    assert.throws(() => metadataUri("https://stylusforge.example/"), /domain only.*remove the trailing slash/);
    assert.throws(() => metadataUri("http://localhost:3000/"), /trailing slash/);
  });

  it("refuses queries, fragments and credentials", function () {
    assert.throws(() => metadataUri("https://stylusforge.example?a=1"), /query or fragment/);
    assert.throws(() => metadataUri("https://stylusforge.example#top"), /query or fragment/);
    assert.throws(() => metadataUri("https://user:secret@stylusforge.example"), /credentials/);
  });

  it("refuses a value that is not a URL", function () {
    assert.throws(() => metadataUri("stylusforge.example"), /not a URL/);
  });

  it("says what to pass and that the route is added by the script", function () {
    assert.throws(
      () => metadataUri("https://stylusforge.example/"),
      (error: Error) => error.message.includes("like https://stylusforge.example") && error.message.includes("adds /api/metadata/{id} itself"),
    );
  });
});
