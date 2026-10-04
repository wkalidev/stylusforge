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
