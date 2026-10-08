'use client';

import { useId, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import {
  callSimulation,
  formatSimKey,
  formatSimValue,
  functionSelector,
  holdsEth,
  namedAddresses,
  sendEthDirectly,
  simTimestamp,
  type LessonSimulation,
  type SimMock,
  type SimAccount,
  type SimCallResult,
  type SimDirectEth,
  type SimDirectEthResult,
  type SimFunction,
  type SimState,
  type SimType,
  type SimValue,
} from '@/lib/curriculum/simulation';

/** A sent transaction: a method call, or ETH sent to the contract without one. */
type LogEntry = {
  id: number;
  caller: SimAccount;
  /** Wei sent, as typed. */
  value: string;
} & (
  | { kind: 'call'; fn: SimFunction; args: Record<string, string>; result: SimCallResult }
  | { kind: 'direct'; how: SimDirectEth; result: SimDirectEthResult }
);

/** How each way of sending ETH without a method call reads in the panel and the log. */
const DIRECT_ETH: Record<SimDirectEth, { option: string; log: string }> = {
  transfer: { option: 'Plain transfer, no calldata', log: 'plain transfer' },
  selfdestruct: { option: 'Self-destruct of a contract', log: 'self-destruct' },
};

function formatArgs(record: Record<string, SimValue> | undefined, accounts: SimAccount[]): string {
  return Object.entries(record ?? {})
    .map(([name, value]) => `${name}: ${formatSimValue(value, accounts)}`)
    .join(', ');
}

/** An example value for each argument type. */
const PLACEHOLDERS: Record<SimType, string> = { address: 'Bob or 0x…', uint256: '0', uint64: '0', int256: '-1', string: 'text', bytes4: '0x01ffc9a7', bool: 'true or false' };

function FunctionForm({ fn, selector, onCall }: { fn: SimFunction; selector?: boolean; onCall: (args: Record<string, string>, value: string) => void }) {
  const id = useId();
  const [args, setArgs] = useState<Record<string, string>>({});
  const [value, setValue] = useState('');
  return (
    <form
      className='rounded-[var(--radius-forge)] border border-steel-700 p-3'
      onSubmit={(event) => {
        event.preventDefault();
        onCall(args, value);
      }}
    >
      <p className='font-mono text-sm text-steel-100'>
        {fn.payable && <span className='text-amber-300'>payable </span>}
        {fn.abiName}(
        <span className='text-steel-400'>{fn.params.map((param) => `${param.type} ${param.name}`).join(', ')}</span>)
        {fn.returns && (
          <span className='text-quench-300'> → {Array.isArray(fn.returns) ? `(${fn.returns.join(', ')})` : fn.returns}</span>
        )}
        {selector && <span className='ml-2 text-xs text-steel-400'>selector {functionSelector(fn)}</span>}
      </p>
      <div className='mt-2 flex flex-wrap items-end gap-2'>
        {fn.params.map((param) => (
          <label key={param.name} className='flex min-w-0 flex-1 flex-col gap-1 text-xs text-steel-400'>
            {param.name}
            <input
              id={`${id}-${param.name}`}
              value={args[param.name] ?? ''}
              onChange={(event) => setArgs({ ...args, [param.name]: event.target.value })}
              placeholder={PLACEHOLDERS[param.type]}
              className='h-9 min-w-24 rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 px-2 font-mono text-sm text-steel-100'
            />
          </label>
        ))}
        {fn.payable && (
          <label className='flex min-w-0 flex-1 flex-col gap-1 text-xs text-amber-300'>
            value (wei)
            <input
              id={`${id}-value`}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder='0'
              className='h-9 min-w-24 rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 px-2 font-mono text-sm text-steel-100'
            />
          </label>
        )}
        <button type='submit' className={buttonClasses(fn.view ? 'steel' : 'heat', 'md', 'h-9')}>
          {fn.view ? 'Read' : 'Send'}
        </button>
      </div>
    </form>
  );
}

/**
 * Sends ETH to the contract without calling a method, from the selected caller: a plain transfer,
 * or the self-destruct of a contract that names it, as in a donation attack.
 */
function DirectEthForm({ contract, onSend }: { contract: string; onSend: (how: SimDirectEth, value: string) => void }) {
  const id = useId();
  const [how, setHow] = useState<SimDirectEth>('transfer');
  const [value, setValue] = useState('');
  return (
    <form
      aria-label={`Send ETH to ${contract}`}
      className='rounded-[var(--radius-forge)] border border-steel-700 p-3'
      onSubmit={(event) => {
        event.preventDefault();
        onSend(how, value);
      }}
    >
      <p className='text-sm font-semibold text-steel-100'>Send ETH without a method call</p>
      <p className='mt-1 text-xs text-steel-400'>
        A plain transfer, with no calldata, reverts: {contract} has no receive function. A contract that self-destructs
        sends its whole balance to {contract} without running any of its code.
      </p>
      <div className='mt-2 flex flex-wrap items-end gap-2'>
        <label className='flex min-w-0 flex-1 flex-col gap-1 text-xs text-steel-400'>
          how
          <select
            id={`${id}-how`}
            value={how}
            onChange={(event) => setHow(event.target.value as SimDirectEth)}
            className='h-9 min-w-24 rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 px-2 text-sm text-steel-100'
          >
            {(Object.keys(DIRECT_ETH) as SimDirectEth[]).map((kind) => (
              <option key={kind} value={kind}>
                {DIRECT_ETH[kind].option}
              </option>
            ))}
          </select>
        </label>
        <label className='flex min-w-0 flex-1 flex-col gap-1 text-xs text-amber-300'>
          value (wei)
          <input
            id={`${id}-value`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder='0'
            className='h-9 min-w-24 rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 px-2 font-mono text-sm text-steel-100'
          />
        </label>
        <button type='submit' className={buttonClasses('heat', 'md', 'h-9')}>
          Send ETH
        </button>
      </div>
    </form>
  );
}

/** A Unix time as `1767225612 (2026-01-01 00:00:12 UTC)`. */
function formatTimestamp(seconds: bigint): string {
  const date = new Date(Number(seconds) * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  return `${seconds} (${date})`;
}

const EMPTY = <span className='text-steel-600'>(empty)</span>;

/** Storage fields: scalars inline, vectors by index, mappings by key. */
function StorageView({ state, accounts }: { state: SimState; accounts: SimAccount[] }) {
  return (
    <dl className='space-y-2 font-mono text-sm'>
      {Object.entries(state).map(([field, value]) =>
        Array.isArray(value) ? (
          <div key={field}>
            <dt className='text-steel-400'>{field}</dt>
            <dd className='pl-3'>
              {value.length === 0
                ? EMPTY
                : value.map((item, index) => (
                    <div key={index} className='text-steel-100'>
                      <span className='text-steel-400'>[{index}]</span> {formatSimValue(item, accounts)}
                    </div>
                  ))}
            </dd>
          </div>
        ) : typeof value === 'object' ? (
          <div key={field}>
            <dt className='text-steel-400'>{field}</dt>
            <dd className='pl-3'>
              {Object.keys(value).length === 0
                ? EMPTY
                : Object.entries(value).map(([key, entry]) => (
                    <div key={key} className='text-steel-100'>
                      {formatSimKey(key, accounts)} → {formatSimValue(entry, accounts)}
                    </div>
                  ))}
            </dd>
          </div>
        ) : (
          <div key={field} className='flex gap-2'>
            <dt className='text-steel-400'>{field}</dt>
            <dd className='text-steel-100'>{value === '' ? EMPTY : formatSimValue(value, accounts)}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

/** The functions of a mock contract, apart from the lesson's contract and labelled as a mock. */
function MockFunctions({ mock, accounts, contract, children }: { mock: SimMock; accounts: SimAccount[]; contract: string; children: React.ReactNode }) {
  return (
    <section aria-label={`Mock ${mock.name}`} className='space-y-2 rounded-[var(--radius-forge)] border border-dashed border-steel-700 p-3'>
      <div>
        <p className='text-sm font-semibold text-steel-100'>
          Mock {mock.name} <span className='font-mono text-xs font-normal text-steel-400'>at {formatSimValue(mock.address, accounts.filter((account) => account.address !== mock.address))}</span>
        </p>
        <p className='mt-1 text-xs text-steel-400'>
          A JavaScript stand-in for a contract that {contract} calls, not part of your code. {mock.note}
        </p>
      </div>
      {children}
    </section>
  );
}

/**
 * "Try it": a JavaScript model of the lesson's contract, available once the lesson is passed.
 * It shows what the contract does; it never runs the student's Rust.
 */
export function TryPanel({ simulation, passed }: { simulation: LessonSimulation | null; passed: boolean }) {
  const [state, setState] = useState<SimState | null>(() => simulation?.initialState() ?? null);
  const [callerIndex, setCallerIndex] = useState(0);
  const callerId = useId();
  // Transactions sent so far: each one runs in the next block of the simulated clock.
  const [sent, setSent] = useState(0);
  // The contract's ETH balance, in wei: not storage, so kept next to it.
  const [balance, setBalance] = useState(0n);
  const [log, setLog] = useState<LogEntry[]>([]);

  if (!simulation || !state) {
    return <p className='text-steel-400'>No simulation for this lesson yet.</p>;
  }
  if (!passed) {
    return (
      <div className='steel-surface p-5 text-steel-300'>
        <p className='font-display text-2xl font-bold text-steel-100'>Try it</p>
        <p className='mt-2'>Pass the lesson to try its contract: call its functions and watch the storage change.</p>
      </div>
    );
  }

  const caller = simulation.accounts[callerIndex];
  const named = namedAddresses(simulation);
  const mocks = simulation.mocks ?? [];
  const isMock = (field: string) => mocks.some((mock) => mock.name === field);
  const contractState = Object.fromEntries(Object.entries(state).filter(([field]) => !isMock(field)));
  const call = (fn: SimFunction, args: Record<string, string>, value: string) => {
    const block = fn.view ? sent : sent + 1;
    const result = callSimulation(simulation, state, fn.name, args, caller, { timestamp: simTimestamp(block), value, balance });
    setSent(block);
    setState(result.state);
    setBalance(result.balance);
    setLog((entries) => [{ id: (entries[0]?.id ?? 0) + 1, caller, value, kind: 'call' as const, fn, args, result }, ...entries].slice(0, 20));
  };
  const sendEth = (how: SimDirectEth, value: string) => {
    const result = sendEthDirectly(how, value, balance);
    setSent(sent + 1);
    setBalance(result.balance);
    setLog((entries) => [{ id: (entries[0]?.id ?? 0) + 1, caller, value, kind: 'direct' as const, how, result }, ...entries].slice(0, 20));
  };

  return (
    <div className='space-y-4'>
      <div className='steel-surface ember-edge p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='font-display text-2xl font-bold text-steel-100'>Try {simulation.contract}</p>
          <span className='rounded-full border border-amber-300/60 px-2.5 py-0.5 text-xs font-semibold text-amber-300'>Simulation</span>
        </div>
        <p className='mt-2 text-sm text-steel-300'>
          A JavaScript model of this lesson&apos;s contract, running in your browser. It does not compile or execute your
          Rust code. {simulation.note}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <label className='flex items-center gap-2 text-sm text-steel-300'>
          Call as
          <select
            id={callerId}
            value={callerIndex}
            onChange={(event) => setCallerIndex(Number(event.target.value))}
            className='h-9 rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 px-2 text-steel-100'
          >
            {simulation.accounts.map((account, index) => (
              <option key={account.address} value={index}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type='button'
          onClick={() => {
            setState(simulation.initialState());
            setSent(0);
            setBalance(0n);
            setLog([]);
          }}
          className='text-sm text-steel-400 underline-offset-4 hover:text-steel-100 hover:underline'
        >
          Reset the simulation
        </button>
        {simulation.clock && (
          <p className='w-full font-mono text-xs text-steel-400'>Simulated block time: {formatTimestamp(simTimestamp(sent))}</p>
        )}
      </div>

      <div className='space-y-2'>
        {simulation.functions
          .filter((fn) => !fn.contract)
          .map((fn) => (
            <FunctionForm key={fn.name} fn={fn} selector={simulation.selectors} onCall={(args, value) => call(fn, args, value)} />
          ))}
        {simulation.directEth && <DirectEthForm contract={simulation.contract} onSend={sendEth} />}
      </div>

      {mocks.map((mock) => (
        <MockFunctions key={mock.name} mock={mock} accounts={named} contract={simulation.contract}>
          {simulation.functions
            .filter((fn) => fn.contract === mock.name)
            .map((fn) => (
              <FunctionForm key={fn.name} fn={fn} selector={simulation.selectors} onCall={(args, value) => call(fn, args, value)} />
            ))}
        </MockFunctions>
      ))}

      <div className='grid gap-4 md:grid-cols-2'>
        <section aria-label='Storage' className='steel-surface p-3'>
          <p className='mb-2 text-sm font-semibold text-steel-100'>Storage</p>
          <StorageView state={contractState} accounts={named} />
          {holdsEth(simulation) && (
            <p className='mt-3 border-t border-steel-800 pt-2 font-mono text-sm text-steel-400'>
              ETH balance (not storage): <span className='text-amber-300'>{formatSimValue(balance, named)} wei</span>
            </p>
          )}
          {mocks.map((mock) => (
            <div key={mock.name} className='mt-3 border-t border-steel-800 pt-2'>
              <p className='mb-2 text-sm font-semibold text-steel-300'>Mock {mock.name} storage</p>
              <StorageView state={state[mock.name] as SimState} accounts={named} />
            </div>
          ))}
        </section>
        <section aria-label='Calls' className='steel-surface p-3'>
          <p className='mb-2 text-sm font-semibold text-steel-100'>Calls</p>
          {log.length === 0 ? (
            <p className='text-sm text-steel-600'>No calls yet.</p>
          ) : (
            <ol aria-live='polite' className='space-y-2 font-mono text-xs'>
              {log.map((entry) =>
                entry.kind === 'direct' ? (
                  <li key={entry.id} className='border-b border-steel-800 pb-2 last:border-0'>
                    <p className='text-steel-300'>
                      {entry.caller.name}: {DIRECT_ETH[entry.how].log} to {simulation.contract}
                      {entry.value.trim() !== '' && <span className='text-amber-300'> with {entry.value.trim()} wei</span>}
                    </p>
                    {entry.result.ok ? (
                      <p className='text-amber-300'>balance now {formatSimValue(entry.result.balance, named)} wei, no code ran</p>
                    ) : (
                      <p className='text-molten-300'>reverted: {entry.result.error?.error}</p>
                    )}
                  </li>
                ) : (
                  <li key={entry.id} className='border-b border-steel-800 pb-2 last:border-0'>
                    <p className='text-steel-300'>
                      {entry.caller.name}: {entry.fn.contract ? `${entry.fn.contract}.` : ''}
                      {entry.fn.abiName}({Object.values(entry.args).join(', ')})
                      {entry.value.trim() !== '' && <span className='text-amber-300'> with {entry.value.trim()} wei</span>}
                    </p>
                    {entry.result.ok ? (
                      <>
                        {entry.result.returns !== undefined && (
                          <p className='text-quench-300'>returned {formatSimValue(entry.result.returns, named)}</p>
                        )}
                        {entry.result.events.map((event, index) => (
                          <p key={index} className='text-amber-300'>
                            event {event.contract ? `${event.contract}.` : ''}
                            {event.name}({formatArgs(event.args, named)})
                          </p>
                        ))}
                        {entry.result.transfers.map((transfer, index) => (
                          <p key={index} className='text-amber-300'>
                            sent {formatSimValue(transfer.amount, named)} wei to {formatSimValue(transfer.to, named)}
                          </p>
                        ))}
                        {entry.result.returns === undefined && entry.result.events.length === 0 && entry.result.transfers.length === 0 && (
                          <p className='text-steel-400'>ok</p>
                        )}
                      </>
                    ) : (
                      <p className='text-molten-300'>
                        reverted: {entry.result.error?.error}
                        {entry.result.error?.args ? `(${formatArgs(entry.result.error.args, named)})` : ''}
                      </p>
                    )}
                  </li>
                ),
              )}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
