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

/** What a function body sees of its call besides the arguments: the block and the ETH. */
export interface SimContext {
  /** Block time, in Unix seconds. */
  timestamp: bigint;
  /** Wei sent with the call (`msg_value()`); zero unless the function is payable. */
  value: bigint;
  /** The contract's ETH balance in wei during the call, the value sent included. */
  balance: bigint;
}

/** Wei sent by the contract to an address (`transfer_eth`). */
export interface SimTransfer {
  to: string;
  amount: bigint;
}

/** How a call is made: in which block, with how much ETH, on a contract holding how much. */
export interface SimCall {
  /** Block time; SIM_START_TIME when not given. */
  timestamp?: bigint;
  /** Wei sent with the call, as typed by the student; empty or missing for none. */
  value?: string;
  /** The contract's ETH balance before the call, in wei; zero when not given. */
  balance?: bigint;
}

/**
 * The simplified clock of the Try it panel: it starts at SIM_START_TIME and each sent transaction
 * runs SIM_BLOCK_TIME seconds after the previous one. Real Arbitrum blocks are much faster.
 */
export const SIM_START_TIME = 1_767_225_600n; // 2026-01-01 00:00:00 UTC
export const SIM_BLOCK_TIME = 12n;

/** The simulated block time once a number of transactions have been sent. */
export function simTimestamp(sent: number): bigint {
  return SIM_START_TIME + SIM_BLOCK_TIME * BigInt(sent);
}

/** What a function body returns: a revert, or a new state with an optional value and events. */
export type SimOutcome =
  | { revert: { error: string; args?: Record<string, SimValue> } }
  | { state?: SimState; returns?: SimReturn; events?: SimEvent[]; transfers?: SimTransfer[] };

export interface SimFunction {
  /** Rust name, as in the lesson code. */
  name: string;
  /** Name in the contract ABI (camelCase). */
  abiName: string;
  /** View functions read; the others write and can revert. */
  view: boolean;
  /** `#[payable]`: accepts ETH. A call sending ETH to any other function reverts. */
  payable?: boolean;
  params: { name: string; type: SimType }[];
  /** Return type; an array for a tuple, such as `(string, bool)`. */
  returns?: SimType | 'bool' | (SimType | 'bool')[];
  /** Pure: receives a copy of the state, the parsed arguments, the caller, the block and the ETH. */
  run(state: SimState, args: Record<string, SimValue>, caller: SimAccount, context: SimContext): SimOutcome;
}

