import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { callSimulation, readMapping, type LessonSimulation, type SimState } from "./simulation";
import { SIM_ACCOUNTS, getSimulation } from "./simulations";
import { SOLUTIONS } from "./solutions";

const [alice, bob] = SIM_ACCOUNTS;

/** Runs calls in sequence and returns every result. */
function run(simulation: LessonSimulation, calls: [string, Record<string, string>, typeof alice][]) {
  let state: SimState = simulation.initialState();
  return calls.map(([fn, args, caller]) => {
    const result = callSimulation(simulation, state, fn, args, caller);
    state = result.state;
    return result;
  });
}

describe("lesson simulations", () => {
  it("cover every available lesson with the functions of its reference solution", () => {
    for (const lesson of LESSONS.filter((candidate) => candidate.available)) {
      const simulation = getSimulation(lesson.id);
      expect(simulation, lesson.title).not.toBeNull();
      const publicFns = [...SOLUTIONS[lesson.id].matchAll(/pub fn (\w+)/g)].map((match) => match[1]).sort();
      expect(simulation!.functions.map((fn) => fn.name).sort(), lesson.title).toEqual(publicFns);
    }
  });

  it("lesson 1 stores and returns a greeting", () => {
    const [, read] = run(getSimulation(1)!, [
      ["set_greeting", { greeting: "gm Stylus" }, alice],
      ["get_greeting", {}, bob],
    ]);
    expect(read.returns).toBe("gm Stylus");
  });

  it("lesson 2 counts and resets", () => {
    const results = run(getSimulation(2)!, [
      ["increment", {}, alice],
      ["increment", {}, bob],
      ["get", {}, alice],
      ["reset", {}, alice],
      ["get", {}, alice],
    ]);
    expect(results[2].returns).toBe(2n);
    expect(results[4].returns).toBe(0n);
  });

  it("lesson 3 sends tokens, emits Transfer and reverts on insufficient balance", () => {
    const [sent, refused] = run(getSimulation(3)!, [
      ["send", { to: "Bob", amount: "250" }, alice],
      ["send", { to: "Alice", amount: "300" }, bob],
    ]);
    expect(sent.events).toEqual([{ name: "Transfer", args: { from: alice.address, to: bob.address, value: 250n } }]);
    expect(readMapping(sent.state, "balances", alice.address)).toBe(750n);
    expect(readMapping(sent.state, "balances", bob.address)).toBe(250n);
    expect(refused).toMatchObject({ ok: false, error: { error: "InsufficientBalance", args: { available: 250n, required: 300n } } });
  });

  it("lesson 3 keeps the balance when sending to yourself", () => {
    const [self] = run(getSimulation(3)!, [["send", { to: "Alice", amount: "100" }, alice]]);
    expect(readMapping(self.state, "balances", alice.address)).toBe(1000n);
  });

  it("lesson 6 adds up scores per player and clears only the caller's", () => {
    const results = run(getSimulation(6)!, [
      ["record", { points: "10" }, alice],
      ["record", { points: "5" }, alice],
      ["record", { points: "7" }, bob],
      ["score_of", { account: "Alice" }, bob],
      ["score_of", { account: "Carol" }, bob],
      ["clear", {}, alice],
      ["score_of", { account: "Alice" }, alice],
      ["score_of", { account: "Bob" }, alice],
    ]);
    expect(results[3].returns).toBe(15n);
    expect(results[4].returns).toBe(0n);
    expect(results[6].returns).toBe(0n);
    expect(results[7].returns).toBe(7n);
    // A cleared entry leaves the storage view, like a mapping key back at zero.
    expect(results[5].state.scores).toEqual({ [bob.address]: 7n });
  });

  it("lesson 6 keeps the score when the sum overflows", () => {
    const [, overflow] = run(getSimulation(6)!, [
      ["record", { points: "1" }, alice],
      ["record", { points: ((1n << 256n) - 1n).toString() }, alice],
    ]);
    expect(overflow).toMatchObject({ ok: false, error: { error: "Arithmetic overflow" } });
    expect(readMapping(overflow.state, "scores", alice.address)).toBe(1n);
  });

  it("lesson 7 appends, reads by index and trims from the end", () => {
    const results = run(getSimulation(7)!, [
      ["record", { price: "100" }, alice],
      ["record", { price: "105" }, bob],
      ["record", { price: "98" }, alice],
      ["length", {}, alice],
      ["price_at", { index: "1" }, alice],
      ["remove_last", {}, bob],
      ["length", {}, alice],
      ["price_at", { index: "2" }, alice],
    ]);
    expect(results[3].returns).toBe(3n);
    expect(results[4].returns).toBe(105n);
    expect(results[5].state.prices).toEqual([100n, 105n]);
    expect(results[6].returns).toBe(2n);
    expect(results[7]).toMatchObject({ ok: false, error: { error: "IndexOutOfBounds", args: { index: 2n, length: 2n } } });
  });

  it("lesson 7 reverts on an empty log and ignores remove_last when empty", () => {
    const [read, removed] = run(getSimulation(7)!, [
      ["price_at", { index: "0" }, alice],
      ["remove_last", {}, alice],
    ]);
    expect(read).toMatchObject({ ok: false, error: { error: "IndexOutOfBounds", args: { index: 0n, length: 0n } } });
    expect(removed).toMatchObject({ ok: true, state: { prices: [] } });
  });

  it("lesson 8 adds tasks in order and completes them by id", () => {
    const results = run(getSimulation(8)!, [
      ["add_task", { title: "Write the lesson" }, alice],
      ["add_task", { title: "Review it" }, bob],
      ["complete", { id: "1" }, alice],
      ["task", { id: "0" }, bob],
      ["task", { id: "1" }, bob],
    ]);
    expect(results[2].state.tasks).toEqual([
      { title: "Write the lesson", done: false },
      { title: "Review it", done: true },
    ]);
    expect(results[3].returns).toEqual(["Write the lesson", false]);
    expect(results[4].returns).toEqual(["Review it", true]);
  });

  it("lesson 8 reverts with UnknownTask past the end, for reads and writes", () => {
    const [, read, write] = run(getSimulation(8)!, [
      ["add_task", { title: "Only task" }, alice],
      ["task", { id: "1" }, alice],
      ["complete", { id: "5" }, alice],
    ]);
    expect(read).toMatchObject({ ok: false, error: { error: "UnknownTask", args: { id: 1n } } });
    expect(write).toMatchObject({ ok: false, error: { error: "UnknownTask", args: { id: 5n } }, state: { tasks: [{ title: "Only task", done: false }] } });
  });

  it("lesson 4 behaves like an ERC-20 transfer", () => {
    const results = run(getSimulation(4)!, [
      ["transfer", { to: "Bob", value: "400" }, alice],
      ["balance_of", { account: "Bob" }, alice],
      ["total_supply", {}, alice],
      ["transfer", { to: "Alice", value: "401" }, bob],
    ]);
    expect(results[0]).toMatchObject({ ok: true, returns: true });
    expect(results[1].returns).toBe(400n);
    expect(results[2].returns).toBe(1000n);
    expect(results[3]).toMatchObject({ ok: false, error: { error: "InsufficientBalance", args: { have: 400n, want: 401n } } });
  });
});
