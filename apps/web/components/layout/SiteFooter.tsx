import { hardhat } from 'wagmi/chains';
import { ForgeMark } from '@/components/brand/ForgeMark';
import { chain } from '@/lib/chain';
import {
  AUTHOR_GITHUB_URL,
  AUTHOR_HANDLE,
  AUTHOR_SITE_URL,
  FIRST_COMMIT_DATE,
  LICENSE_URL,
  REPOSITORY_URL,
  copyrightYears,
  establishedLabel,
} from '@/lib/site';

const LINK = 'text-steel-300 underline-offset-4 hover:text-steel-100 hover:underline';

/** Site footer. The year is computed when the page is rendered, which is build time for static pages. */
export function SiteFooter() {
  const years = copyrightYears(FIRST_COMMIT_DATE.getUTCFullYear(), new Date().getUTCFullYear());
  const network = chain.id === hardhat.id ? 'Local chain' : 'Arbitrum Sepolia';

  return (
    <footer className='border-t border-steel-800 bg-steel-950'>
      <div className='forge-container flex flex-col gap-6 py-8 text-sm md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-3'>
          <ForgeMark className='h-6 w-6' />
          <div>
            <p className='text-steel-100'>© {years} StylusForge</p>
            <p className='text-steel-400'>{establishedLabel(FIRST_COMMIT_DATE)}</p>
          </div>
        </div>

        <nav aria-label='Footer'>
          <ul className='flex flex-wrap gap-x-5 gap-y-2'>
            <li>
              <a href={REPOSITORY_URL} className={LINK}>
                Source on GitHub
              </a>
            </li>
            <li>
              <a href={AUTHOR_SITE_URL} className={LINK}>
                wkalidev.com
              </a>
            </li>
            <li>
              <a href={LICENSE_URL} className={LINK}>
                MIT license
              </a>
            </li>
          </ul>
        </nav>

        <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
          <span className='inline-flex items-center gap-2 rounded-full border border-quench-500/50 px-3 py-1 text-xs font-medium text-quench-300'>
            <span aria-hidden='true' className='h-1.5 w-1.5 rounded-full bg-quench-500 shadow-[0_0_6px_var(--color-quench-500)]' />
            <span className='sr-only'>Network: </span>
            {network}
          </span>
          <p className='text-steel-400'>
            Built with{' '}
            <span aria-hidden='true' className='text-molten-500'>
              ♥
            </span>
            <span className='sr-only'>love</span> by{' '}
            <a href={AUTHOR_GITHUB_URL} className={LINK}>
              {AUTHOR_HANDLE}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
