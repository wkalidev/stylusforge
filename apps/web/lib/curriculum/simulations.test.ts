import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { SIM_START_TIME, UINT256_MAX, callSimulation, readMapping, simTimestamp, type LessonSimulation, type SimCall, type SimState } from "./simulation";
import { SIM_ACCOUNTS, ZERO_ADDRESS, getSimulation } from "./simulations";
import { SOLUTIONS } from "./solutions";

const [alice, bob, carol] = SIM_ACCOUNTS;

/** Runs calls in sequence and returns every result. */
function run(simulation: LessonSimulation, calls: [string, Record<string, string>, typeof alice][]) {
  let state: SimState = simulation.initialState();
  return calls.map(([fn, args, caller]) => {
    const result = callSimulation(simulation, state, fn, args, caller);
    state = result.state;
    return result;
  });
}

const MAX = UINT256_MAX;

/**
 * One call per lesson whose reference solution adds, subtracts or multiplies U256 values with
 * operators, from a state at the edge of uint256, with the state Rust would end in: `U256` `+`, `-`
 * and `*` wrap around instead of reverting, so the simulation must not revert either.
 */
const OVERFLOW_CASES: Record<
  number,
  { state: SimState; call: [string, Record<string, string>, typeof alice]; with?: SimCall; expected: SimState }
> = {
  2: { state: { count: MAX }, call: ["increment", {}, alice], expected: { count: 0n } },
  3: {
    state: { balances: { [alice.address]: 1n, [bob.address]: MAX } },
    call: ["send", { to: "Bob", amount: "1" }, alice],
    expected: { balances: { [alice.address]: 0n, [bob.address]: 0n } },
  },
  4: {
    state: { total_supply: MAX, balances: { [alice.address]: 1n, [bob.address]: MAX }, allowances: {} },
    call: ["transfer", { to: "Bob", value: "1" }, alice],
    expected: { total_supply: MAX, balances: { [alice.address]: 0n, [bob.address]: 0n }, allowances: {} },
  },
  6: { state: { scores: { [alice.address]: MAX } }, call: ["record", { points: "2" }, alice], expected: { scores: { [alice.address]: 1n } } },
  11: {
    state: { deposits: { [alice.address]: MAX } },
    call: ["deposit", {}, alice],
    with: { value: "2" },
    expected: { deposits: { [alice.address]: 1n } },
  },
};

/** Whether Rust code uses the binary +, - or * operators (not `->` or a dereference). */
const usesArithmetic = (code: string) => /\s[-+*]=?\s/.test(code);

describe("overflow in lesson simulations", () => {
  it("has a case for every available lesson whose solution adds, subtracts or multiplies", () => {
    const arithmetic = LESSONS.filter((lesson) => lesson.available && usesArithmetic(SOLUTIONS[lesson.id])).map((lesson) => lesson.id);
    expect(Object.keys(OVERFLOW_CASES).map(Number).sort((a, b) => a - b)).toEqual(arithmetic.sort((a, b) => a - b));
  });

  it("lesson 12 reverts with FeeOverflow where checked_mul overflows, instead of wrapping", () => {
    const simulation = getSimulation(12)!;
    const max = MAX.toString();
    expect(callSimulation(simulation, { rate_bps: 0n }, "fee", { amount: max, rate_bps: "2" }, alice)).toMatchObject({
      ok: false,
      error: { error: "FeeOverflow", args: { amount: MAX, rate_bps: 2n } },
    });
    // The largest product that fits does not revert.
    expect(callSimulation(simulation, { rate_bps: 0n }, "fee", { amount: max, rate_bps: "1" }, alice).returns).toBe(MAX / 10_000n);
    expect(callSimulation(simulation, { rate_bps: 2n }, "quote", { amount: max }, alice)).toMatchObject({ ok: false, error: { error: "FeeOverflow" } });
    expect(callSimulation(simulation, { rate_bps: 2n }, "quote_pair", { first: "1", second: max }, alice)).toMatchObject({
      ok: false,
      error: { error: "FeeOverflow", args: { amount: MAX, rate_bps: 2n } },
    });
  });

  it.each(Object.entries(OVERFLOW_CASES))("lesson %s wraps around like U256 instead of reverting", (id, { state, call, with: how, expected }) => {
    const [fn, args, caller] = call;
    const result = callSimulation(getSimulation(Number(id))!, state, fn, args, caller, how);
    expect(result.error).toBeUndefined();
    expect(result.state).toEqual(expected);
  });
});

