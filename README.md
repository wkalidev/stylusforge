# StylusForge

Interactive IDE to learn Arbitrum Stylus smart contracts in Rust.

> 🚧 Work in progress

## What is StylusForge?

The first interactive learning platform dedicated to Arbitrum Stylus — write, deploy and certify your Rust smart contracts directly in the browser.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 4
- Monaco Editor (VS Code in the browser)
- wagmi 2 + viem 2 + RainbowKit 2
- Hardhat 3 + OpenZeppelin Contracts 5 (Solidity 0.8.28)
- Arbitrum Sepolia (testnet)
- Soul-bound NFT certificates (ERC-1155)

## Repository layout

This is a pnpm workspace with a single lockfile (`pnpm-lock.yaml`) at the root.

```
stylusforge/
├─ apps/web/      Next.js app (lessons, editor, wallet)
├─ contracts/     Hardhat 3 project (StylusForgeNFT certificate contract)
├─ curriculum/    lessons.json (lesson ids, names, XP) and lesson rules
└─ docs/          Project documentation
```

Workspace packages are declared in `pnpm-workspace.yaml` (`apps/*` and `contracts`).

## Getting started

Requirements: Node.js 20 or later and pnpm 10 or later.

```bash
pnpm install   # installs every workspace package from the root
pnpm dev       # starts the web app on http://localhost:3000
```

Always install from the repository root: do not run `npm install` or `pnpm install` inside a package directory, and do not add other lockfiles.

## Local development

Run the whole stack on your machine: a local Hardhat chain, the certificate contract and the web app. Nothing touches a testnet and every key involved is a public Hardhat test key.

Use three terminals, all from the repository root:

```bash
pnpm chain          # 1. local Hardhat node on http://127.0.0.1:8545 (chain id 31337)
pnpm deploy:local   # 2. deploy StylusForgeNFT and write apps/web/.env.development.local
pnpm dev            # 3. web app on http://localhost:3000, connected to the local chain
```

`pnpm deploy:local`:

- deploys `StylusForgeNFT` from Hardhat account #0 and registers the lessons of `curriculum/lessons.json`;
- sets Hardhat account #1 as the claim signer;
- writes `apps/web/.env.development.local` with `NEXT_PUBLIC_CHAIN_ID=31337`, `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` and `CLAIM_SIGNER_PRIVATE_KEY`. It writes no other file and never touches `apps/web/.env.local`.

`next dev` loads `.env.development.local` on top of `.env.local`, so the app uses the local chain in development. `next build` / `next start` ignore it and use Arbitrum Sepolia.

The local node keeps its state in memory: after restarting `pnpm chain`, run `pnpm deploy:local` again, then restart `pnpm dev`.

### MetaMask

1. **Add the local network**: MetaMask → network selector → *Add a custom network*:

   | Field | Value |
   |---|---|
   | Network name | `Hardhat Local` |
   | Default RPC URL | `http://127.0.0.1:8545` |
   | Chain ID | `31337` |
   | Currency symbol | `ETH` |

2. **Import a test account**: account selector → *Add account or hardware wallet* → *Import account*, and paste the private key of Hardhat account #2 (10,000 test ETH on the local chain):

   ```
   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   ```

   Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`. Accounts #0 (deployer) and #1 (claim signer) are used by the scripts; any other account printed by `pnpm chain` works as a student too.

3. **After restarting the node**, MetaMask still remembers the old nonces: *Settings → Advanced → Clear activity tab data* before sending a new transaction.

> These keys are public and shared by every Hardhat install. Never send real funds to them and never use them on a live network.

## Root scripts

| Script | Runs |
|---|---|
| `pnpm dev` | `next dev` in `apps/web` |
| `pnpm build` | `next build` in `apps/web` |
| `pnpm lint` | `eslint .` in `apps/web` |
| `pnpm test` | `hardhat test` in `contracts`, then `vitest run` in `apps/web` |
| `pnpm chain` | `hardhat node` in `contracts`: local chain on port 8545 |
| `pnpm deploy:local` | Deploys to the local node and writes `apps/web/.env.development.local` |

## License

MIT
