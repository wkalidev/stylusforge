import Link from 'next/link';
import { ForgeLogo } from '@/components/brand/ForgeMark';
import { NavLinks } from './NavLinks';

/** Height of the header, used by full-height pages (the lesson workspace). */
export const HEADER_HEIGHT = '3.5rem';

/** Shared header on every page: logo, navigation and, on the right, the player's controls. */
export function SiteHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className='sticky top-0 z-40 h-14 border-b border-steel-800 bg-steel-950/85 backdrop-blur-md'>
      <div className='forge-container flex h-full items-center justify-between gap-2 sm:gap-4'>
        <div className='flex items-center gap-1 sm:gap-6'>
          <Link href='/' aria-label='StylusForge home' className='rounded-[var(--radius-forge)]'>
            <ForgeLogo />
          </Link>
          <NavLinks />
        </div>
        {actions ? <div className='flex items-center gap-1.5 sm:gap-3'>{actions}</div> : null}
      </div>
    </header>
  );
}
