import { checkedAdd, type LessonSimulation, type SimAccount } from './simulation';

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
};

export function getSimulation(lessonId: number): LessonSimulation | null {
  return SIMULATIONS[lessonId] ?? null;
}
