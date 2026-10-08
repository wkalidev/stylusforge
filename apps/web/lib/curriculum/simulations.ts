import { SIM_START_TIME, UINT256_MAX, UINT64_MAX, ZERO_ADDRESS, deleteMapping, mockState, readAddressMapping, readMapping, readNestedMapping, wrappingAdd, wrappingSub, writeMapping, writeMockState, writeNestedMapping, type LessonSimulation, type SimAccount, type SimEvent, type SimOutcome, type SimState, type SimValue } from './simulation';

/** Named accounts the student can call from. */
export const SIM_ACCOUNTS: SimAccount[] = [
  { name: 'Alice', address: '0x00000000000000000000000000000000000a11ce' },
  { name: 'Bob', address: '0x0000000000000000000000000000000000000b0b' },
  { name: 'Carol', address: '0x00000000000000000000000000000000000ca201' },
];

export { ZERO_ADDRESS };

/** The address of the mock price feed of lesson 16. */
export const PRICE_FEED_ADDRESS = '0x000000000000000000000000000000000000f33d';

/** The address of the mock ERC-20 token of lesson 5. */
export const TOKEN_ADDRESS = '0x0000000000000000000000000000000000007070';

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
  14: {
    contract: 'Erc721',
    note: 'The model starts with no token: mint one first. Minting is open to anyone in this exercise only.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ owners: {}, balances: {}, token_approvals: {} }),
    functions: [
      {
        name: 'balance_of',
        abiName: 'balanceOf',
        view: true,
        params: [{ name: 'owner', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'balances', args.owner as string) }),
      },
      {
        name: 'owner_of',
        abiName: 'ownerOf',
        view: true,
        params: [{ name: 'token_id', type: 'uint256' }],
        returns: 'address',
        run: (state, args) => {
          const owner = ownerOf(state, args.token_id as bigint);
          return typeof owner === 'string' ? { returns: owner } : owner;
        },
      },
      {
        name: 'mint',
        abiName: 'mint',
        view: false,
        params: [
          { name: 'receiver', type: 'address' },
          { name: 'token_id', type: 'uint256' },
        ],
        run: (state, args) => {
          const receiver = args.receiver as string;
          const tokenId = args.token_id as bigint;
          if (receiver.toLowerCase() === ZERO_ADDRESS) return { revert: { error: 'InvalidReceiver', args: { receiver } } };
          if (readAddressMapping(state, 'owners', tokenId) !== ZERO_ADDRESS) {
            return { revert: { error: 'AlreadyMinted', args: { token_id: tokenId } } };
          }
          let next = writeMapping(state, 'balances', receiver, wrappingAdd(readMapping(state, 'balances', receiver), 1n));
          next = writeMapping(next, 'owners', tokenId, receiver);
          return { state: next, events: [{ name: 'Transfer', args: { from: ZERO_ADDRESS, to: receiver, token_id: tokenId } }] };
        },
      },
      {
        name: 'approve',
        abiName: 'approve',
        view: false,
        params: [
          { name: 'approved', type: 'address' },
          { name: 'token_id', type: 'uint256' },
        ],
        run: (state, args, caller) => {
          const tokenId = args.token_id as bigint;
          const owner = ownerOf(state, tokenId);
          if (typeof owner !== 'string') return owner;
          if (caller.address.toLowerCase() !== owner.toLowerCase()) {
            return { revert: { error: 'InsufficientApproval', args: { operator: caller.address, token_id: tokenId } } };
          }
          const approved = args.approved as string;
          return {
            state: writeMapping(state, 'token_approvals', tokenId, approved),
            events: [{ name: 'Approval', args: { owner: caller.address, approved, token_id: tokenId } }],
          };
        },
      },
      {
        name: 'get_approved',
        abiName: 'getApproved',
        view: true,
        params: [{ name: 'token_id', type: 'uint256' }],
        returns: 'address',
        run: (state, args) => {
          const tokenId = args.token_id as bigint;
          const owner = ownerOf(state, tokenId);
          return typeof owner === 'string' ? { returns: readAddressMapping(state, 'token_approvals', tokenId) } : owner;
        },
      },
      {
        name: 'transfer_from',
        abiName: 'transferFrom',
        view: false,
        params: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'token_id', type: 'uint256' },
        ],
        run: (state, args, caller) => {
          const from = args.from as string;
          const to = args.to as string;
          const tokenId = args.token_id as bigint;
          if (to.toLowerCase() === ZERO_ADDRESS) return { revert: { error: 'InvalidReceiver', args: { receiver: to } } };
          const owner = ownerOf(state, tokenId);
          if (typeof owner !== 'string') return owner;
          if (owner.toLowerCase() !== from.toLowerCase()) {
            return { revert: { error: 'IncorrectOwner', args: { from, token_id: tokenId, owner } } };
          }
          const sender = caller.address.toLowerCase();
          if (sender !== owner.toLowerCase() && sender !== readAddressMapping(state, 'token_approvals', tokenId).toLowerCase()) {
            return { revert: { error: 'InsufficientApproval', args: { operator: caller.address, token_id: tokenId } } };
          }
          // Same order as the lesson: clear the approval, move one token between the balances, then the owner.
          let next = deleteMapping(state, 'token_approvals', tokenId);
          next = writeMapping(next, 'balances', from, readMapping(next, 'balances', from) - 1n);
          next = writeMapping(next, 'balances', to, wrappingAdd(readMapping(next, 'balances', to), 1n));
          next = writeMapping(next, 'owners', tokenId, to);
          return { state: next, events: [{ name: 'Transfer', args: { from, to, token_id: tokenId } }] };
        },
      },
    ],
  },
  15: {
    contract: 'ForgeToken',
    note: 'The model is deployed as if the constructor received the name Forge Token, the symbol FORGE, Alice as the recipient and a supply of 1,000. It follows openzeppelin-stylus 0.3.0, whose errors are named as in ERC-6093.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({
      total_supply: 1000n,
      balances: { [SIM_ACCOUNTS[0].address]: 1000n },
      allowances: {},
      name: 'Forge Token',
      symbol: 'FORGE',
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
        run: (state, args, caller) => ozTransfer(state, caller.address, args.to as string, args.value as bigint),
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
          if (spender.toLowerCase() === ZERO_ADDRESS) return { revert: { error: 'ERC20InvalidSpender', args: { spender: ZERO_ADDRESS } } };
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
          // _spend_allowance: an unlimited allowance is never lowered, and lowering it emits no Approval.
          const allowance = readNestedMapping(state, 'allowances', from, spender);
          let next = state;
          if (allowance !== UINT256_MAX) {
            if (allowance < value) return { revert: { error: 'ERC20InsufficientAllowance', args: { spender, allowance, needed: value } } };
            if (from.toLowerCase() === ZERO_ADDRESS) return { revert: { error: 'ERC20InvalidApprover', args: { approver: ZERO_ADDRESS } } };
            next = writeNestedMapping(state, 'allowances', from, spender, allowance - value);
          }
          return ozTransfer(next, from, args.to as string, value);
        },
      },
      {
        name: 'name',
        abiName: 'name',
        view: true,
        params: [],
        returns: 'string',
        run: (state) => ({ returns: state.name as string }),
      },
      {
        name: 'symbol',
        abiName: 'symbol',
        view: true,
        params: [],
        returns: 'string',
        run: (state) => ({ returns: state.symbol as string }),
      },
      {
        name: 'decimals',
        abiName: 'decimals',
        view: true,
        params: [],
        returns: 'uint8',
        run: () => ({ returns: 18n }),
      },
      {
        name: 'supports_interface',
        abiName: 'supportsInterface',
        view: true,
        params: [{ name: 'interface_id', type: 'bytes4' }],
        returns: 'bool',
        run: (_state, args) => ({ returns: FORGE_TOKEN_INTERFACES.includes(args.interface_id as string) }),
      },
    ],
  },
  16: {
    contract: 'PriceConsumer',
    note: 'It is deployed with the mock PriceFeed as its feed and a max_age of 3,600 seconds. The block time is a simplified clock: 12 seconds per sent transaction, while real Arbitrum blocks are much faster.',
    accounts: SIM_ACCOUNTS,
    clock: true,
    mocks: [
      {
        name: 'PriceFeed',
        address: PRICE_FEED_ADDRESS,
        note: 'It models a Chainlink feed with 8 decimals: set its answer, or move its update time to make it stale (0 for an incomplete round).',
      },
    ],
    initialState: () => ({
      feed: PRICE_FEED_ADDRESS,
      max_age: 3600n,
      PriceFeed: { decimals: 8n, round_id: 1n, answer: 300_000_000_000n, updated_at: SIM_START_TIME },
    }),
    functions: [
      {
        name: 'feed',
        abiName: 'feed',
        view: true,
        params: [],
        returns: 'address',
        run: (state) => ({ returns: state.feed as string }),
      },
      {
        name: 'decimals',
        abiName: 'decimals',
        view: true,
        params: [],
        returns: 'uint8',
        run: (state) => ({ returns: mockState(state, 'PriceFeed').decimals as bigint }),
      },
      {
        name: 'price',
        abiName: 'price',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state, _args, _caller, context) => {
          const { answer, updated_at: updatedAt } = mockState(state, 'PriceFeed') as { answer: bigint; updated_at: bigint };
          const now = context.timestamp;
          // now - updated_at wraps around like U256 when the update is in the future.
          if (wrappingSub(now, updatedAt) > (state.max_age as bigint)) {
            return { revert: { error: 'StalePrice', args: { updated_at: updatedAt, now } } };
          }
          if (answer <= 0n) return { revert: { error: 'NegativePrice', args: { answer } } };
          return { returns: answer };
        },
      },
      {
        name: 'set_answer',
        abiName: 'setAnswer',
        view: false,
        contract: 'PriceFeed',
        params: [{ name: 'answer', type: 'int256' }],
        run: (state, args, _caller, context) => {
          const feed = mockState(state, 'PriceFeed');
          const round = (feed.round_id as bigint) + 1n;
          return {
            state: writeMockState(state, 'PriceFeed', { round_id: round, answer: args.answer, updated_at: context.timestamp }),
            events: [{ name: 'AnswerUpdated', args: { current: args.answer, roundId: round, updatedAt: context.timestamp }, contract: 'PriceFeed' }],
          };
        },
      },
      {
        name: 'set_updated_at',
        abiName: 'setUpdatedAt',
        view: false,
        contract: 'PriceFeed',
        params: [{ name: 'updated_at', type: 'uint256' }],
        run: (state, args) => ({ state: writeMockState(state, 'PriceFeed', { updated_at: args.updated_at }) }),
      },
      {
        name: 'latest_round_data',
        abiName: 'latestRoundData',
        view: true,
        contract: 'PriceFeed',
        params: [],
        returns: ['uint80', 'int256', 'uint256', 'uint256', 'uint80'],
        run: (state) => {
          const feed = mockState(state, 'PriceFeed') as { round_id: bigint; answer: bigint; updated_at: bigint };
          return { returns: [feed.round_id, feed.answer, feed.updated_at, feed.updated_at, feed.round_id] };
        },
      },
    ],
  },
  17: {
    contract: 'PriceFeed',
    note: 'It is deployed with Alice as the owner, as if the constructor received her address. The block time is a simplified clock: 12 seconds per sent transaction, while real Arbitrum blocks are much faster.',
    accounts: SIM_ACCOUNTS,
    clock: true,
    selectors: true,
    initialState: () => ({ owner: SIM_ACCOUNTS[0].address, round_id: 0n, answer: 0n, updated_at: 0n }),
    functions: [
      {
        name: 'decimals',
        abiName: 'decimals',
        view: true,
        params: [],
        returns: 'uint8',
        run: () => ({ returns: 8n }),
      },
      {
        name: 'description',
        abiName: 'description',
        view: true,
        params: [],
        returns: 'string',
        run: () => ({ returns: 'ETH / USD' }),
      },
      {
        name: 'latest_round',
        abiName: 'latestRoundData',
        view: true,
        params: [],
        returns: ['uint80', 'int256', 'uint256', 'uint256', 'uint80'],
        run: (state) => {
          const round = state.round_id as bigint;
          const updatedAt = state.updated_at as bigint;
          return { returns: [round, state.answer as bigint, updatedAt, updatedAt, round] };
        },
      },
      {
        name: 'set_answer',
        abiName: 'setAnswer',
        view: false,
        params: [{ name: 'answer', type: 'int256' }],
        run: (state, args, caller, context) => {
          if (caller.address.toLowerCase() !== (state.owner as string).toLowerCase()) {
            return { revert: { error: 'NotOwner', args: { caller: caller.address } } };
          }
          // U80 + 1 wraps around at 2^80, like the uint80 round id in Rust.
          const round = ((state.round_id as bigint) + 1n) & UINT80_MAX;
          return { state: { ...state, round_id: round, answer: args.answer, updated_at: context.timestamp } };
        },
      },
    ],
  },
  5: {
    contract: 'TokenVault',
    note: 'It is deployed with the mock Token as its token, which starts with 1,000 tokens for Alice. Approve TokenVault on the Token first, then deposit.',
    accounts: SIM_ACCOUNTS,
    mocks: [
      {
        name: 'Token',
        address: TOKEN_ADDRESS,
        note: 'It models an ERC-20 with the errors of OpenZeppelin. Its returns_false switch (1 for on) makes transfer and transferFrom return false without moving anything, like tokens that do not revert.',
      },
    ],
    initialState: () => ({
      token: TOKEN_ADDRESS,
      deposits: {},
      Token: { balances: { [SIM_ACCOUNTS[0].address]: 1000n }, allowances: {}, returns_false: 0n },
    }),
    functions: [
      {
        name: 'deposit_of',
        abiName: 'depositOf',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'deposits', args.account as string) }),
      },
      {
        name: 'deposit',
        abiName: 'deposit',
        view: false,
        params: [{ name: 'amount', type: 'uint256' }],
        run: (state, args, caller, context) => {
          const account = caller.address;
          const amount = args.amount as bigint;
          const pulled = tokenTransferFrom(state, context.self, account, context.self, amount);
          if ('revert' in pulled) return pulled;
          if (!pulled.ok) return { revert: { error: 'TransferFailed', args: { token: TOKEN_ADDRESS } } };
          const total = wrappingAdd(readMapping(pulled.state, 'deposits', account), amount);
          return {
            state: writeMapping(pulled.state, 'deposits', account, total),
            events: [...pulled.events, { name: 'Deposited', args: { account, amount } }],
          };
        },
      },
      {
        name: 'withdraw',
        abiName: 'withdraw',
        view: false,
        params: [{ name: 'amount', type: 'uint256' }],
        run: (state, args, caller, context) => {
          const account = caller.address;
          const amount = args.amount as bigint;
          const available = readMapping(state, 'deposits', account);
          if (available < amount) return { revert: { error: 'InsufficientDeposit', args: { available, requested: amount } } };
          // Checks, effects, interactions: the deposit is lowered before the token is called.
          const lowered = writeMapping(state, 'deposits', account, available - amount);
          const sent = tokenTransfer(lowered, context.self, account, amount);
          if ('revert' in sent) return sent;
          if (!sent.ok) return { revert: { error: 'TransferFailed', args: { token: TOKEN_ADDRESS } } };
          return { state: sent.state, events: [...sent.events, { name: 'Withdrawn', args: { account, amount } }] };
        },
      },
      {
        name: 'balance_of',
        abiName: 'balanceOf',
        view: true,
        contract: 'Token',
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(mockState(state, 'Token'), 'balances', args.account as string) }),
      },
      {
        name: 'approve',
        abiName: 'approve',
        view: false,
        contract: 'Token',
        params: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        returns: 'bool',
        run: (state, args, caller) => {
          const spender = args.spender as string;
          const value = args.value as bigint;
          const token = writeNestedMapping(mockState(state, 'Token'), 'allowances', caller.address, spender, value);
          return {
            state: writeMockState(state, 'Token', token),
            returns: true,
            events: [{ name: 'Approval', args: { owner: caller.address, spender, value }, contract: 'Token' }],
          };
        },
      },
      {
        name: 'allowance',
        abiName: 'allowance',
        view: true,
        contract: 'Token',
        params: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        returns: 'uint256',
        run: (state, args) => ({ returns: readNestedMapping(mockState(state, 'Token'), 'allowances', args.owner as string, args.spender as string) }),
      },
      {
        name: 'set_returns_false',
        abiName: 'setReturnsFalse',
        view: false,
        contract: 'Token',
        params: [{ name: 'enabled', type: 'uint256' }],
        run: (state, args) => ({ state: writeMockState(state, 'Token', { returns_false: (args.enabled as bigint) === 0n ? 0n : 1n }) }),
      },
    ],
  },
  18: {
    contract: 'InkBudget',
    note: 'The model runs at the default ink price, 10,000 ink per gas; a chain owner can change it. It converts and prices ink, but meters nothing.',
    accounts: SIM_ACCOUNTS,
    initialState: () => ({ ink_per_item: 0n }),
    functions: [
      {
        name: 'ink_price',
        abiName: 'inkPrice',
        view: true,
        params: [],
        returns: 'uint32',
        run: (_state, _args, _caller, context) => ({ returns: context.inkPrice }),
      },
      {
        name: 'to_gas',
        abiName: 'toGas',
        view: true,
        params: [{ name: 'ink', type: 'uint64' }],
        returns: 'uint64',
        run: (_state, args, _caller, context) => ({ returns: (args.ink as bigint) / context.inkPrice }),
      },
      {
        name: 'to_ink',
        abiName: 'toInk',
        view: true,
        params: [{ name: 'gas', type: 'uint64' }],
        returns: 'uint64',
        // gas_to_ink saturates at u64::MAX instead of wrapping around.
        run: (_state, args, _caller, context) => {
          const ink = (args.gas as bigint) * context.inkPrice;
          return { returns: ink > UINT64_MAX ? UINT64_MAX : ink };
        },
      },
      {
        name: 'ink_per_item',
        abiName: 'inkPerItem',
        view: true,
        params: [],
        returns: 'uint256',
        run: (state) => ({ returns: state.ink_per_item as bigint }),
      },
      {
        name: 'set_ink_per_item',
        abiName: 'setInkPerItem',
        view: false,
        params: [{ name: 'ink', type: 'uint256' }],
        run: (state, args) => ({ state: { ...state, ink_per_item: args.ink } }),
      },
      {
        name: 'gas_for',
        abiName: 'gasFor',
        view: true,
        params: [{ name: 'items', type: 'uint256' }],
        returns: 'uint256',
        run: (state, args, _caller, context) => {
          const items = args.items as bigint;
          const inkPerItem = state.ink_per_item as bigint;
          // checked_mul turns an overflow into BudgetOverflow instead of wrapping around.
          const ink = items * inkPerItem;
          if (ink > UINT256_MAX) return { revert: { error: 'BudgetOverflow', args: { items, ink_per_item: inkPerItem } } };
          return { returns: ink / context.inkPrice };
        },
      },
    ],
  },
  19: {
    contract: 'TimeLock',
    note: 'The model is deployed with a delay of 60 seconds, as if the constructor received 60. Send ETH with deposit using its value field. The block time is a simplified clock that moves 12 seconds per sent transaction; real Arbitrum blocks are much faster.',
    accounts: SIM_ACCOUNTS,
    clock: true,
    initialState: () => ({ delay: 60n, deposits: {}, unlock_at: {} }),
    functions: [
      {
        name: 'deposit',
        abiName: 'deposit',
        view: false,
        payable: true,
        params: [],
        run: (state, _args, caller, context) => {
          const unlockAt = wrappingAdd(context.timestamp, state.delay as bigint);
          const total = wrappingAdd(readMapping(state, 'deposits', caller.address), context.value);
          return {
            state: writeMapping(writeMapping(state, 'deposits', caller.address, total), 'unlock_at', caller.address, unlockAt),
            events: [{ name: 'Deposited', args: { account: caller.address, amount: context.value, unlock_at: unlockAt } }],
          };
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
        name: 'unlock_time',
        abiName: 'unlockTime',
        view: true,
        params: [{ name: 'account', type: 'address' }],
        returns: 'uint256',
        run: (state, args) => ({ returns: readMapping(state, 'unlock_at', args.account as string) }),
      },
      {
        name: 'withdraw',
        abiName: 'withdraw',
        view: false,
        params: [],
        run: (state, _args, caller, context) => {
          const amount = readMapping(state, 'deposits', caller.address);
          if (amount === 0n) return { revert: { error: 'NothingLocked', args: { account: caller.address } } };
          const unlockAt = readMapping(state, 'unlock_at', caller.address);
          if (context.timestamp < unlockAt) return { revert: { error: 'StillLocked', args: { unlock_at: unlockAt, now: context.timestamp } } };
          return { state: deleteMapping(state, 'deposits', caller.address), transfers: [{ to: caller.address, amount }] };
        },
      },
    ],
  },
};

