'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { buttonClasses } from '@/components/ui/button';

/**
 * RainbowKit's wallet flows behind forge-styled, compact buttons: a heat button to connect, a
 * clear prompt on the wrong network and a steel account button once connected.
 */
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openConnectModal, openChainModal, openAccountModal }) => {
        if (!mounted) {
          return <span aria-hidden='true' className='h-9 w-20 sm:w-32' />;
        }
        if (!account || !chain) {
          return (
            <button type='button' data-testid='connect-wallet' onClick={openConnectModal} className={buttonClasses('heat', 'md', 'h-9 px-3')}>
              Connect<span className='hidden sm:inline'>&nbsp;wallet</span>
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button type='button' onClick={openChainModal} className={buttonClasses('steel', 'md', 'h-9 px-3 text-molten-300')}>
              Wrong network
            </button>
          );
        }
        return (
          <button
            type='button'
            data-testid='account-button'
            onClick={openAccountModal}
            className={buttonClasses('steel', 'md', 'h-9 px-3 font-mono text-xs sm:text-sm')}
          >
            <span aria-hidden='true' className='h-2 w-2 rounded-full bg-quench-500 shadow-[0_0_8px_var(--color-quench-500)]' />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
