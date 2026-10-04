import Link from 'next/link';
import { HeroVisual } from '@/components/hero/HeroVisual';
import { buttonClasses } from '@/components/ui/button';

export function Hero() {
  return (
    <section className='heat-glow relative overflow-hidden'>
      <div className='forge-container grid min-h-[calc(100dvh-3.5rem)] items-center gap-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-0'>
        <div className='order-2 lg:order-1'>
          <h1 className='font-display text-6xl font-extrabold leading-none text-steel-100 sm:text-7xl xl:text-8xl'>
            Forge your first Rust smart contract
          </h1>
          <p className='mt-6 max-w-xl text-lg text-steel-300'>
            Write Arbitrum Stylus contracts in the browser, check them line by line and claim a soul-bound certificate
            on-chain for every lesson you finish.
          </p>
          <Link href='/learn' className={buttonClasses('heat', 'lg', 'mt-10')}>
            Start the first lesson
          </Link>
        </div>
        <div className='order-1 h-64 sm:h-80 lg:order-2 lg:h-[min(36rem,70dvh)]'>
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
