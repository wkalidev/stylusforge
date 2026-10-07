import { describe, expect, it } from "vitest";

import {
  SIM_BLOCK_TIME,
  SIM_CONTRACT_ADDRESS,
  SIM_START_TIME,
  UINT256_MAX,
  ZERO_ADDRESS,
  callSimulation,
  deleteMapping,
  formatSimKey,
  formatSimValue,
  holdsEth,
  mockState,
  namedAddresses,
  parseArgument,
  readAddressMapping,
  readMapping,
  readNestedMapping,
  simTimestamp,
  wrappingAdd,
  wrappingSub,
  writeMapping,
  writeMockState,
  writeNestedMapping,
  type LessonSimulation,
} from "./simulation";

const alice = { name: "Alice", address: "0x00000000000000000000000000000000000a11ce" } as const;
const bob = { name: "Bob", address: "0x0000000000000000000000000000000000000b0b" } as const;

const vault: LessonSimulation = {
  contract: "Vault",
  accounts: [alice, bob],
  initialState: () => ({ total: 0n, owner: alice.address }),
  functions: [
    { name: "total", abiName: "total", view: true, params: [], returns: "uint256", run: (state) => ({ returns: state.total as bigint }) },
    {
      name: "add",
      abiName: "add",
      view: false,
      params: [{ name: "amount", type: "uint256" }],
      run: (state, args, caller) => {
        if (caller.address !== state.owner) return { revert: { error: "NotOwner", args: { caller: caller.address } } };
        return { state: { ...state, total: wrappingAdd(state.total as bigint, args.amount as bigint) }, events: [{ name: "Added", args: { amount: args.amount } }] };
      },
    },
  ],
};

describe("parseArgument", () => {
  it("parses uint256 within range", () => {
    expect(parseArgument("uint256", " 42 ", [])).toBe(42n);
    expect(parseArgument("uint256", UINT256_MAX.toString(), [])).toBe(UINT256_MAX);
    expect(() => parseArgument("uint256", (UINT256_MAX + 1n).toString(), [])).toThrow(/uint256/);
    expect(() => parseArgument("uint256", "-1", [])).toThrow(/unsigned/);
    expect(() => parseArgument("uint256", "1.5", [])).toThrow(/unsigned/);
  });

  it("parses addresses by hex or account name", () => {
    expect(parseArgument("address", "bob", [alice, bob])).toBe(bob.address);
    expect(parseArgument("address", "0x" + "ab".repeat(20), [])).toBe("0x" + "ab".repeat(20));
    expect(() => parseArgument("address", "0x123", [])).toThrow(/address/);
  });

  it("parses bytes4 values as lowercase hex", () => {
    expect(parseArgument("bytes4", " 0x36372B07 ", [])).toBe("0x36372b07");
    expect(() => parseArgument("bytes4", "0x3637", [])).toThrow(/bytes4/);
    expect(() => parseArgument("bytes4", "36372b07", [])).toThrow(/bytes4/);
  });

  it("keeps strings as typed", () => {
    expect(parseArgument("string", "  gm  ", [])).toBe("  gm  ");
  });
});

describe("wrapping arithmetic", () => {
  it("wraps around modulo 2^256 like U256 in Rust", () => {
    expect(wrappingAdd(UINT256_MAX, 1n)).toBe(0n);
    expect(wrappingAdd(UINT256_MAX, UINT256_MAX)).toBe(UINT256_MAX - 1n);
    expect(wrappingSub(0n, 1n)).toBe(UINT256_MAX);
    expect(wrappingAdd(2n, 3n)).toBe(5n);
    expect(wrappingSub(5n, 2n)).toBe(3n);
  });
});

