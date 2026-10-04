import { ProgressHero } from '@/components/learn/ProgressHero';
import { SkillTree } from '@/components/learn/SkillTree';

export default function LearnPage() {
  return (
    <main className='forge-container max-w-4xl py-16'>
      <h1 className='font-display text-5xl font-extrabold sm:text-6xl'>Lessons</h1>
      <p className='mt-2 mb-8 max-w-xl text-steel-300'>
        Each lesson builds on the one before. Pass a lesson to heat up the path and open the next one.
      </p>
      <ProgressHero />
      <SkillTree />
    </main>
  );
}
