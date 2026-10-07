import { certificateSvg } from '@/lib/certificate/svg';
import { chain } from '@/lib/chain';
import { LESSONS } from '@/lib/curriculum/lessons';
import { TiltCard } from './TiltCard';

export function CertificatePreview() {
  const lesson = LESSONS[0];
  return (
    <section aria-labelledby='certificate-heading' className='relative overflow-hidden py-24'>
      <div className='forge-container grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16'>
        <div>
          <h2 id='certificate-heading' className='font-display text-5xl font-extrabold leading-none sm:text-6xl'>
            A certificate only you can hold
          </h2>
          <p className='mt-6 max-w-lg text-lg text-steel-300'>
            Every lesson you finish becomes a token in your wallet on Arbitrum. It is soul-bound: it cannot be
            transferred or sold, so it shows that you wrote the code yourself.
          </p>
          <p className='mt-4 max-w-lg text-steel-400'>
            Your profile gathers your certificates and the XP they carry, read straight from the contract.
          </p>
        </div>
        <TiltCard label={`Certificate preview: ${lesson.title}, ${lesson.xp} XP`}>
          <div
            className='[&>svg]:h-auto [&>svg]:w-full'
            // certificateSvg escapes every lesson field it embeds.
            dangerouslySetInnerHTML={{ __html: certificateSvg(lesson, chain.name) }}
          />
        </TiltCard>
      </div>
    </section>
  );
}
