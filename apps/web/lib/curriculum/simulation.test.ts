import { describe, expect, it } from "vitest";

import {
  UINT256_MAX,
  callSimulation,
  deleteMapping,
  checkedAdd,
  checkedSub,
  parseArgument,
  readMapping,
  writeMapping,
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
        return { state: { ...state, total: checkedAdd(state.total as bigint, args.amount as bigint) }, events: [{ name: "Added", args: { amount: args.amount } }] };
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

  it("keeps strings as typed", () => {
    expect(parseArgument("string", "  gm  ", [])).toBe("  gm  ");
  });
});

describe("checked arithmetic and mappings", () => {
  it("refuses to wrap around", () => {
    expect(() => checkedAdd(UINT256_MAX, 1n)).toThrow(/overflow/);
    expect(() => checkedSub(1n, 2n)).toThrow(/underflow/);
    expect(checkedSub(5n, 2n)).toBe(3n);
  });

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

  it("reports invalid arguments and arithmetic errors as failed calls", () => {
    expect(callSimulation(vault, state, "add", { amount: "abc" }, alice).error?.error).toMatch(/unsigned/);
    expect(callSimulation(vault, { ...state, total: UINT256_MAX }, "add", { amount: "1" }, alice).error?.error).toMatch(/overflow/);
  });
});
