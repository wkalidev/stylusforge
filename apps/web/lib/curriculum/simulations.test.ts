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
