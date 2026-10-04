import { CertificatePreview } from '@/components/landing/CertificatePreview';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <CertificatePreview />
      <FinalCta />
    </main>
  );
}