describe("mappings", () => {
  it("reads unset entries as zero and writes copies", () => {
    const state = { balances: {} };
    const next = writeMapping(state, "balances", bob.address.toUpperCase().replace("0X", "0x"), 7n);
    expect(readMapping(next, "balances", bob.address)).toBe(7n);
    expect(readMapping(state, "balances", bob.address)).toBe(0n);
  });

  it("deletes an entry from a copy, whatever the address case", () => {
    const state = writeMapping({ balances: {} }, "balances", bob.address, 7n);
    const next = deleteMapping(state, "balances", bob.address.toUpperCase().replace("0X", "0x"));
    expect(next.balances).toEqual({});
    expect(readMapping(next, "balances", bob.address)).toBe(0n);
    expect(readMapping(state, "balances", bob.address)).toBe(7n);
  });

  it("keys mappings by token id, and reads unset address entries as the zero address", () => {
    const state = writeMapping({ owners: {}, balances: {} }, "owners", 7n, bob.address);
    expect(readAddressMapping(state, "owners", 7n)).toBe(bob.address);
    expect(readAddressMapping(state, "owners", 8n)).toBe(ZERO_ADDRESS);
    expect(state.owners).toEqual({ "7": bob.address });
    expect(deleteMapping(state, "owners", 7n).owners).toEqual({});
    expect(readMapping(writeMapping(state, "balances", 7n, 3n), "balances", 7n)).toBe(3n);
  });

  it("reads and writes nested mappings on copies, whatever the address case", () => {
    const state = { allowances: {} };
    const upper = (address: string) => address.toUpperCase().replace("0X", "0x");
    const next = writeNestedMapping(state, "allowances", upper(alice.address), upper(bob.address), 5n);
    const both = writeNestedMapping(next, "allowances", alice.address, alice.address, 9n);
    expect(readNestedMapping(both, "allowances", alice.address, bob.address)).toBe(5n);
    expect(readNestedMapping(both, "allowances", alice.address, alice.address)).toBe(9n);
    expect(readNestedMapping(both, "allowances", bob.address, alice.address)).toBe(0n);
    expect(readNestedMapping(state, "allowances", alice.address, bob.address)).toBe(0n);
    expect(next.allowances).toEqual({ [alice.address]: { [bob.address]: 5n } });
  });
});

describe("callSimulation", () => {
  const state = vault.initialState();

  it("applies a write and reports its events", () => {
    const result = callSimulation(vault, state, "add", { amount: "5" }, alice);
    expect(result).toMatchObject({ ok: true, events: [{ name: "Added", args: { amount: 5n } }] });
    expect(result.state.total).toBe(5n);
    expect(state.total).toBe(0n);
  });

  it("returns the value of a view function without changing state", () => {
    const result = callSimulation(vault, { ...state, total: 9n }, "total", {}, bob);
    expect(result).toMatchObject({ ok: true, returns: 9n });
  });

  it("leaves the state unchanged on a revert", () => {
    const result = callSimulation(vault, state, "add", { amount: "5" }, bob);
    expect(result).toMatchObject({ ok: false, error: { error: "NotOwner" } });
    expect(result.state).toBe(state);
  });

  it("reports invalid arguments as failed calls", () => {
    expect(callSimulation(vault, state, "add", { amount: "abc" }, alice).error?.error).toMatch(/unsigned/);
  });
});

describe("simulated clock", () => {
  const clock: LessonSimulation = {
    contract: "Clock",
    accounts: [alice],
    clock: true,
    initialState: () => ({ stamped: 0n }),
    functions: [
      {
        name: "stamp",
        abiName: "stamp",
        view: false,
        params: [],
        run: (state, _args, _caller, context) => ({ state: { ...state, stamped: context.timestamp } }),
      },
    ],
  };

  it("starts at SIM_START_TIME and moves forward by SIM_BLOCK_TIME per sent transaction", () => {
    expect(simTimestamp(0)).toBe(SIM_START_TIME);
    expect(simTimestamp(3)).toBe(SIM_START_TIME + 3n * SIM_BLOCK_TIME);
    expect(SIM_BLOCK_TIME).toBe(12n);
  });

  it("passes the block time to the function", () => {
    const result = callSimulation(clock, clock.initialState(), "stamp", {}, alice, { timestamp: simTimestamp(2) });
    expect(result.state.stamped).toBe(SIM_START_TIME + 24n);
  });

  it("runs at the start time when no block is given", () => {
    expect(callSimulation(clock, clock.initialState(), "stamp", {}, alice).state.stamped).toBe(SIM_START_TIME);
  });
});

