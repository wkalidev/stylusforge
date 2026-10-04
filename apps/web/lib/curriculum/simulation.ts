/**
 * "Try it" simulations: a JavaScript model of each lesson's contract, run in the browser after a
 * pass. They show what the contract does; they never execute the student's Rust.
 */

export type SimType = 'uint256' | 'address' | 'string';
export type SimValue = bigint | string;

/** Storage values; mappings are plain records keyed by address. */
export type SimState = Record<string, SimValue | Record<string, SimValue>>;

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
  | { state?: SimState; returns?: SimValue | boolean; events?: SimEvent[] };

export interface SimFunction {
  /** Rust name, as in the lesson code. */
  name: string;
  /** Name in the contract ABI (camelCase). */
  abiName: string;
  /** View functions read; the others write and can revert. */
  view: boolean;
  params: { name: string; type: SimType }[];
  returns?: SimType | 'bool';
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

/** Checked uint256 arithmetic, so a model never wraps around silently. */
export function checkedAdd(a: bigint, b: bigint): bigint {
  const sum = a + b;
  if (sum > UINT256_MAX) throw new SimArgumentError('Arithmetic overflow');
  return sum;
}

export function checkedSub(a: bigint, b: bigint): bigint {
  if (b > a) throw new SimArgumentError('Arithmetic underflow');
  return a - b;
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

export interface SimCallResult {
  ok: boolean;
  state: SimState;
  returns?: SimValue | boolean;
  events: SimEvent[];
  /** Set when the call reverted or the arguments were invalid. */
  error?: { error: string; args?: Record<string, SimValue> };
}

/**
 * Calls one function of a simulation. Arguments are parsed by type; a revert, an invalid argument
 * or an arithmetic error leaves the state unchanged, like a reverted transaction.
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
