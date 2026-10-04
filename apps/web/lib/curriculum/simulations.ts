import { checkedAdd, readMapping, writeMapping, type LessonSimulation, type SimAccount } from './simulation';

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
};

export function getSimulation(lessonId: number): LessonSimulation | null {
  return SIMULATIONS[lessonId] ?? null;
}