export interface LessonSimulation {
  /** The contract name shown in the panel. */
  contract: string;
  /** One sentence on what the model starts with, e.g. a seeded balance. */
  note?: string;
  accounts: SimAccount[];
  initialState(): SimState;
  functions: SimFunction[];
  /** Whether the contract reads the block time, so the panel shows the simulated clock. */
  clock?: boolean;
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

/** `Address::ZERO`, the value of an address never written. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** A mapping key: an address in lowercase, or a uint256 (a token id) in decimal. */
function mappingKey(key: string | bigint): string {
  return typeof key === 'bigint' ? key.toString() : key.toLowerCase();
}

/** Reads a mapping entry, zero when unset (like a storage mapping). */
export function readMapping(state: SimState, field: string, key: string | bigint): bigint {
  const mapping = state[field] as Record<string, SimValue>;
  return (mapping[mappingKey(key)] as bigint | undefined) ?? 0n;
}

/** Reads an entry of a mapping to addresses, the zero address when unset. */
export function readAddressMapping(state: SimState, field: string, key: string | bigint): string {
  const mapping = state[field] as Record<string, SimValue>;
  return (mapping[mappingKey(key)] as string | undefined) ?? ZERO_ADDRESS;
}

/** Returns a state copy with one mapping entry written. */
export function writeMapping(state: SimState, field: string, key: string | bigint, value: SimValue): SimState {
  const mapping = { ...(state[field] as Record<string, SimValue>), [mappingKey(key)]: value };
  return { ...state, [field]: mapping };
}

/** Returns a state copy with one mapping entry reset to zero, which removes it from the view. */
export function deleteMapping(state: SimState, field: string, key: string | bigint): SimState {
  const entries = Object.entries(state[field] as Record<string, SimValue>);
  return { ...state, [field]: Object.fromEntries(entries.filter(([entry]) => entry !== mappingKey(key))) };
}

/** Reads an entry of a nested mapping (`mapping(address => mapping(address => uint256))`), zero when unset. */
export function readNestedMapping(state: SimState, field: string, outer: string, inner: string): bigint {
  const mapping = state[field] as Record<string, Record<string, SimValue>>;
  return (mapping[outer.toLowerCase()]?.[inner.toLowerCase()] as bigint | undefined) ?? 0n;
}

/** Returns a state copy with one entry of a nested mapping written. */
export function writeNestedMapping(state: SimState, field: string, outer: string, inner: string, value: bigint): SimState {
  const mapping = state[field] as Record<string, Record<string, SimValue>>;
  const entries = { ...mapping[outer.toLowerCase()], [inner.toLowerCase()]: value };
  return { ...state, [field]: { ...mapping, [outer.toLowerCase()]: entries } };
}

/**
 * A mapping key or struct field as the Try it panel shows it: addresses and token ids like values,
 * names as they are.
 */
export function formatSimKey(key: string, accounts: SimAccount[]): string {
  if (/^\d+$/.test(key)) return formatSimValue(BigInt(key), accounts);
  return /^0x[0-9a-fA-F]{40}$/.test(key) ? formatSimValue(key, accounts) : key;
}

/**
 * A value as the Try it panel shows it: numbers with separators, known accounts by name, other
 * addresses shortened, strings quoted, tuples as `(a, b)`, and structs and inner mappings as
 * `{ key: value }`.
 */
export function formatSimValue(value: SimStored, accounts: SimAccount[]): string {
  if (typeof value === 'bigint') return value.toLocaleString('en-US');
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `(${value.map((item) => formatSimValue(item, accounts)).join(', ')})`;
  if (typeof value === 'object') {
    return `{ ${Object.entries(value).map(([key, item]) => `${formatSimKey(key, accounts)}: ${formatSimValue(item, accounts)}`).join(', ')} }`;
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
  /** Wei the contract sent during the call. */
  transfers: SimTransfer[];
  /** The contract's ETH balance after the call: unchanged by a revert, which refunds the value. */
  balance: bigint;
  /** Set when the call reverted or the arguments were invalid. */
  error?: { error: string; args?: Record<string, SimValue> };
}

/** Whether a simulation has payable functions, so the panel shows the contract's ETH balance. */
export function holdsEth(simulation: LessonSimulation): boolean {
  return simulation.functions.some((fn) => fn.payable);
}

/**
 * Calls one function of a simulation. Arguments and the value are parsed by type; a revert or an
 * invalid argument leaves the state and the ETH balance unchanged, like a reverted transaction.
 */
export function callSimulation(
  simulation: LessonSimulation,
  state: SimState,
  functionName: string,
  rawArgs: Record<string, string>,
  caller: SimAccount,
  call: SimCall = {},
): SimCallResult {
  const fn = simulation.functions.find((candidate) => candidate.name === functionName);
  if (!fn) throw new Error(`Unknown simulated function ${functionName}`);
  const before = call.balance ?? 0n;
  const failed = (error: { error: string; args?: Record<string, SimValue> }): SimCallResult => ({
    ok: false,
    state,
    events: [],
    transfers: [],
    balance: before,
    error,
  });
  try {
    const value = call.value?.trim() ? (parseArgument('uint256', call.value, []) as bigint) : 0n;
    // Like the SDK: a function without #[payable] reverts, with no error data, when it receives ETH.
    if (value > 0n && !fn.payable) return failed({ error: `method ${fn.name} not payable` });
    const args: Record<string, SimValue> = {};
    for (const param of fn.params) {
      args[param.name] = parseArgument(param.type, rawArgs[param.name] ?? '', simulation.accounts);
    }
    const context: SimContext = { timestamp: call.timestamp ?? SIM_START_TIME, value, balance: before + value };
    const snapshot = structuredClone(state);
    const outcome = fn.run(snapshot, args, caller, context);
    if ('revert' in outcome) return failed(outcome.revert);
    const transfers = outcome.transfers ?? [];
    const sent = transfers.reduce((total, transfer) => total + transfer.amount, 0n);
    // A transfer the contract cannot cover fails, and transfer_eth(...)? reverts the whole call.
    if (sent > context.balance) return failed({ error: 'ETH transfer failed: the contract balance is too low' });
    return {
      ok: true,
      state: fn.view ? state : (outcome.state ?? snapshot),
      returns: outcome.returns,
      events: outcome.events ?? [],
      transfers,
      balance: context.balance - sent,
    };
  } catch (error) {
    if (error instanceof SimArgumentError) return failed({ error: error.message });
    throw error;
  }
}
