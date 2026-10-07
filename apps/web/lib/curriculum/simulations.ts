import { UINT256_MAX, deleteMapping, readMapping, readNestedMapping, wrappingAdd, writeMapping, writeNestedMapping, type LessonSimulation, type SimAccount, type SimOutcome, type SimState } from './simulation';

/** Named accounts the student can call from. */
export const SIM_ACCOUNTS: SimAccount[] = [
  { name: 'Alice', address: '0x00000000000000000000000000000000000a11ce' },
  { name: 'Bob', address: '0x0000000000000000000000000000000000000b0b' },
  { name: 'Carol', address: '0x00000000000000000000000000000000000ca201' },
];

/** `Address::ZERO`, the value of an address field never written. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** "Try it" models of each lesson's contract, keyed by lesson id. */
export const SIMULATIONS: Record<number, LessonSimulation> = {
  1: {
    contract: 'HelloWorld',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ greeting: '' }),
    functions: [
      {
        name: 'get_greeting',
        abiName: 'getGreeting',
        view: true,
        params: [],
        returns: 'string',
        run: (state) => ({ returns: state.greeting as string }),
      },
      {
        name: 'set_greeting',
        abiName: 'setGreeting',
        view: false,
        params: [{ name: 'greeting', type: 'string' }],
        run: (state, args) => ({ state: { ...state, greeting: args.greeting } }),
      },
    ],
  },
  2: {
    contract: 'Counter',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ count: 0n }),
    functions: [
      {
        name: 'get',
        abiName: 'get',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: state.count as bigint }),
      },
      {
        name: 'increment',
        abiName: 'increment',
        view: false,
        params: [],
        run: (state) => ({ state: { ...state, count: wrappingAdd(state.count as bigint, 1n) } }),
      },
      {
        name: 'reset',
        abiName: 'reset',
        view: false,
        params: [],
        run: (state) => ({ state: { ...state, count: 0n } }),
      },
    ],
  },
  3: {
    contract: 'Token',
    note: 'The model starts with 1,000 tokens for Alice so there is something to send.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ balances: { [SIM_ACCOUNTS[0].address]: 1000n } }),
    functions: [
      {
        name: 'send',
        abiName: 'send',
        view: false,
        params: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        run: (state, args, caller) => {
          const from = caller.address;
          const to = args.to as string;
          const amount = args.amount as bigint;
          const available = readMapping(state, 'balances', from);
          if (available < amount) {
            return { revert: { error: 'InsufficientBalance', args: { available, required: amount } } };
          }
          // Same order as the lesson: debit the sender, then read and credit the recipient.
          let next = writeMapping(state, 'balances', from, available - amount);
          next = writeMapping(next, 'balances', to, wrappingAdd(readMapping(next, 'balances', to), amount));
          return { state: next, events: [{ name: 'Transfer', args: { from, to, value: amount } }] };
        },
      },
    ],
  },
  4: {
    contract: 'Erc20',
    note: 'The model starts with a supply of 1,000 tokens, all held by Alice.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({
      total_supply: 1000n,
      balances: { [SIM_ACCOUNTS[0].address]: 1000n },
      allowances: {},
    }),
    functions: [
      {
        name: 'total_supply',
        abiName: 'totalSupply',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: state.total_supply as bigint }),
      },
      {
        name: 'balance_of',
        abiName: 'balanceOf',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'balances', args.account as string) }),
      },
      {
        name: 'transfer',
        abiName: 'transfer',
        view: false,
        params: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        returns: 'bool',
        run: (state, args, caller) => moveTokens(state, caller.address, args.to as string, args.value as bigint),
      },
    ],
  },
  6: {
    contract: 'Scoreboard',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ scores: {} }),
    functions: [
      {
        name: 'score_of',
        abiName: 'scoreOf',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'scores', args.account as string) }),
      },
      {
        name: 'record',
        abiName: 'record',
        view: false,
        params: [{ name: 'points', type: 'uint256' }],
        run: (state, args, caller) => {
          const total = wrappingAdd(readMapping(state, 'scores', caller.address), args.points as bigint);
          return { state: writeMapping(state, 'scores', caller.address, total) };
        },
      },
      {
        name: 'clear',
        abiName: 'clear',
        view: false,
        params: [],
        run: (state, _args, caller) => ({ state: deleteMapping(state, 'scores', caller.address) }),
      },
    ],
  },
  7: {
    contract: 'PriceLog',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ prices: [] }),
    functions: [
      {
        name: 'length',
        abiName: 'length',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: BigInt((state.prices as bigint[]).length) }),
      },
      {
        name: 'record',
        abiName: 'record',
        view: false,
        params: [{ name: 'price', type: 'uint256' }],
        run: (state, args) => ({ state: { ...state, prices: [...(state.prices as bigint[]), args.price as bigint] } }),
      },
      {
        name: 'price_at',
        abiName: 'priceAt',
        view: true,
        params: [{ name: 'index', type: 'uint256' }],
        returns: 'uint256',
        run: (state, args) => {
          const prices = state.prices as bigint[];
          const index = args.index as bigint;
          if (index >= BigInt(prices.length)) {
            return { revert: { error: 'IndexOutOfBounds', args: { index, length: BigInt(prices.length) } } };
          }
          return { returns: prices[Number(index)] };
        },
      },
      {
        name: 'remove_last',
        abiName: 'removeLast',
        view: false,
        params: [],
        // Like pop() on an empty vector: nothing to remove, and no revert.
        run: (state) => ({ state: { ...state, prices: (state.prices as bigint[]).slice(0, -1) } }),
      },
    ],
  },
  8: {
    contract: 'TodoList',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ tasks: [] }),
    functions: [
      {
        name: 'add_task',
        abiName: 'addTask',
        view: false,
        params: [{ name: 'title', type: 'string' }],
        // grow() appends a task with every field at zero, then the title is set.
        run: (state, args) => ({ state: { ...state, tasks: [...(state.tasks as Task[]), { title: args.title, done: false }] } }),
      },
      {
        name: 'task',
        abiName: 'task',
        view: true,
        params: [{ name: 'id', type: 'uint256' }],
        returns: ['string', 'bool'],
        run: (state, args) => {
          const task = findTask(state, args.id as bigint);
          return 'revert' in task ? task : { returns: [task.title, task.done] };
        },
      },
      {
        name: 'complete',
        abiName: 'complete',
        view: false,
        params: [{ name: 'id', type: 'uint256' }],
        run: (state, args) => {
          const task = findTask(state, args.id as bigint);
          if ('revert' in task) return task;
          const tasks = (state.tasks as Task[]).map((entry, index) => (BigInt(index) === args.id ? { ...entry, done: true } : entry));
          return { state: { ...state, tasks } };
        },
      },
    ],
  },
  9: {
    contract: 'Attendance',
    note: 'The block time is a simplified simulated clock: each sent transaction runs 12 seconds after the previous one, while real Arbitrum blocks are much faster.',
    accounts: SIM_ACCOUNTS,
    clock: true,
    initialState: () => ({ check_ins: {}, last_visitor: ZERO_ADDRESS }),
    functions: [
      {
        name: 'check_in',
        abiName: 'checkIn',
        view: false,
        params: [],
        run: (state, _args, caller, block) => ({
          state: { ...writeMapping(state, 'check_ins', caller.address, block.timestamp), last_visitor: caller.address },
        }),
      },
      {
        name: 'checked_in_at',
        abiName: 'checkedInAt',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'check_ins', args.account as string) }),
      },
      {
        name: 'last_visitor',
        abiName: 'lastVisitor',
        view: true,
        params: [],
        returns: 'address',
        run: (state) => ({ returns: state.last_visitor as string }),
      },
    ],
  },
  10: {
    contract: 'FeeConfig',
    note: 'The model is deployed with Alice as the owner, as if the constructor received her address.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ owner: SIM_ACCOUNTS[0].address, fee: 0n }),
    functions: [
      {
        name: 'owner',
        abiName: 'owner',
        view: true,
        params: [],
        returns: 'address',
        run: (state) => ({ returns: state.owner as string }),
      },
      {
        name: 'fee',
        abiName: 'fee',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: state.fee as bigint }),
      },
      {
        name: 'set_fee',
        abiName: 'setFee',
        view: false,
        params: [{ name: 'fee', type: 'uint256' }],
        run: (state, args, caller) => onlyOwner(state, caller) ?? { state: { ...state, fee: args.fee } },
      },
      {
        name: 'transfer_ownership',
        abiName: 'transferOwnership',
        view: false,
        params: [{ name: 'new_owner', type: 'address' }],
        run: (state, args, caller) => onlyOwner(state, caller) ?? { state: { ...state, owner: args.new_owner } },
      },
    ],
  },
  11: {
    contract: 'PiggyBank',
    note: 'Send ETH with deposit using its value field. The model tracks the ETH the contract holds, not the balances of the accounts.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ deposits: {} }),
    functions: [
      {
        name: 'deposit',
        abiName: 'deposit',
        view: false,
        payable: true,
        params: [],
        run: (state, _args, caller, call) => {
          const total = wrappingAdd(readMapping(state, 'deposits', caller.address), call.value);
          return { state: writeMapping(state, 'deposits', caller.address, total) };
        },
      },
      {
        name: 'deposit_of',
        abiName: 'depositOf',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'deposits', args.account as string) }),
      },
      {
        name: 'balance',
        abiName: 'balance',
        view: true,
        params: [],
        returns: 'uint256',
        run: (_state, _args, _caller, call) => ({ returns: call.balance }),
      },
      {
        name: 'withdraw',
        abiName: 'withdraw',
        view: false,
        params: [{ name: 'amount', type: 'uint256' }],
        run: (state, args, caller) => {
          const amount = args.amount as bigint;
          const available = readMapping(state, 'deposits', caller.address);
          if (available < amount) {
            return { revert: { error: 'InsufficientDeposit', args: { available, requested: amount } } };
          }
          // Checks, effects, interactions: the deposit is lowered before the ETH is sent.
          return {
            state: writeMapping(state, 'deposits', caller.address, available - amount),
            transfers: [{ to: caller.address, amount }],
          };
        },
      },
    ],
  },
  12: {
    contract: 'FeeQuote',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ rate_bps: 0n }),
    functions: [
      {
        name: 'fee',
        abiName: 'fee',
        view: true,
        params: [
          { name: 'amount', type: 'uint256' },
          { name: 'rate_bps', type: 'uint256' },
        ],
        returns: 'uint256',
        run: (_state, args) => quoteFee(args.amount as bigint, args.rate_bps as bigint),
      },
      {
        name: 'rate',
        abiName: 'rate',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: state.rate_bps as bigint }),
      },
      {
        name: 'set_rate',
        abiName: 'setRate',
        view: false,
        params: [{ name: 'rate_bps', type: 'uint256' }],
        run: (state, args) => ({ state: { ...state, rate_bps: args.rate_bps } }),
      },
      {
        name: 'quote',
        abiName: 'quote',
        view: true,
        params: [{ name: 'amount', type: 'uint256' }],
        returns: 'uint256',
        run: (state, args) => quoteFee(args.amount as bigint, state.rate_bps as bigint),
      },
      {
        name: 'quote_pair',
        abiName: 'quotePair',
        view: true,
        params: [
          { name: 'first', type: 'uint256' },
          { name: 'second', type: 'uint256' },
        ],
        returns: ['uint256', 'uint256'],
        run: (state, args) => {
          const rate = state.rate_bps as bigint;
          const first = quoteFee(args.first as bigint, rate);
          if ('revert' in first) return first;
          const second = quoteFee(args.second as bigint, rate);
          if ('revert' in second) return second;
          return { returns: [first.returns, second.returns] };
        },
      },
    ],
  },
  13: {
    contract: 'Erc20',
    note: 'The model starts with a supply of 1,000 tokens, all held by Alice. Approve another account, then call transfer_from as that account.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({
      total_supply: 1000n,
      balances: { [SIM_ACCOUNTS[0].address]: 1000n },
      allowances: {},
    }),
    functions: [
      {
        name: 'total_supply',
        abiName: 'totalSupply',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: state.total_supply as bigint }),
      },
      {
        name: 'balance_of',
        abiName: 'balanceOf',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'balances', args.account as string) }),
      },
      {
        name: 'transfer',
        abiName: 'transfer',
        view: false,
        params: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        returns: 'bool',
        run: (state, args, caller) => moveTokens(state, caller.address, args.to as string, args.value as bigint),
      },
      {
        name: 'allowance',
        abiName: 'allowance',
        view: true,
        params: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        returns: 'uint256',
        run: (state, args) => ({ returns: readNestedMapping(state, 'allowances', args.owner as string, args.spender as string) }),
      },
      {
        name: 'approve',
        abiName: 'approve',
        view: false,
        params: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        returns: 'bool',
        run: (state, args, caller) => {
          const owner = caller.address;
          const spender = args.spender as string;
          const value = args.value as bigint;
          return {
            state: writeNestedMapping(state, 'allowances', owner, spender, value),
            returns: true,
            events: [{ name: 'Approval', args: { owner, spender, value } }],
          };
        },
      },
      {
        name: 'transfer_from',
        abiName: 'transferFrom',
        view: false,
        params: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        returns: 'bool',
        run: (state, args, caller) => {
          const spender = caller.address;
          const from = args.from as string;
          const value = args.value as bigint;
          const allowed = readNestedMapping(state, 'allowances', from, spender);
          if (allowed < value) {
            return { revert: { error: 'InsufficientAllowance', args: { spender, have: allowed, want: value } } };
          }
          // An unlimited allowance is never lowered.
          const spent = allowed === UINT256_MAX ? state : writeNestedMapping(state, 'allowances', from, spender, allowed - value);
          return moveTokens(spent, from, args.to as string, value);
        },
      },
    ],
  },
};