/** The result of a call to lesson 5's mock token: a revert, or its state, its bool and its events. */
type TokenCall = { revert: { error: string; args: Record<string, SimValue> } } | { state: SimState; ok: boolean; events: SimEvent[] };

/**
 * A transfer of lesson 5's mock ERC-20, with the errors of OpenZeppelin: `from` sends `value` to
 * `to`. With `returns_false` set, it moves nothing and returns false, like tokens that do not revert.
 */
function tokenTransfer(state: SimState, from: string, to: string, value: bigint): TokenCall {
  const token = mockState(state, 'Token');
  if (token.returns_false === 1n) return { state, ok: false, events: [] };
  const balance = readMapping(token, 'balances', from);
  if (balance < value) return { revert: { error: 'ERC20InsufficientBalance', args: { sender: from, balance, needed: value } } };
  let next = writeMapping(token, 'balances', from, balance - value);
  next = writeMapping(next, 'balances', to, readMapping(next, 'balances', to) + value);
  return { state: writeMockState(state, 'Token', next), ok: true, events: [{ name: 'Transfer', args: { from, to, value }, contract: 'Token' }] };
}

/** `transfer_from` of lesson 5's mock token: spends the allowance of `spender` (never an unlimited one), then transfers. */
function tokenTransferFrom(state: SimState, spender: string, from: string, to: string, value: bigint): TokenCall {
  const token = mockState(state, 'Token');
  if (token.returns_false === 1n) return { state, ok: false, events: [] };
  const allowance = readNestedMapping(token, 'allowances', from, spender);
  if (allowance < value) return { revert: { error: 'ERC20InsufficientAllowance', args: { spender, allowance, needed: value } } };
  const spent = allowance === UINT256_MAX ? state : writeMockState(state, 'Token', writeNestedMapping(token, 'allowances', from, spender, allowance - value));
  return tokenTransfer(spent, from, to, value);
}

