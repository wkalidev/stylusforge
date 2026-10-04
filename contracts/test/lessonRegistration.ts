import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planLessonRegistration } from "../scripts/lesson-registration.js";

const HELLO = { id: 1n, name: "Hello World Stylus", xp: 100n };
const STORAGE = { id: 2n, name: "Storage and State", xp: 150n };
const MAPPINGS = { id: 6n, name: "Mappings", xp: 150n };

describe("planLessonRegistration", function () {
  it("registers every lesson on a contract without lessons", function () {
    assert.deepEqual(planLessonRegistration([HELLO, STORAGE], []), { toAdd: [HELLO, STORAGE], unchanged: [] });
  });

  it("registers only the missing lessons, in curriculum order", function () {
    assert.deepEqual(planLessonRegistration([HELLO, MAPPINGS, STORAGE], [STORAGE, HELLO]), {
      toAdd: [MAPPINGS],
      unchanged: [HELLO, STORAGE],
    });
  });

  it("has nothing to do when everything is registered", function () {
    assert.deepEqual(planLessonRegistration([HELLO, STORAGE], [HELLO, STORAGE]).toAdd, []);
  });

  it("refuses a registered lesson whose name or XP changed", function () {
    assert.throws(
      () => planLessonRegistration([{ ...HELLO, name: "Hello Stylus" }, MAPPINGS], [HELLO]),
      /lesson 1 is registered as "Hello World Stylus" \(100 XP\), the curriculum says "Hello Stylus" \(100 XP\)/,
    );
    assert.throws(() => planLessonRegistration([{ ...HELLO, xp: 120n }], [HELLO]), /cannot change on-chain/);
  });

  it("refuses a registered lesson that is no longer available", function () {
    assert.throws(() => planLessonRegistration([HELLO], [HELLO, STORAGE]), /lesson 2 \(Storage and State\) is registered/);
  });
});
