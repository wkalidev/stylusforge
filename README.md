# StylusForge

[![CI](https://github.com/wkalidev/stylusforge/actions/workflows/ci.yml/badge.svg)](https://github.com/wkalidev/stylusforge/actions/workflows/ci.yml)

Learn Arbitrum Stylus smart contracts in Rust, in the browser, and earn a soul-bound certificate on-chain for every lesson you finish.

**Status:** MVP, live on Arbitrum Sepolia: <https://stylusforge-drab.vercel.app>. The full flow also runs on a local chain.

<!-- MARKEE -->

## What is StylusForge?

The first interactive learning platform dedicated to Arbitrum Stylus: write, check and certify your Rust smart contracts directly in the browser.

- **Lessons** on a path through five forge zones, with a progress hero (rank, next milestone, daily streak, continue button). Each lesson has an explanation, a Rust editor, goal-based objectives with progressive hints and instant, static checks.
- **Progress** saved in the browser: XP and seven ranks, from Apprentice to Forgemaster, update the moment a check passes, no wallet needed.
- **Certificates**: claim a soul-bound ERC-1155 certificate for each passed lesson. The server re-validates the code and signs a voucher; the student mints it and pays the gas.
- **Profile**: certificates and XP read on-chain, with ERC-1155 metadata and generated SVG certificates, plus every passed lesson still to claim, claimable in one click.
- **Forge identity**: blackened steel, molten heat and Arbitrum blue, with a procedural 3D ingot hero, spark bursts and an optional anvil sound.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 4
- Monaco Editor (VS Code in the browser)
- three.js + React Three Fiber + drei (landing hero)
- wagmi 2 + viem 2 + RainbowKit 2
- Vitest (web) and Hardhat's Node.js test runner (contracts)
- Hardhat 3 + OpenZeppelin Contracts 5 (Solidity 0.8.28)
- Arbitrum Sepolia (testnet), or a local Hardhat chain for development
- Soul-bound NFT certificates (ERC-1155)

## Architecture

```
curriculum/lessons.json ─► contracts/  StylusForgeNFT: soul-bound ERC-1155, lesson registry, EIP-712 claims
                        └► apps/web/   lessons, static checks, local progress, claim API, profile, metadata

student ── check code (browser) ── POST /api/claim (re-validates, signs voucher) ── claim() from the wallet ──► chain
```

- The browser's verdict is never trusted: `/api/claim` runs the checks again before signing.
- The signer key stays on the server (`server-only`); the contract only mints with a voucher from its current signer, and certificates cannot be transferred.
- Progress lives in the browser (instant XP and ranks); certificates and on-chain XP live in the contract.

Details, the full claim sequence and the trust boundaries: [docs/README.md](docs/README.md). Package docs: [apps/web](apps/web/README.md), [contracts](contracts/README.md), [curriculum](curriculum/README.md).

## Repository layout

This is a pnpm workspace with a single lockfile (`pnpm-lock.yaml`) at the root.

```
stylusforge/
├─ apps/web/      Next.js app (lessons, editor, wallet)
├─ contracts/     Hardhat 3 project (StylusForgeNFT certificate contract)
├─ curriculum/    lessons.json (lesson ids, names, XP, modules), modules.json and lesson rules
└─ docs/          Architecture overview
```

Workspace packages are declared in `pnpm-workspace.yaml` (`apps/*` and `contracts`).

## Getting started

Requirements: Node.js 20 or later and pnpm 10 or later.

```bash
pnpm install   # installs every workspace package from the root
pnpm dev       # starts the web app on http://localhost:3000
```

`pnpm build` needs `NEXT_PUBLIC_WALLETCONNECT_ID` in `apps/web/.env.local` (production builds refuse the shared demo id); see [`apps/web/.env.example`](apps/web/.env.example).

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
- sets Hardhat account #1 as the claim signer and points the metadata URI at `http://localhost:3000/api/metadata/{id}`;
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

## Environment variables

Names are listed in [`apps/web/.env.example`](apps/web/.env.example) and [`contracts/.env.example`](contracts/.env.example); values never go into git.

**Web app** (`apps/web/.env.local`, or the Vercel project):

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_ID` | browser | WalletConnect Cloud project id. Required by production builds. |
| `NEXT_PUBLIC_CHAIN_ID` | browser | `31337` for the local node, `421614` for Arbitrum Sepolia (default) |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | browser | `StylusForgeNFT` address on that chain |
| `CLAIM_SIGNER_PRIVATE_KEY` | server only | Key of the contract's claim `signer` |

For local development `pnpm deploy:local` writes the last three to `apps/web/.env.development.local`.

**Contracts** (Hardhat configuration variables: environment or encrypted keystore, never `.env`):

| Variable | Used by |
|---|---|
| `ARBITRUM_SEPOLIA_RPC_URL` | `arbitrumSepolia` network |
| `DEPLOYER_PRIVATE_KEY` | `arbitrumSepolia` network |
| `CLAIM_SIGNER_ADDRESS` | `scripts/deploy.ts` |
| `ETHERSCAN_API_KEY` | `hardhat verify` (Arbiscan) |
| `NFT_CONTRACT_ADDRESS`, `METADATA_BASE_URL` | `scripts/set-uri.ts` (`NFT_CONTRACT_ADDRESS` also for `scripts/register-lessons.ts`) |

## Root scripts

| Script | Runs |
|---|---|
| `pnpm dev` | `next dev` in `apps/web` |
| `pnpm build` | `next build` in `apps/web` |
| `pnpm lint` | `eslint .` in `apps/web` |
| `pnpm test` | `hardhat test` in `contracts`, then `vitest run` in `apps/web` |
| `pnpm chain` | `hardhat node` in `contracts`: local chain on port 8545 |
| `pnpm deploy:local` | Deploys to the local node and writes `apps/web/.env.development.local` |
| `pnpm register:lessons --network <name>` | Registers the available lessons missing on a deployed contract, from the owner account |

## Testnet contract

| Network | Address |
|---|---|
| Arbitrum Sepolia (421614) | [`0xf7f027a6af8d2f99a9b8f466983f4515522daa8d`](https://sepolia.arbiscan.io/address/0xf7f027a6af8d2f99a9b8f466983f4515522daa8d#code) (verified) |

Live app: <https://stylusforge-drab.vercel.app>

Deployment and verification steps: [contracts/README.md](contracts/README.md#deployment).

## Deployment (Vercel)

The web app is ready for Vercel; nothing is deployed yet. [`apps/web/vercel.json`](apps/web/vercel.json) holds the build settings.

1. Import the repository in Vercel and set **Root Directory** to `apps/web`. Keep **Include files outside the Root Directory** enabled: the app reads `curriculum/lessons.json`.
2. Set **Node.js version** to 22.x (Project Settings → Build and Deployment).
3. Define the environment variables below, then deploy.

`vercel.json` installs only the web package and its dependencies from the pnpm workspace (`pnpm install --frozen-lockfile --filter web...`, so Hardhat is not installed) and runs `pnpm build`. Changes under `curriculum/` are outside the workspace packages, so Vercel treats them as global and redeploys.

| Variable | Environments | Value |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_ID` | Production, Preview | WalletConnect Cloud project id (required: production builds fail without it) |
| `NEXT_PUBLIC_CHAIN_ID` | Production, Preview | `421614` (Arbitrum Sepolia; also the default when unset) |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | Production, Preview | Address of `StylusForgeNFT` on Arbitrum Sepolia, printed by `scripts/deploy.ts` |
| `CLAIM_SIGNER_PRIVATE_KEY` | Production (and Preview if previews may sign) | Private key of the contract's `signer`. Mark it **Sensitive**; it is only read by the server. |

Never set the local values written to `apps/web/.env.development.local` (chain 31337, Hardhat keys) on Vercel.

After the first deployment:

1. Point the token metadata at the deployed app from the owner account: `pnpm hardhat run scripts/set-uri.ts --network arbitrumSepolia` in `contracts/` ([contracts/README.md](contracts/README.md#metadata-uri)).
2. Verify the contract on Arbiscan ([contracts/README.md](contracts/README.md#verification-on-arbiscan)).

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request, on every push to `main` and on demand: `pnpm install --frozen-lockfile` on Node 22, then `pnpm lint`, `pnpm test` (contracts, then vitest) and `pnpm build`. The build uses a placeholder WalletConnect id unless the repository variable `NEXT_PUBLIC_WALLETCONNECT_ID` is set. A new push to a pull request cancels its running checks; runs on `main` are never cancelled, so every merge gets a result.

## Roadmap

**Done**

- Single pnpm workspace, Hardhat 3, the `StylusForgeNFT` contract (soul-bound ERC-1155, lesson registry, EIP-712 claims) with tests.
- Four lessons with static checks, local progress, XP and ranks, the claim flow, the profile, certificate metadata and the forge redesign.
- Module 1, Foundations: mappings, storage vectors and nested structs join the first two lessons (seven lessons in all).
- Local development stack, CI on pull requests and the Vercel configuration.
- Arbitrum Sepolia deployment: the verified contract and the web app on Vercel.

**Next**

- Lesson interactivity: live objectives, inline diagnostics in the editor, a "Try it" simulation of each contract, step-by-step explanations with quizzes, and a comparison with the reference solution once a lesson is passed.
- Curriculum expansion: modules 2 to 5 (contract logic, tokens, interoperability, Stylus specifics), registered on-chain with `addLesson` without redeploying.

**Later**

- Real Rust compilation. Checks are static today: the code is matched against expected snippets, not compiled. Running `cargo stylus check` on submissions is planned for a later version.

## License

[MIT](LICENSE)
