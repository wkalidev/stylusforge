import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { SIM_CONTRACT_ADDRESS, SIM_START_TIME, UINT256_MAX, UINT64_MAX, callSimulation, functionSelector, readMapping, simTimestamp, type LessonSimulation, type SimCall, type SimState } from "./simulation";
import { PRICE_FEED_ADDRESS, SIM_ACCOUNTS, TOKEN_ADDRESS, ZERO_ADDRESS, getSimulation } from "./simulations";
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
  13: {
    state: { total_supply: MAX, balances: { [alice.address]: 1n, [bob.address]: MAX }, allowances: { [alice.address]: { [carol.address]: 1n } } },
    call: ["transfer_from", { from: "Alice", to: "Bob", value: "1" }, carol],
    expected: {
      total_supply: MAX,
      balances: { [alice.address]: 0n, [bob.address]: 0n },
      allowances: { [alice.address]: { [carol.address]: 0n } },
    },
  },
  // now - updated_at wraps around when the update is in the future: with max_age at U256::MAX, the
  // wrapped age is exactly MAX, which is not greater, so Rust returns the answer instead of reverting.
  16: {
    state: { feed: PRICE_FEED_ADDRESS, max_age: MAX, PriceFeed: { decimals: 8n, round_id: 1n, answer: 5n, updated_at: SIM_START_TIME + 1n } },
    call: ["price", {}, alice],
    with: { timestamp: SIM_START_TIME },
    expected: { feed: PRICE_FEED_ADDRESS, max_age: MAX, PriceFeed: { decimals: 8n, round_id: 1n, answer: 5n, updated_at: SIM_START_TIME + 1n } },
  },
  5: {
    state: {
      token: TOKEN_ADDRESS,
      deposits: { [alice.address]: MAX },
      Token: { balances: { [alice.address]: 1n }, allowances: { [alice.address]: { [SIM_CONTRACT_ADDRESS]: 1n } }, returns_false: 0n },
    },
    call: ["deposit", { amount: "1" }, alice],
    expected: {
      token: TOKEN_ADDRESS,
      deposits: { [alice.address]: 0n },
      Token: {
        balances: { [alice.address]: 0n, [SIM_CONTRACT_ADDRESS]: 1n },
        allowances: { [alice.address]: { [SIM_CONTRACT_ADDRESS]: 0n } },
        returns_false: 0n,
      },
    },
  },
  // The deposit wraps around past U256::MAX, and the unlock time past it too with a delay of MAX.
  19: {
    state: { delay: MAX, deposits: { [alice.address]: MAX }, unlock_at: {} },
    call: ["deposit", {}, alice],
    with: { value: "1" },
    expected: { delay: MAX, deposits: { [alice.address]: 0n }, unlock_at: { [alice.address]: SIM_START_TIME - 1n } },
  },
  // The round id is a U80: + 1 wraps around at 2^80.
  17: {
    state: { owner: alice.address, round_id: (1n << 80n) - 1n, answer: 0n, updated_at: 0n },
    call: ["set_answer", { answer: "5" }, alice],
    expected: { owner: alice.address, round_id: 0n, answer: 5n, updated_at: SIM_START_TIME },
  },
  14: {
    state: { owners: { "7": alice.address }, balances: { [alice.address]: 1n, [bob.address]: MAX }, token_approvals: {} },
    call: ["transfer_from", { from: "Alice", to: "Bob", token_id: "7" }, alice],
    expected: { owners: { "7": bob.address }, balances: { [alice.address]: 0n, [bob.address]: 0n }, token_approvals: {} },
  },
  11: {
    state: { deposits: { [alice.address]: MAX } },
    call: ["deposit", {}, alice],
    with: { value: "2" },
    expected: { deposits: { [alice.address]: 1n } },
  },
};

/**
 * The methods a solution exports: every fn of its `#[public]` blocks, trait impls included (with or
 * without `pub`), but no #[constructor], which runs once at deployment: the model starts deployed
 * instead. Plain `impl` blocks hold helpers, which are never exported.
 */
