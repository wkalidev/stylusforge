'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { buttonClasses } from '@/components/ui/button';
import { shortAddress } from '@/lib/address';

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
              <span>
                Connect<span className='hidden sm:inline'> wallet</span>
              </span>
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
            title={account.ensName ?? account.address}
            className={buttonClasses('steel', 'md', 'h-9 shrink-0 gap-1.5! whitespace-nowrap px-2! font-mono sm:gap-2! sm:px-3! text-xs sm:text-sm')}
          >
            <span aria-hidden='true' className='h-2 w-2 shrink-0 rounded-full bg-quench-500 shadow-[0_0_8px_var(--color-quench-500)]' />
            {account.ensName ? (
              <span className='max-w-24 truncate sm:max-w-40'>{account.ensName}</span>
            ) : (
              // "0xf39F…2266" from sm, "0xf3…66" on phones, so the header fits in 375 px.
              <span>
                <span className='sm:hidden'>{shortAddress(account.address, 2)}</span>
                <span className='hidden sm:inline'>{shortAddress(account.address, 4)}</span>
              </span>
            )}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
