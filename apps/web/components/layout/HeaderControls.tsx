'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

/** The player's controls on the right of the header. */
export function HeaderControls() {
  return (
    <ConnectButton
      label='Connect wallet'
      showBalance={false}
      accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
      chainStatus={{ smallScreen: 'none', largeScreen: 'icon' }}
    />
  );
}