describe("mock contracts", () => {
  const feed = { name: "Feed", address: "0x000000000000000000000000000000000000f33d", note: "A price feed." } as const;
  const consumer: LessonSimulation = {
    contract: "Consumer",
    accounts: [alice, bob],
    mocks: [feed],
    initialState: () => ({ last: 0n, Feed: { answer: 7n } }),
    functions: [
      {
        name: "set_answer",
        abiName: "setAnswer",
        view: false,
        contract: "Feed",
        params: [{ name: "answer", type: "uint256" }],
        run: (state, args) => ({ state: writeMockState(state, "Feed", { answer: args.answer }), events: [{ name: "AnswerUpdated", args: { answer: args.answer }, contract: "Feed" }] }),
      },
      {
        name: "read",
        abiName: "read",
        view: false,
        params: [{ name: "limit", type: "uint256" }],
        run: (state, args, _caller, context) => {
          const answer = mockState(state, "Feed").answer as bigint;
          // Writes the mock, then reverts past the limit: the write must be undone too.
          const next = writeMockState({ ...state, last: answer }, "Feed", { answer: answer + 1n });
          return answer > (args.limit as bigint) ? { revert: { error: "TooHigh" } } : { state: next, returns: context.self };
        },
      },
      {
        name: "is_feed",
        abiName: "isFeed",
        view: true,
        params: [{ name: "account", type: "address" }],
        returns: "bool",
        run: (_state, args) => ({ returns: args.account === feed.address }),
      },
    ],
  };

  it("names the accounts, the lesson's contract and its mocks", () => {
    expect(namedAddresses(consumer)).toEqual([alice, bob, { name: "Consumer", address: SIM_CONTRACT_ADDRESS }, { name: "Feed", address: feed.address }]);
    expect(formatSimValue(SIM_CONTRACT_ADDRESS, namedAddresses(consumer))).toBe("Consumer");
  });

  it("parses the name of a mock or of the lesson's contract as its address", () => {
    expect(callSimulation(consumer, consumer.initialState(), "is_feed", { account: "feed" }, alice).returns).toBe(true);
    expect(callSimulation(consumer, consumer.initialState(), "is_feed", { account: "Consumer" }, alice).returns).toBe(false);
  });

  it("runs a mock's functions on its storage record, and gives the lesson's contract its address", () => {
    const set = callSimulation(consumer, consumer.initialState(), "set_answer", { answer: "3" }, alice);
    expect(set.state.Feed).toEqual({ answer: 3n });
    expect(set.events).toEqual([{ name: "AnswerUpdated", args: { answer: 3n }, contract: "Feed" }]);
    const read = callSimulation(consumer, set.state, "read", { limit: "10" }, alice);
    expect(read).toMatchObject({ ok: true, returns: SIM_CONTRACT_ADDRESS, state: { last: 3n, Feed: { answer: 4n } } });
  });

  it("undoes the writes to a mock when the call reverts", () => {
    const state = consumer.initialState();
    const result = callSimulation(consumer, state, "read", { limit: "1" }, alice);
    expect(result).toMatchObject({ ok: false, error: { error: "TooHigh" } });
    expect(result.state).toBe(state);
    expect(state).toEqual({ last: 0n, Feed: { answer: 7n } });
  });
});

