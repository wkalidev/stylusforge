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
├─ curriculum/    Curriculum notes
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

## Root scripts

| Script | Runs |
|---|---|
| `pnpm dev` | `next dev` in `apps/web` |
| `pnpm build` | `next build` in `apps/web` |
| `pnpm lint` | `eslint .` in `apps/web` |
| `pnpm test` | `hardhat test` in `contracts` (Solidity and Node.js tests) |

## License

MIT