function exportedFunctions(solution: string): string[] {
  return [...solution.matchAll(/#\[public\][^{]*\{([\s\S]*?)\n\}/g)].flatMap((block) =>
    [...block[1].matchAll(/(#\[constructor\]\s*)?(?:pub )?fn (\w+)/g)].filter((match) => !match[1]).map((match) => match[2]),
  );
}

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
      // Functions of mock contracts model the contracts the lesson calls, not the lesson's own.
      const own = simulation!.functions.filter((fn) => !fn.contract).map((fn) => fn.name);
      expect(own.sort(), lesson.title).toEqual(exportedFunctions(SOLUTIONS[lesson.id]).sort());
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

  it("lesson 13 approves a spender, spends the allowance and reverts past it", () => {
    const results = run(getSimulation(13)!, [
      ["approve", { spender: "Bob", value: "300" }, alice],
      ["allowance", { owner: "Alice", spender: "Bob" }, carol],
      ["transfer_from", { from: "Alice", to: "Carol", value: "100" }, bob],
      ["allowance", { owner: "Alice", spender: "Bob" }, carol],
      ["balance_of", { account: "Carol" }, carol],
      ["transfer_from", { from: "Alice", to: "Carol", value: "201" }, bob],
      ["transfer_from", { from: "Alice", to: "Carol", value: "1" }, carol],
    ]);
    expect(results[0]).toMatchObject({ ok: true, returns: true, events: [{ name: "Approval", args: { owner: alice.address, spender: bob.address, value: 300n } }] });
    expect(results[1].returns).toBe(300n);
    expect(results[2]).toMatchObject({ ok: true, returns: true, events: [{ name: "Transfer", args: { from: alice.address, to: carol.address, value: 100n } }] });
    expect(results[3].returns).toBe(200n);
    expect(results[4].returns).toBe(100n);
    expect(results[5]).toMatchObject({ ok: false, error: { error: "InsufficientAllowance", args: { spender: bob.address, have: 200n, want: 201n } } });
    expect(results[6]).toMatchObject({ ok: false, error: { error: "InsufficientAllowance", args: { spender: carol.address, have: 0n, want: 1n } } });
  });

  it("lesson 13 never lowers an unlimited allowance, and replaces an allowance on approve", () => {
    const results = run(getSimulation(13)!, [
      ["approve", { spender: "Bob", value: MAX.toString() }, alice],
      ["transfer_from", { from: "Alice", to: "Bob", value: "250" }, bob],
      ["allowance", { owner: "Alice", spender: "Bob" }, bob],
      ["approve", { spender: "Bob", value: "5" }, alice],
      ["allowance", { owner: "Alice", spender: "Bob" }, bob],
    ]);
    expect(results[1]).toMatchObject({ ok: true });
    expect(results[2].returns).toBe(MAX);
    expect(results[4].returns).toBe(5n);
  });

  it("lesson 13 keeps the allowance when the owner's balance is too low", () => {
    const results = run(getSimulation(13)!, [
      ["approve", { spender: "Alice", value: "50" }, bob],
      ["transfer_from", { from: "Bob", to: "Alice", value: "10" }, alice],
      ["allowance", { owner: "Bob", spender: "Alice" }, alice],
    ]);
    expect(results[1]).toMatchObject({ ok: false, error: { error: "InsufficientBalance", args: { from: bob.address, have: 0n, want: 10n } } });
    expect(results[2].returns).toBe(50n);
  });

  it("lesson 14 mints, approves and transfers a token, clearing its approval", () => {
    const results = run(getSimulation(14)!, [
      ["mint", { receiver: "Alice", token_id: "7" }, carol],
      ["owner_of", { token_id: "7" }, carol],
      ["approve", { approved: "Bob", token_id: "7" }, alice],
      ["get_approved", { token_id: "7" }, carol],
      ["transfer_from", { from: "Alice", to: "Carol", token_id: "7" }, bob],
      ["owner_of", { token_id: "7" }, carol],
      ["get_approved", { token_id: "7" }, carol],
      ["balance_of", { owner: "Alice" }, carol],
      ["balance_of", { owner: "Carol" }, carol],
      ["transfer_from", { from: "Carol", to: "Bob", token_id: "7" }, bob],
    ]);
    expect(results[0]).toMatchObject({ ok: true, events: [{ name: "Transfer", args: { from: ZERO_ADDRESS, to: alice.address, token_id: 7n } }] });
    expect(results[1].returns).toBe(alice.address);
    expect(results[2]).toMatchObject({ ok: true, events: [{ name: "Approval", args: { owner: alice.address, approved: bob.address, token_id: 7n } }] });
    expect(results[3].returns).toBe(bob.address);
    expect(results[4]).toMatchObject({ ok: true, events: [{ name: "Transfer", args: { from: alice.address, to: carol.address, token_id: 7n } }] });
    expect(results[5].returns).toBe(carol.address);
    expect(results[6].returns).toBe(ZERO_ADDRESS);
    expect(results[7].returns).toBe(0n);
    expect(results[8].returns).toBe(1n);
    expect(results[9]).toMatchObject({ ok: false, error: { error: "InsufficientApproval", args: { operator: bob.address, token_id: 7n } } });
  });

  it("lesson 14 reverts for a missing token, a wrong owner, the zero address and a token minted twice", () => {
    const results = run(getSimulation(14)!, [
      ["owner_of", { token_id: "1" }, alice],
      ["get_approved", { token_id: "1" }, alice],
      ["mint", { receiver: "Alice", token_id: "1" }, alice],
      ["mint", { receiver: "Bob", token_id: "1" }, alice],
      ["transfer_from", { from: "Bob", to: "Carol", token_id: "1" }, alice],
      ["transfer_from", { from: "Alice", to: ZERO_ADDRESS, token_id: "1" }, alice],
      ["mint", { receiver: ZERO_ADDRESS, token_id: "2" }, alice],
      ["approve", { approved: "Carol", token_id: "1" }, bob],
    ]);
    expect(results[0]).toMatchObject({ ok: false, error: { error: "NonexistentToken", args: { token_id: 1n } } });
    expect(results[1]).toMatchObject({ ok: false, error: { error: "NonexistentToken" } });
    expect(results[2].ok).toBe(true);
    expect(results[3]).toMatchObject({ ok: false, error: { error: "AlreadyMinted", args: { token_id: 1n } } });
    expect(results[4]).toMatchObject({ ok: false, error: { error: "IncorrectOwner", args: { from: bob.address, token_id: 1n, owner: alice.address } } });
    expect(results[5]).toMatchObject({ ok: false, error: { error: "InvalidReceiver", args: { receiver: ZERO_ADDRESS } } });
    expect(results[6]).toMatchObject({ ok: false, error: { error: "InvalidReceiver" } });
    expect(results[7]).toMatchObject({ ok: false, error: { error: "InsufficientApproval", args: { operator: bob.address, token_id: 1n } } });
  });

  it("lesson 15 starts deployed with its metadata and supply, and answers ERC-165 queries", () => {
    const results = run(getSimulation(15)!, [
      ["name", {}, bob],
      ["symbol", {}, bob],
      ["decimals", {}, bob],
      ["total_supply", {}, bob],
      ["balance_of", { account: "Alice" }, bob],
      ["supports_interface", { interface_id: "0x36372B07" }, bob],
      ["supports_interface", { interface_id: "0xa219a025" }, bob],
      ["supports_interface", { interface_id: "0x01ffc9a7" }, bob],
      ["supports_interface", { interface_id: "0x80ac58cd" }, bob],
      ["supports_interface", { interface_id: "0x1234" }, bob],
    ]);
    expect(results.slice(0, 5).map((result) => result.returns)).toEqual(["Forge Token", "FORGE", 18n, 1000n, 1000n]);
    expect(results.slice(5, 9).map((result) => result.returns)).toEqual([true, true, true, false]);
    expect(results[9]).toMatchObject({ ok: false, error: { error: '"0x1234" is not a bytes4 (0x and 8 hex digits)' } });
  });

  it("lesson 15 transfers and spends allowances with the errors of OpenZeppelin", () => {
    const results = run(getSimulation(15)!, [
      ["transfer", { to: "Bob", value: "1001" }, alice],
      ["transfer", { to: ZERO_ADDRESS, value: "1" }, alice],
      ["approve", { spender: ZERO_ADDRESS, value: "1" }, alice],
      ["approve", { spender: "Bob", value: "300" }, alice],
      ["transfer_from", { from: "Alice", to: "Carol", value: "301" }, bob],
      ["transfer_from", { from: "Alice", to: "Carol", value: "100" }, bob],
      ["allowance", { owner: "Alice", spender: "Bob" }, bob],
      ["balance_of", { account: "Carol" }, bob],
      ["approve", { spender: "Carol", value: MAX.toString() }, alice],
      ["transfer_from", { from: "Alice", to: "Carol", value: "50" }, carol],
      ["allowance", { owner: "Alice", spender: "Carol" }, bob],
      ["transfer_from", { from: "Alice", to: ZERO_ADDRESS, value: "50" }, bob],
      ["allowance", { owner: "Alice", spender: "Bob" }, bob],
    ]);
    expect(results[0]).toMatchObject({ ok: false, error: { error: "ERC20InsufficientBalance", args: { sender: alice.address, balance: 1000n, needed: 1001n } } });
    expect(results[1]).toMatchObject({ ok: false, error: { error: "ERC20InvalidReceiver", args: { receiver: ZERO_ADDRESS } } });
    expect(results[2]).toMatchObject({ ok: false, error: { error: "ERC20InvalidSpender", args: { spender: ZERO_ADDRESS } } });
    expect(results[3]).toMatchObject({ ok: true, returns: true, events: [{ name: "Approval", args: { owner: alice.address, spender: bob.address, value: 300n } }] });
    expect(results[4]).toMatchObject({ ok: false, error: { error: "ERC20InsufficientAllowance", args: { spender: bob.address, allowance: 300n, needed: 301n } } });
    // Spending an allowance emits only Transfer: OpenZeppelin lowers it without an Approval event.
    expect(results[5]).toMatchObject({ ok: true, returns: true, events: [{ name: "Transfer", args: { from: alice.address, to: carol.address, value: 100n } }] });
    expect(results[5].events).toHaveLength(1);
    expect(results[6].returns).toBe(200n);
    expect(results[7].returns).toBe(100n);
    expect(results[9].ok).toBe(true);
    expect(results[10].returns).toBe(MAX);
    // A revert after the allowance is lowered undoes the whole call.
    expect(results[11]).toMatchObject({ ok: false, error: { error: "ERC20InvalidReceiver" } });
    expect(results[12].returns).toBe(200n);
  });
  it("lesson 16 reads the mock feed, and refuses a stale round or an answer that is not positive", () => {
    const simulation = getSimulation(16)!;
    let state = simulation.initialState();
    const call = (fn: string, args: Record<string, string>, sent: number) => {
      const result = callSimulation(simulation, state, fn, args, alice, { timestamp: simTimestamp(sent) });
      state = result.state;
      return result;
    };
    expect(call("feed", {}, 0).returns).toBe(PRICE_FEED_ADDRESS);
    expect(call("decimals", {}, 0).returns).toBe(8n);
    expect(call("price", {}, 0)).toMatchObject({ ok: true, returns: 300_000_000_000n });
    // A new answer is stamped with the block time and starts a new round.
    expect(call("set_answer", { answer: "312345000000" }, 1)).toMatchObject({
      ok: true,
      events: [{ name: "AnswerUpdated", contract: "PriceFeed", args: { current: 312_345_000_000n, roundId: 2n, updatedAt: SIM_START_TIME + 12n } }],
    });
    expect(call("latest_round_data", {}, 1).returns).toEqual([2n, 312_345_000_000n, SIM_START_TIME + 12n, SIM_START_TIME + 12n, 2n]);
    expect(call("price", {}, 1).returns).toBe(312_345_000_000n);
    // An update older than max_age, or never completed (0), is stale.
    call("set_updated_at", { updated_at: (SIM_START_TIME - 3600n).toString() }, 2);
    expect(call("price", {}, 2)).toMatchObject({ ok: false, error: { error: "StalePrice", args: { updated_at: SIM_START_TIME - 3600n, now: SIM_START_TIME + 24n } } });
    call("set_updated_at", { updated_at: "0" }, 3);
    expect(call("price", {}, 3)).toMatchObject({ ok: false, error: { error: "StalePrice", args: { updated_at: 0n } } });
    // An update in the future wraps now - updated_at around, like U256: stale too.
    call("set_updated_at", { updated_at: (SIM_START_TIME + 1000n).toString() }, 4);
    expect(call("price", {}, 4)).toMatchObject({ ok: false, error: { error: "StalePrice" } });
    call("set_answer", { answer: "-1" }, 5);
    expect(call("price", {}, 5)).toMatchObject({ ok: false, error: { error: "NegativePrice", args: { answer: -1n } } });
    call("set_answer", { answer: "0" }, 6);
    expect(call("price", {}, 6)).toMatchObject({ ok: false, error: { error: "NegativePrice", args: { answer: 0n } } });
  });
  it("lesson 17 publishes rounds from its owner only, under the selectors of the Chainlink interface", () => {
    const simulation = getSimulation(17)!;
    expect(simulation.selectors).toBe(true);
    const selectors = Object.fromEntries(simulation.functions.map((fn) => [fn.abiName, functionSelector(fn)]));
    expect(selectors).toEqual({ decimals: "0x313ce567", description: "0x7284e416", latestRoundData: "0xfeaf968c", setAnswer: "0x99213cd8" });
    let state = simulation.initialState();
    const call = (fn: string, args: Record<string, string>, caller: typeof alice, sent: number) => {
      const result = callSimulation(simulation, state, fn, args, caller, { timestamp: simTimestamp(sent) });
      state = result.state;
      return result;
    };
    expect(call("decimals", {}, bob, 0).returns).toBe(8n);
    expect(call("description", {}, bob, 0).returns).toBe("ETH / USD");
    expect(call("latest_round", {}, bob, 0).returns).toEqual([0n, 0n, 0n, 0n, 0n]);
    expect(call("set_answer", { answer: "312345000000" }, alice, 1).ok).toBe(true);
    expect(call("set_answer", { answer: "-5" }, alice, 2).ok).toBe(true);
    expect(call("latest_round", {}, bob, 2).returns).toEqual([2n, -5n, SIM_START_TIME + 24n, SIM_START_TIME + 24n, 2n]);
    expect(call("set_answer", { answer: "1" }, bob, 3)).toMatchObject({ ok: false, error: { error: "NotOwner", args: { caller: bob.address } } });
    expect(state).toMatchObject({ round_id: 2n, answer: -5n });
  });
  it("lesson 5 pulls approved tokens into the vault and pays them back", () => {
    const results = run(getSimulation(5)!, [
      ["deposit", { amount: "100" }, alice],
      ["approve", { spender: "TokenVault", value: "300" }, alice],
      ["deposit", { amount: "100" }, alice],
      ["deposit_of", { account: "Alice" }, bob],
      ["balance_of", { account: "TokenVault" }, bob],
      ["allowance", { owner: "Alice", spender: "TokenVault" }, bob],
      ["withdraw", { amount: "101" }, alice],
      ["withdraw", { amount: "40" }, alice],
      ["balance_of", { account: "Alice" }, bob],
      ["deposit_of", { account: "Alice" }, bob],
    ]);
    // Without an approval, the token refuses, and the vault reverts with its error.
    expect(results[0]).toMatchObject({ ok: false, error: { error: "ERC20InsufficientAllowance", args: { spender: SIM_CONTRACT_ADDRESS, allowance: 0n, needed: 100n } } });
    expect(results[2]).toMatchObject({
      ok: true,
      events: [
        { name: "Transfer", contract: "Token", args: { from: alice.address, to: SIM_CONTRACT_ADDRESS, value: 100n } },
        { name: "Deposited", args: { account: alice.address, amount: 100n } },
      ],
    });
    expect(results[3].returns).toBe(100n);
    expect(results[4].returns).toBe(100n);
    expect(results[5].returns).toBe(200n);
    expect(results[6]).toMatchObject({ ok: false, error: { error: "InsufficientDeposit", args: { available: 100n, requested: 101n } } });
    expect(results[7]).toMatchObject({ ok: true, events: [{ name: "Transfer", contract: "Token" }, { name: "Withdrawn", args: { amount: 40n } }] });
    expect(results[8].returns).toBe(940n);
    expect(results[9].returns).toBe(60n);
  });

  it("lesson 5 reverts with TransferFailed, and undoes every write, when the token returns false", () => {
    const simulation = getSimulation(5)!;
    let state = simulation.initialState();
    const call = (fn: string, args: Record<string, string>) => {
      const result = callSimulation(simulation, state, fn, args, alice);
      state = result.state;
      return result;
    };
    call("approve", { spender: "TokenVault", value: "100" });
    call("deposit", { amount: "50" });
    call("set_returns_false", { enabled: "1" });
    const before = state;
    expect(call("deposit", { amount: "10" })).toMatchObject({ ok: false, error: { error: "TransferFailed", args: { token: TOKEN_ADDRESS } } });
    // The lowered deposit of a failed withdrawal is undone with the rest of the call.
    expect(call("withdraw", { amount: "10" })).toMatchObject({ ok: false, error: { error: "TransferFailed" } });
    expect(state).toBe(before);
    expect(readMapping(state, "deposits", alice.address)).toBe(50n);
    call("set_returns_false", { enabled: "0" });
    expect(call("withdraw", { amount: "10" }).ok).toBe(true);
  });

  it("lesson 18 converts at the default ink price, saturates to_ink, and prices a batch", () => {
    const simulation = getSimulation(18)!;
    const results = run(simulation, [
      ["ink_price", {}, alice],
      ["to_gas", { ink: "25000000" }, alice],
      ["to_gas", { ink: "9999" }, alice],
      ["to_ink", { gas: "2500" }, alice],
      ["to_ink", { gas: UINT64_MAX.toString() }, alice],
      ["set_ink_per_item", { ink: "70000" }, bob],
      ["gas_for", { items: "3" }, alice],
      ["ink_per_item", {}, alice],
    ]);
    expect(results.map((result) => result.returns)).toEqual([10_000n, 2_500n, 0n, 25_000_000n, UINT64_MAX, undefined, 21n, 70_000n]);
    // A u64 argument refuses values from 2^64 up.
    expect(callSimulation(simulation, simulation.initialState(), "to_gas", { ink: (UINT64_MAX + 1n).toString() }, alice)).toMatchObject({ ok: false, error: { error: expect.stringMatching(/uint64/) } });
  });

  it("lesson 18 reverts with BudgetOverflow where checked_mul overflows, instead of wrapping", () => {
    const simulation = getSimulation(18)!;
    expect(callSimulation(simulation, { ink_per_item: 2n }, "gas_for", { items: MAX.toString() }, alice)).toMatchObject({
      ok: false,
      error: { error: "BudgetOverflow", args: { items: MAX, ink_per_item: 2n } },
    });
    // The largest product that fits does not revert.
    expect(callSimulation(simulation, { ink_per_item: 1n }, "gas_for", { items: MAX.toString() }, alice).returns).toBe(MAX / 10_000n);
  });

  it("lesson 19 locks each deposit for the delay, on the simulated clock", () => {
    const simulation = getSimulation(19)!;
    let state = simulation.initialState();
    let balance = 0n;
    let sent = 0;
    // Like the Try it panel: each sent transaction runs in the next block, views in the current one.
    const call = (fn: string, args: Record<string, string>, caller: typeof alice, value = "") => {
      if (!simulation.functions.find((candidate) => candidate.name === fn)!.view) sent += 1;
      const result = callSimulation(simulation, state, fn, args, caller, { timestamp: simTimestamp(sent), value, balance });
      state = result.state;
      balance = result.balance;
      return result;
    };
    expect(call("withdraw", {}, alice)).toMatchObject({ ok: false, error: { error: "NothingLocked", args: { account: alice.address } } });
    const deposit = call("deposit", {}, alice, "100");
    const unlockAt = simTimestamp(2) + 60n;
    expect(deposit.events).toEqual([{ name: "Deposited", args: { account: alice.address, amount: 100n, unlock_at: unlockAt } }]);
    expect(call("unlock_time", { account: "Alice" }, bob).returns).toBe(unlockAt);
    expect(call("withdraw", {}, alice)).toMatchObject({ ok: false, error: { error: "StillLocked", args: { unlock_at: unlockAt, now: simTimestamp(3) } } });
    // Each sent transaction moves the clock 12 seconds: the lock still holds 12 seconds before it opens.
    for (let i = 0; i < 3; i += 1) expect(call("withdraw", {}, alice).error?.error).toBe("StillLocked");
    expect(simTimestamp(sent + 1)).toBe(unlockAt);
    const withdrawal = call("withdraw", {}, alice);
    expect(withdrawal).toMatchObject({ ok: true, transfers: [{ to: alice.address, amount: 100n }], balance: 0n });
    expect(call("deposit_of", { account: "Alice" }, alice).returns).toBe(0n);
  });
});