describe("payable calls", () => {
  const jar: LessonSimulation = {
    contract: "Jar",
    accounts: [alice, bob],
    initialState: () => ({ held: 0n }),
    functions: [
      {
        name: "fill",
        abiName: "fill",
        view: false,
        payable: true,
        params: [],
        run: (state, _args, _caller, context) => ({ state: { ...state, held: wrappingAdd(state.held as bigint, context.value) } }),
      },
      {
        name: "seen",
        abiName: "seen",
        view: true,
        params: [],
        returns: "uint256",
        run: (_state, _args, _caller, context) => ({ returns: context.balance }),
      },
      {
        name: "pay",
        abiName: "pay",
        view: false,
        params: [{ name: "amount", type: "uint256" }],
        run: (state, args, caller) => ({ state, transfers: [{ to: caller.address, amount: args.amount as bigint }] }),
      },
      {
        name: "fill_then_fail",
        abiName: "fillThenFail",
        view: false,
        payable: true,
        params: [],
        run: () => ({ revert: { error: "Nope" } }),
      },
    ],
  };

  it("passes the value to a payable function and adds it to the contract balance", () => {
    const result = callSimulation(jar, jar.initialState(), "fill", {}, alice, { value: "5", balance: 10n });
    expect(result).toMatchObject({ ok: true, balance: 15n, transfers: [], state: { held: 5n } });
  });

  it("shows the balance during the call, the value included", () => {
    expect(callSimulation(jar, jar.initialState(), "seen", {}, alice, { balance: 7n })).toMatchObject({ returns: 7n, balance: 7n });
  });

  it("treats an empty value as no ETH", () => {
    expect(callSimulation(jar, jar.initialState(), "fill", {}, alice, { value: " ", balance: 3n })).toMatchObject({ ok: true, balance: 3n });
  });

  it("reverts when a function that is not payable receives ETH", () => {
    const state = jar.initialState();
    const result = callSimulation(jar, state, "pay", { amount: "1" }, alice, { value: "1", balance: 10n });
    expect(result).toMatchObject({ ok: false, error: { error: "method pay not payable" }, balance: 10n });
    expect(result.state).toBe(state);
  });

  it("refunds the value when a payable function reverts", () => {
    const result = callSimulation(jar, jar.initialState(), "fill_then_fail", {}, alice, { value: "4", balance: 10n });
    expect(result).toMatchObject({ ok: false, error: { error: "Nope" }, balance: 10n });
  });

  it("reports an invalid value as a failed call", () => {
    expect(callSimulation(jar, jar.initialState(), "fill", {}, alice, { value: "-1" }).error?.error).toMatch(/unsigned/);
  });

  it("sends ETH out of the contract balance", () => {
    const result = callSimulation(jar, jar.initialState(), "pay", { amount: "4" }, bob, { balance: 10n });
    expect(result).toMatchObject({ ok: true, balance: 6n, transfers: [{ to: bob.address, amount: 4n }] });
  });

  it("reverts a transfer the contract cannot cover", () => {
    const state = jar.initialState();
    const result = callSimulation(jar, state, "pay", { amount: "11" }, bob, { balance: 10n });
    expect(result).toMatchObject({ ok: false, balance: 10n, transfers: [] });
    expect(result.error?.error).toMatch(/balance is too low/);
    expect(result.state).toBe(state);
  });

  it("knows which simulations hold ETH", () => {
    expect(holdsEth(jar)).toBe(true);
    expect(holdsEth(vault)).toBe(false);
  });
});

describe("formatSimValue", () => {
  it("formats scalars, accounts and addresses", () => {
    expect(formatSimValue(1234567n, [alice])).toBe("1,234,567");
    expect(formatSimValue(true, [alice])).toBe("true");
    expect(formatSimValue("gm", [alice])).toBe('"gm"');
    expect(formatSimValue(alice.address.toUpperCase().replace("0X", "0x"), [alice])).toBe("Alice");
    expect(formatSimValue(bob.address, [alice])).toBe("0x0000…0b0b");
  });

  it("formats tuples and structs", () => {
    expect(formatSimValue(["Buy milk", false], [alice])).toBe('("Buy milk", false)');
    expect(formatSimValue({ title: "Buy milk", done: true }, [alice])).toBe('{ title: "Buy milk", done: true }');
  });

  it("shows the keys of an inner mapping like addresses", () => {
    expect(formatSimValue({ [alice.address]: 5n, [bob.address]: 1000n }, [alice])).toBe("{ Alice: 5, 0x0000…0b0b: 1,000 }");
    expect(formatSimKey(alice.address, [alice])).toBe("Alice");
    expect(formatSimKey("title", [alice])).toBe("title");
  });

  it("shows token id keys as numbers", () => {
    expect(formatSimKey("7", [alice])).toBe("7");
    expect(formatSimKey("12345", [alice])).toBe("12,345");
    expect(formatSimValue({ "7": alice.address }, [alice])).toBe("{ 7: Alice }");
  });
});

describe("callSimulation with vectors", () => {
  const log: LessonSimulation = {
    contract: "Log",
    accounts: [alice],
    initialState: () => ({ items: [] }),
    functions: [
      {
        name: "push",
        abiName: "push",
        view: false,
        params: [{ name: "value", type: "uint256" }],
        run: (state, args) => {
          const items = state.items as bigint[];
          items.push(args.value as bigint);
          return items.length > 2 ? { revert: { error: "Full" } } : { state };
        },
      },
    ],
  };

  it("appends to a copy and keeps the previous state", () => {
    const state = log.initialState();
    const result = callSimulation(log, state, "push", { value: "7" }, alice);
    expect(result.state.items).toEqual([7n]);
    expect(state.items).toEqual([]);
  });

  it("drops changes made to a list before a revert", () => {
    const state = { items: [1n, 2n] };
    const result = callSimulation(log, state, "push", { value: "3" }, alice);
    expect(result).toMatchObject({ ok: false, error: { error: "Full" } });
    expect(result.state).toBe(state);
    expect(state.items).toEqual([1n, 2n]);
  });
});