describe("lesson simulations", () => {
  it("cover every available lesson with the functions of its reference solution", () => {
    for (const lesson of LESSONS.filter((candidate) => candidate.available)) {
      const simulation = getSimulation(lesson.id);
      expect(simulation, lesson.title).not.toBeNull();
      // A #[constructor] runs once at deployment: the model starts deployed instead.
      const publicFns = [...SOLUTIONS[lesson.id].matchAll(/(#\[constructor\]\s*)?pub fn (\w+)/g)]
        .filter((match) => !match[1])
        .map((match) => match[2])
        .sort();
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

  it("lesson 6 wraps the score around when the sum overflows, like U256", () => {
    const [, overflow] = run(getSimulation(6)!, [
      ["record", { points: "2" }, alice],
      ["record", { points: ((1n << 256n) - 1n).toString() }, alice],
    ]);
    expect(overflow.ok).toBe(true);
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

  it("lesson 9 records each visitor's check-in time on the simulated clock", () => {
    const simulation = getSimulation(9)!;
    let state = simulation.initialState();
    const call = (fn: string, args: Record<string, string>, caller: typeof alice, sent: number) => {
      const result = callSimulation(simulation, state, fn, args, caller, { timestamp: simTimestamp(sent) });
      state = result.state;
      return result;
    };
    expect(call("last_visitor", {}, alice, 0).returns).toBe(ZERO_ADDRESS);
    call("check_in", {}, alice, 1);
    call("check_in", {}, bob, 2);
    expect(call("checked_in_at", { account: "Alice" }, bob, 2).returns).toBe(SIM_START_TIME + 12n);
    expect(call("checked_in_at", { account: "Bob" }, bob, 2).returns).toBe(SIM_START_TIME + 24n);
    expect(call("checked_in_at", { account: "Carol" }, bob, 2).returns).toBe(0n);
    expect(call("last_visitor", {}, alice, 2).returns).toBe(bob.address);
    // Checking in again moves the time forward and makes Alice the last visitor.
    call("check_in", {}, alice, 3);
    expect(readMapping(state, "check_ins", alice.address)).toBe(SIM_START_TIME + 36n);
    expect(state.last_visitor).toBe(alice.address);
  });

  it("lesson 10 lets only the owner set the fee and hand over the contract", () => {
    const results = run(getSimulation(10)!, [
      ["set_fee", { fee: "25" }, bob],
      ["set_fee", { fee: "25" }, alice],
      ["transfer_ownership", { new_owner: "Bob" }, alice],
      ["set_fee", { fee: "30" }, alice],
      ["set_fee", { fee: "30" }, bob],
      ["owner", {}, carol],
      ["fee", {}, carol],
    ]);
    expect(results[0]).toMatchObject({ ok: false, error: { error: "Unauthorized", args: { caller: bob.address } } });
    expect(results[0].state.fee).toBe(0n);
    expect(results[1]).toMatchObject({ ok: true, state: { fee: 25n } });
    // Once ownership is handed over, the old owner is refused like anyone else.
    expect(results[3]).toMatchObject({ ok: false, error: { error: "Unauthorized", args: { caller: alice.address } } });
    expect(results[5].returns).toBe(bob.address);
    expect(results[6].returns).toBe(30n);
  });

  it("lesson 11 takes deposits, pays them back and reverts past the deposit", () => {
    const simulation = getSimulation(11)!;
    let state = simulation.initialState();
    let balance = 0n;
    const call = (fn: string, args: Record<string, string>, caller: typeof alice, value?: string) => {
      const result = callSimulation(simulation, state, fn, args, caller, { value, balance });
      state = result.state;
      balance = result.balance;
      return result;
    };
    call("deposit", {}, alice, "300");
    call("deposit", {}, bob, "200");
    call("deposit", {}, alice, "50");
    expect(call("deposit_of", { account: "Alice" }, carol).returns).toBe(350n);
    expect(call("balance", {}, carol).returns).toBe(550n);
    expect(call("withdraw", { amount: "100" }, alice)).toMatchObject({ ok: true, transfers: [{ to: alice.address, amount: 100n }], balance: 450n });
    expect(readMapping(state, "deposits", alice.address)).toBe(250n);
    // Bob cannot take more than he deposited, even though the contract holds enough.
    expect(call("withdraw", { amount: "201" }, bob)).toMatchObject({
      ok: false,
      error: { error: "InsufficientDeposit", args: { available: 200n, requested: 201n } },
      balance: 450n,
    });
    expect(call("withdraw", { amount: "1" }, carol)).toMatchObject({ ok: false, error: { error: "InsufficientDeposit" } });
  });

  it("lesson 11 refuses ETH sent to a function that is not payable", () => {
    const result = callSimulation(getSimulation(11)!, { deposits: { [alice.address]: 5n } }, "withdraw", { amount: "1" }, alice, { value: "1", balance: 5n });
    expect(result).toMatchObject({ ok: false, error: { error: "method withdraw not payable" }, balance: 5n });
  });

  it("lesson 12 quotes fees in basis points at the stored rate", () => {
    const results = run(getSimulation(12)!, [
      ["quote", { amount: "1000" }, alice],
      ["set_rate", { rate_bps: "250" }, alice],
      ["rate", {}, bob],
      ["quote", { amount: "1000" }, bob],
      ["quote_pair", { first: "1000", second: "4000" }, bob],
      ["fee", { amount: "1", rate_bps: "9999" }, bob],
      ["fee", { amount: "200", rate_bps: "10000" }, bob],
    ]);
    expect(results[0].returns).toBe(0n);
    expect(results[2].returns).toBe(250n);
    expect(results[3].returns).toBe(25n);
    expect(results[4].returns).toEqual([25n, 100n]);
    // Integer division rounds down; 10,000 basis points are the whole amount.
    expect(results[5].returns).toBe(0n);
    expect(results[6].returns).toBe(200n);
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
