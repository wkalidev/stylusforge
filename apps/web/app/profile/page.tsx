import type { Metadata } from 'next';
import { ProfileView } from '@/components/profile/ProfileView';

export const metadata: Metadata = {
  title: 'Profile — StylusForge',
  description: 'Your soul-bound StylusForge certificates and the XP they carry, read on-chain.',
};

export default function ProfilePage() {
  return (
    <main className='forge-container py-16'>
      <h1 className='font-display text-5xl font-extrabold'>Profile</h1>
      <p className='mt-2 mb-10 text-steel-300'>Your certificates and XP, as recorded on-chain for the connected wallet.</p>
      <ProfileView />
    </main>
  );
}
