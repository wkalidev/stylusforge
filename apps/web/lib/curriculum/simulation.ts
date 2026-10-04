/**
 * "Try it" simulations: a JavaScript model of each lesson's contract, run in the browser after a
 * pass. They show what the contract does; they never execute the student's Rust.
 */

export type SimType = 'uint256' | 'address' | 'string';
export type SimValue = bigint | string;

/**
 * A stored value: a scalar, a vector (an array) or a record, either a mapping keyed by address or
 * a struct keyed by field name.
 */
export type SimStored = SimValue | boolean | SimStored[] | { [key: string]: SimStored };

/** Storage fields by name. */
export type SimState = Record<string, SimStored>;

/** What a function returns: one value, or a tuple. */
export type SimReturn = SimValue | boolean | (SimValue | boolean)[];

export interface SimAccount {
  name: string;
  address: `0x${string}`;
}

export interface SimEvent {
  name: string;
  args: Record<string, SimValue>;
}

/** What a function body returns: a revert, or a new state with an optional value and events. */
export type SimOutcome =
  | { revert: { error: string; args?: Record<string, SimValue> } }
  | { state?: SimState; returns?: SimReturn; events?: SimEvent[] };

export interface SimFunction {
  /** Rust name, as in the lesson code. */
  name: string;
  /** Name in the contract ABI (camelCase). */
  abiName: string;
  /** View functions read; the others write and can revert. */
  view: boolean;
  params: { name: string; type: SimType }[];
  /** Return type; an array for a tuple, such as `(string, bool)`. */
  returns?: SimType | 'bool' | (SimType | 'bool')[];
  /** Pure: receives a copy of the state, the parsed arguments and the caller. */
  run(state: SimState, args: Record<string, SimValue>, caller: SimAccount): SimOutcome;
}

export interface LessonSimulation {
  /** The contract name shown in the panel. */
  contract: string;
  /** One sentence on what the model starts with, e.g. a seeded balance. */
  note?: string;
  accounts: SimAccount[];
  initialState(): SimState;
  functions: SimFunction[];
}

export const UINT256_MAX = (1n << 256n) - 1n;

export class SimArgumentError extends Error {}

/** Parses a typed argument typed by the student; accounts can be given by name. */
export function parseArgument(type: SimType, raw: string, accounts: SimAccount[]): SimValue {
  const text = raw.trim();
  if (type === 'string') return raw;
  if (type === 'uint256') {
    if (!/^\d+$/.test(text)) throw new SimArgumentError(`"${raw}" is not an unsigned integer`);
    const value = BigInt(text);
    if (value > UINT256_MAX) throw new SimArgumentError(`${text} does not fit in a uint256`);
    return value;
  }
  const account = accounts.find((candidate) => candidate.name.toLowerCase() === text.toLowerCase());
  if (account) return account.address;
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) throw new SimArgumentError(`"${raw}" is not an address (or an account name)`);
  return text;
}

/**
 * uint256 arithmetic as `U256` does it in Rust: `+` and `-` wrap around modulo 2^256 instead of
 * reverting (alloy's `ruint` implements them with `wrapping_add` and `wrapping_sub`).
 */
export function wrappingAdd(a: bigint, b: bigint): bigint {
  return (a + b) & UINT256_MAX;
}

export function wrappingSub(a: bigint, b: bigint): bigint {
  return (a - b) & UINT256_MAX;
}

/** Reads a mapping entry, zero when unset (like a storage mapping). */
export function readMapping(state: SimState, field: string, key: string): bigint {
  const mapping = state[field] as Record<string, SimValue>;
  return (mapping[key.toLowerCase()] as bigint | undefined) ?? 0n;
}

/** Returns a state copy with one mapping entry written. */
export function writeMapping(state: SimState, field: string, key: string, value: bigint): SimState {
  const mapping = { ...(state[field] as Record<string, SimValue>), [key.toLowerCase()]: value };
  return { ...state, [field]: mapping };
}

/** Returns a state copy with one mapping entry reset to zero, which removes it from the view. */
export function deleteMapping(state: SimState, field: string, key: string): SimState {
  const entries = Object.entries(state[field] as Record<string, SimValue>);
  return { ...state, [field]: Object.fromEntries(entries.filter(([entry]) => entry !== key.toLowerCase())) };
}

/**
 * A value as the Try it panel shows it: numbers with separators, known accounts by name, other
 * addresses shortened, strings quoted, tuples as `(a, b)` and structs as `{ field: value }`.
 */
export function formatSimValue(value: SimStored, accounts: SimAccount[]): string {
  if (typeof value === 'bigint') return value.toLocaleString('en-US');
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `(${value.map((item) => formatSimValue(item, accounts)).join(', ')})`;
  if (typeof value === 'object') {
    return `{ ${Object.entries(value).map(([field, item]) => `${field}: ${formatSimValue(item, accounts)}`).join(', ')} }`;
  }
  const account = accounts.find((candidate) => candidate.address.toLowerCase() === value.toLowerCase());
  if (account) return account.name;
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : JSON.stringify(value);
}

export interface SimCallResult {
  ok: boolean;
  state: SimState;
  returns?: SimReturn;
  events: SimEvent[];
  /** Set when the call reverted or the arguments were invalid. */
  error?: { error: string; args?: Record<string, SimValue> };
}

/**
 * Calls one function of a simulation. Arguments are parsed by type; a revert or an invalid argument
 * leaves the state unchanged, like a reverted transaction.
 */
export function callSimulation(
  simulation: LessonSimulation,
  state: SimState,
  functionName: string,
  rawArgs: Record<string, string>,
  caller: SimAccount,
): SimCallResult {
  const fn = simulation.functions.find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`Unknown simulated function ${functionName}`);
  try {
    const args: Record<string, SimValue> = {};
    for (const param of fn.params) {
      args[param.name] = parseArgument(param.type, rawArgs[param.name] ?? '', simulation.accounts);
    }
    const snapshot = structuredClone(state);
    const outcome = fn.run(snapshot, args, caller);
    if ('revert' in outcome) {
      return { ok: false, state, events: [], error: outcome.revert };
    }
    return {
      ok: true,
      state: fn.view ? state : (outcome.state ?? snapshot),
      returns: outcome.returns,
      events: outcome.events ?? [],
    };
  } catch (error) {
    if (error instanceof SimArgumentError) {
      return { ok: false, state, events: [], error: { error: error.message } };
    }
    throw error;
  }
}
