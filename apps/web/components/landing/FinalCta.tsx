import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { LESSONS } from '@/lib/curriculum/lessons';

const AVAILABLE = LESSONS.filter((lesson) => lesson.available);
const TOTAL_XP = AVAILABLE.reduce((total, lesson) => total + lesson.xp, 0);
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function FinalCta() {
  const count = NUMBER_WORDS[AVAILABLE.length] ?? String(AVAILABLE.length);
  return (
    <section aria-labelledby='cta-heading' className='heat-glow ember-edge py-28'>
      <div className='forge-container text-center'>
        <h2 id='cta-heading' className='font-display text-6xl font-extrabold leading-none sm:text-7xl'>
          The forge is lit
        </h2>
        <p className='mx-auto mt-6 max-w-xl text-lg text-steel-300'>
          {count} lessons, {TOTAL_XP} XP and a certificate for each. Start with {AVAILABLE[0]?.title}: no setup, no
          wallet needed until you claim.
        </p>
        <Link href='/learn' className={buttonClasses('heat', 'lg', 'mt-10')}>
          Start the first lesson
        </Link>
      </div>
    </section>
  );
}
