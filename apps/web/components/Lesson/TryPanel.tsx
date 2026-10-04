'use client';

import { useId, useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import {
  callSimulation,
  type LessonSimulation,
  type SimAccount,
  type SimCallResult,
  type SimFunction,
  type SimState,
  type SimValue,
} from '@/lib/curriculum/simulation';

interface LogEntry {
  id: number;
  caller: SimAccount;
  fn: SimFunction;
  args: Record<string, string>;
  result: SimCallResult;
}

function formatValue(value: SimValue | boolean | undefined, accounts: SimAccount[]): string {
  if (value === undefined) return '';
  if (typeof value === 'bigint') return value.toLocaleString('en-US');
  if (typeof value === 'boolean') return String(value);
  const account = accounts.find((candidate) => candidate.address.toLowerCase() === value.toLowerCase());
  if (account) return account.name;
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : JSON.stringify(value);
}

function formatArgs(record: Record<string, SimValue> | undefined, accounts: SimAccount[]): string {
  return Object.entries(record ?? {})
    .map(([name, value]) => `${name}: ${formatValue(value, accounts)}`)
    .join(', ');
}

function FunctionForm({ fn, onCall }: { fn: SimFunction; onCall: (args: Record<string, string>) => void }) {
  const id = useId();
  const [args, setArgs] = useState<Record<string, string>>({});
  return (
    <form
      className='rounded-[var(--radius-forge)] border border-steel-700 p-3'
      onSubmit={(event) => {
        event.preventDefault();
        onCall(args);
      }}
    >
      <p className='font-mono text-sm text-steel-100'>
        {fn.abiName}(
        <span className='text-steel-400'>{fn.params.map((param) => `${param.type} ${param.name}`).join(', ')}</span>)
        {fn.returns && <span className='text-quench-300'> → {fn.returns}</span>}
      </p>
      <div className='mt-2 flex flex-wrap items-end gap-2'>
        {fn.params.map((param) => (
          <label key={param.name} className='flex min-w-0 flex-1 flex-col gap-1 text-xs text-steel-400'>
            {param.name}
            <input
              id={`${id}-${param.name}`}
              value={args[param.name] ?? ''}
              onChange={(event) => setArgs({ ...args, [param.name]: event.target.value })}
              placeholder={param.type === 'address' ? 'Bob or 0x…' : param.type === 'uint256' ? '0' : 'text'}
              className='h-9 min-w-24 rounded-[var(--radius-forge)] border border-steel-700 bg-steel-950 px-2 font-mono text-sm text-steel-100'
            />
          </label>
        ))}
        <button type='submit' className={buttonClasses(fn.view ? 'steel' : 'heat', 'md', 'h-9')}>
          {fn.view ? 'Read' : 'Send'}
        </button>
      </div>
    </form>
  );
}

function StorageView({ state, accounts }: { state: SimState; accounts: SimAccount[] }) {
  return (
    <dl className='space-y-2 font-mono text-sm'>
      {Object.entries(state).map(([field, value]) =>
        typeof value === 'object' ? (
          <div key={field}>
            <dt className='text-steel-400'>{field}</dt>
            <dd className='pl-3'>
              {Object.keys(value).length === 0 ? (
                <span className='text-steel-600'>(empty)</span>
              ) : (
                Object.entries(value).map(([key, entry]) => (
                  <div key={key} className='text-steel-100'>
                    {formatValue(key, accounts)} → {formatValue(entry, accounts)}
                  </div>
                ))
              )}
            </dd>
          </div>
        ) : (
          <div key={field} className='flex gap-2'>
            <dt className='text-steel-400'>{field}</dt>
            <dd className='text-steel-100'>{value === '' ? <span className='text-steel-600'>(empty)</span> : formatValue(value, accounts)}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

/**
 * "Try it": a JavaScript model of the lesson's contract, available once the lesson is passed.
 * It shows what the contract does; it never runs the student's Rust.
 */
export function TryPanel({ simulation, passed }: { simulation: LessonSimulation | null; passed: boolean }) {
  const [state, setState] = useState<SimState | null>(() => simulation?.initialState() ?? null);
  const [callerIndex, setCallerIndex] = useState(0);
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
  const call = (fn: SimFunction, args: Record<string, string>) => {
    const result = callSimulation(simulation, state, fn.name, args, caller);
    setState(result.state);
    setLog((entries) => [{ id: (entries[0]?.id ?? 0) + 1, caller, fn, args, result }, ...entries].slice(0, 20));
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
            setLog([]);
          }}
          className='text-sm text-steel-400 underline-offset-4 hover:text-steel-100 hover:underline'
        >
          Reset the simulation
        </button>
      </div>

      <div className='space-y-2'>
        {simulation.functions.map((fn) => (
          <FunctionForm key={fn.name} fn={fn} onCall={(args) => call(fn, args)} />
        ))}
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <section aria-label='Storage' className='steel-surface p-3'>
          <p className='mb-2 text-sm font-semibold text-steel-100'>Storage</p>
          <StorageView state={state} accounts={simulation.accounts} />
        </section>
        <section aria-label='Calls' className='steel-surface p-3'>
          <p className='mb-2 text-sm font-semibold text-steel-100'>Calls</p>
          {log.length === 0 ? (
            <p className='text-sm text-steel-600'>No calls yet.</p>
          ) : (
            <ol aria-live='polite' className='space-y-2 font-mono text-xs'>
              {log.map((entry) => (
                <li key={entry.id} className='border-b border-steel-800 pb-2 last:border-0'>
                  <p className='text-steel-300'>
                    {entry.caller.name}: {entry.fn.abiName}({Object.values(entry.args).join(', ')})
                  </p>
                  {entry.result.ok ? (
                    <>
                      {entry.result.returns !== undefined && (
                        <p className='text-quench-300'>returned {formatValue(entry.result.returns, simulation.accounts)}</p>
                      )}
                      {entry.result.events.map((event, index) => (
                        <p key={index} className='text-amber-300'>
                          event {event.name}({formatArgs(event.args, simulation.accounts)})
                        </p>
                      ))}
                      {entry.result.returns === undefined && entry.result.events.length === 0 && <p className='text-steel-400'>ok</p>}
                    </>
                  ) : (
                    <p className='text-molten-300'>
                      reverted: {entry.result.error?.error}
                      {entry.result.error?.args ? `(${formatArgs(entry.result.error.args, simulation.accounts)})` : ''}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
