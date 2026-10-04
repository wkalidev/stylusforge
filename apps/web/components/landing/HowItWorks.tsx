import { TypingCode } from './TypingCode';

const SNIPPET = `sol_storage! {
    #[entrypoint]
    pub struct HelloWorld {
        string greeting;
    }
}

#[public]
impl HelloWorld {
    pub fn get_greeting(&self) -> String {
        self.greeting.get_string()
    }

    pub fn set_greeting(&mut self, greeting: String) {
        self.greeting.set_str(greeting);
    }
}`;

const STEPS = [
  {
    title: 'Write',
    body: 'Each lesson explains one Stylus idea and hands you starter code in a Rust editor, right in the browser.',
    tone: 'heat',
  },
  {
    title: 'Validate',
    body: 'Check your code as often as you like. Hints point at what is still missing, and your progress is saved as you go.',
    tone: 'heat',
  },
  {
    title: 'Claim on-chain',
    body: 'Connect a wallet and mint the lesson’s soul-bound certificate on Arbitrum. You pay the gas; it stays yours.',
    tone: 'quench',
  },
] as const;

export function HowItWorks() {
  return (
    <section id='how-it-works' aria-labelledby='how-it-works-heading' className='py-24'>
      <div className='forge-container grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16'>
        <TypingCode code={SNIPPET} filename='src/lib.rs' />
        <div>
          <h2 id='how-it-works-heading' className='font-display text-5xl font-extrabold leading-none sm:text-6xl'>
            From a first line of Rust to proof <span className='whitespace-nowrap'>on-chain</span>
          </h2>
          <ol className='mt-10 space-y-8'>
            {STEPS.map((step, index) => (
              <li key={step.title} className='grid grid-cols-[3rem_minmax(0,1fr)] gap-4'>
                <span
                  aria-hidden='true'
                  className={
                    'font-display text-5xl font-extrabold leading-none ' +
                    (step.tone === 'quench' ? 'text-quench-500' : 'text-molten-500')
                  }
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className={'font-display text-3xl font-bold ' + (step.tone === 'quench' ? 'text-quench-300' : 'text-steel-100')}>
                    {step.title}
                  </h3>
                  <p className='mt-1 max-w-md text-steel-300'>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