/** The largest `U80`, where lesson 17's round id wraps around. */
const UINT80_MAX = (1n << 80n) - 1n;

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

/** Lesson 14's owner_of: the owner of a token, or the NonexistentToken revert when nobody owns it. */
function ownerOf(state: SimState, tokenId: bigint): string | { revert: { error: string; args: { token_id: bigint } } } {
  const owner = readAddressMapping(state, 'owners', tokenId);
  return owner === ZERO_ADDRESS ? { revert: { error: 'NonexistentToken', args: { token_id: tokenId } } } : owner;
}

/**
 * ERC-165 ids of the interfaces of lesson 15's ForgeToken (the XOR of the selectors of each one):
 * IErc20, IErc20Metadata and IErc165 itself.
 */
const FORGE_TOKEN_INTERFACES = ['0x36372b07', '0xa219a025', '0x01ffc9a7'];

/**
 * The `_transfer` of openzeppelin-stylus 0.3.0, used by lesson 15: refuses the zero address on
 * either side, then moves the tokens. Balances cannot overflow, since they add up to the supply.
 */
function ozTransfer(state: SimState, from: string, to: string, value: bigint): SimOutcome {
  if (from.toLowerCase() === ZERO_ADDRESS) return { revert: { error: 'ERC20InvalidSender', args: { sender: ZERO_ADDRESS } } };
  if (to.toLowerCase() === ZERO_ADDRESS) return { revert: { error: 'ERC20InvalidReceiver', args: { receiver: ZERO_ADDRESS } } };
  const balance = readMapping(state, 'balances', from);
  if (balance < value) return { revert: { error: 'ERC20InsufficientBalance', args: { sender: from, balance, needed: value } } };
  let next = writeMapping(state, 'balances', from, balance - value);
  next = writeMapping(next, 'balances', to, readMapping(next, 'balances', to) + value);
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
