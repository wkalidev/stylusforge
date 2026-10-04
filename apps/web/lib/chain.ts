import type { Chain } from "viem";
import { arbitrumSepolia, hardhat } from "wagmi/chains";

const SUPPORTED_CHAINS: Record<number, Chain> = {
  [hardhat.id]: hardhat,
  [arbitrumSepolia.id]: arbitrumSepolia,
};

/**
 * The chain the app talks to, selected by NEXT_PUBLIC_CHAIN_ID: 31337 for the local
 * Hardhat node (written by `pnpm deploy:local` for `next dev`), Arbitrum Sepolia otherwise.
 */
function resolveChain(): Chain {
  const configured = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (!configured) {
    return arbitrumSepolia;
  }
  const chain = SUPPORTED_CHAINS[Number(configured)];
  if (!chain) {
    throw new Error(
      `NEXT_PUBLIC_CHAIN_ID=${configured} is not supported (use ${hardhat.id} or ${arbitrumSepolia.id})`,
    );
  }
  return chain;
}

export const chain = resolveChain();
