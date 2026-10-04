'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/learn', label: 'Lessons' },
  { href: '/profile', label: 'Profile' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label='Main' className='flex items-center gap-1'>
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              'rounded-[var(--radius-forge)] px-3 py-2 text-sm font-medium transition-colors ' +
              (active ? 'text-amber-300' : 'text-steel-300 hover:text-steel-100')
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
