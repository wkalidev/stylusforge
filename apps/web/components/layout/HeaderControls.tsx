'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { XpMeter } from '@/components/progress/XpMeter';

/** The player's controls on the right of the header. */
export function HeaderControls() {
  return (
    <>
      <XpMeter />
      <ConnectButton
        label='Connect'
        showBalance={false}
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
        chainStatus={{ smallScreen: 'none', largeScreen: 'icon' }}
      />
    </>
  );
}
