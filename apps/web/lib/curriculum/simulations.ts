import { checkedAdd, deleteMapping, readMapping, writeMapping, type LessonSimulation, type SimAccount } from './simulation';

/** Named accounts the student can call from. */
export const SIM_ACCOUNTS: SimAccount[] = [
  { name: 'Alice', address: '0x00000000000000000000000000000000000a11ce' },
  { name: 'Bob', address: '0x0000000000000000000000000000000000000b0b' },
  { name: 'Carol', address: '0x00000000000000000000000000000000000ca201' },
];

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
        run: (state) => ({ state: { ...state, count: checkedAdd(state.count as bigint, 1n) } }),
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
          next = writeMapping(next, 'balances', to, checkedAdd(readMapping(next, 'balances', to), amount));
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
        run: (state, args, caller) => {
          const from = caller.address;
          const to = args.to as string;
          const value = args.value as bigint;
          const have = readMapping(state, 'balances', from);
          if (have < value) {
            return { revert: { error: 'InsufficientBalance', args: { from, have, want: value } } };
          }
          let next = writeMapping(state, 'balances', from, have - value);
          next = writeMapping(next, 'balances', to, checkedAdd(readMapping(next, 'balances', to), value));
          return { state: next, returns: true, events: [{ name: 'Transfer', args: { from, to, value } }] };
        },
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
          const total = checkedAdd(readMapping(state, 'scores', caller.address), args.points as bigint);
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
};

export function getSimulation(lessonId: number): LessonSimulation | null {
  return SIMULATIONS[lessonId] ?? null;
}