/**
 * Lesson 4's transfer, also lesson 13's move_tokens: debits the sender, then reads and credits the
 * recipient (wrapping around like U256), emits Transfer and returns true, or reverts with
 * InsufficientBalance.
 */
function moveTokens(state: SimState, from: string, to: string, value: bigint): SimOutcome {
  const have = readMapping(state, 'balances', from);
  if (have < value) {
    return { revert: { error: 'InsufficientBalance', args: { from, have, want: value } } };
  }
  let next = writeMapping(state, 'balances', from, have - value);
  next = writeMapping(next, 'balances', to, wrappingAdd(readMapping(next, 'balances', to), value));
  return { state: next, returns: true, events: [{ name: 'Transfer', args: { from, to, value } }] };
}

/** A task of the lesson 8 to-do list. */
type Task = { title: string; done: boolean };

/** The task at `id`, or the UnknownTask revert of getter(id) and setter(id) past the end. */
function findTask(state: SimState, id: bigint): Task | { revert: { error: string; args: { id: bigint } } } {
  const tasks = state.tasks as Task[];
  return id < BigInt(tasks.length) ? tasks[Number(id)] : { revert: { error: 'UnknownTask', args: { id } } };
}

/** The Unauthorized revert of lesson 10's only_owner guard, or null when the caller is the owner. */
function onlyOwner(state: SimState, caller: SimAccount): { revert: { error: string; args: { caller: string } } } | null {
  const owner = state.owner as string;
  return caller.address.toLowerCase() === owner.toLowerCase() ? null : { revert: { error: 'Unauthorized', args: { caller: caller.address } } };
}

/**
 * Lesson 12's fee in basis points: `checked_mul` turns an overflow into the FeeOverflow revert
 * instead of wrapping around like `*`.
 */
function quoteFee(amount: bigint, rateBps: bigint): { returns: bigint } | { revert: { error: string; args: Record<string, bigint> } } {
  const scaled = amount * rateBps;
  if (scaled > UINT256_MAX) return { revert: { error: 'FeeOverflow', args: { amount, rate_bps: rateBps } } };
  return { returns: scaled / 10_000n };
}

export function getSimulation(lessonId: number): LessonSimulation | null {
  return SIMULATIONS[lessonId] ?? null;
}
