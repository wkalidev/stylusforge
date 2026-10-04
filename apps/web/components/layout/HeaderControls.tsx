'use client';

import { XpMeter } from '@/components/progress/XpMeter';
import { SoundToggle } from './SoundToggle';
import { WalletButton } from './WalletButton';

/** The player's controls on the right of the header. */
export function HeaderControls() {
  return (
    <>
      <XpMeter />
      <SoundToggle />
      <WalletButton />
    </>
  );
}
