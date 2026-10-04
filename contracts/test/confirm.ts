import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PassThrough } from "node:stream";

import { confirm, isYes } from "../scripts/confirm.js";

/** A terminal-like input that answers once, and an output that records the prompt. */
function terminal(answer: string, isTTY = true) {
  const input = Object.assign(new PassThrough(), { isTTY });
  const output = new PassThrough();
  let written = "";
  output.on("data", (chunk) => (written += chunk));
  setImmediate(() => input.write(`${answer}\n`));
  return { input, output, written: () => written };
}

describe("isYes", function () {
  it("accepts y and yes in any case", function () {
    for (const answer of ["y", "Y", "yes", "YES", " yes "]) assert.equal(isYes(answer), true, answer);
  });

  it("refuses everything else, the empty answer included", function () {
    for (const answer of ["", "n", "no", "yep", "sure"]) assert.equal(isYes(answer), false, answer);
  });
});

describe("confirm", function () {
  it("asks the question and resolves true on yes", async function () {
    const io = terminal("y");
    assert.equal(await confirm("Send?", io.input, io.output), true);
    assert.match(io.written(), /Send\? \[y\/N\]/);
  });

  it("resolves false on an empty answer or no", async function () {
    for (const answer of ["", "no"]) {
      const io = terminal(answer);
      assert.equal(await confirm("Send?", io.input, io.output), false, JSON.stringify(answer));
    }
  });

  it("resolves false without asking when there is no terminal", async function () {
    const io = terminal("y", false);
    assert.equal(await confirm("Send?", io.input, io.output), false);
    assert.equal(io.written(), "");
  });
});
