# StylusForge web app

Next.js app for StylusForge: lesson pages with a Monaco code editor, exercise checks and wallet connection on Arbitrum Sepolia or a local Hardhat chain.

## Stack

- Next.js 16 (App Router, Turbopack) and React 19
- TypeScript and Tailwind CSS 4
- `@monaco-editor/react` for the in-browser editor
- wagmi 2, viem 2, RainbowKit 2 and TanStack Query 5
- `react-markdown` and `remark-gfm` for lesson explanations
- ESLint 9 with `eslint-config-next` (flat config)
- Vitest for unit tests

## Structure

```
apps/web/
├─ app/
│  ├─ layout.tsx            root layout, wraps the app in the wallet providers
│  ├─ page.tsx              landing page with the curriculum preview
│  └─ learn/
│     ├─ page.tsx           curriculum list
│     └─ [slug]/page.tsx    lesson page (prerendered per available lesson, 404 otherwise)
├─ components/
│  ├─ Lesson/LessonLayout.tsx   explanation, editor, hints and code check
│  ├─ Lesson/LessonMarkdown.tsx markdown rendering of the explanation
│  └─ Wallet/Providers.tsx      Wagmi, TanStack Query and RainbowKit providers
├─ lib/
│  ├─ curriculum/lessons.ts     lesson list: curriculum/lessons.json + web content
│  ├─ curriculum/validate.ts    static checks shared by client and server
│  ├─ curriculum/solutions.ts   reference solutions (tests only)
│  ├─ chain.ts                  chain selection from NEXT_PUBLIC_CHAIN_ID
│  └─ wagmi.ts                  wagmi config for the selected chain
├─ eslint.config.mjs
└─ vitest.config.mts
```

## Scripts

Run them from the repository root (`pnpm dev`, `pnpm build`, `pnpm lint`) or from this directory:

| Script | Command |
|---|---|
| `pnpm dev` | `next dev` |
| `pnpm build` | `next build` |
| `pnpm start` | `next start` |
| `pnpm lint` | `eslint .` |
| `pnpm test` | `vitest run` (also run by the root `pnpm test`) |

Install dependencies from the repository root with `pnpm install`.

## Environment variables

Variable names are listed in [`.env.example`](.env.example). Two files hold the values, both gitignored:

- `.env.local`: your own values (WalletConnect project id, testnet settings). Create it yourself; no script reads or writes it.
- `.env.development.local`: written by `pnpm deploy:local` for the local Hardhat chain. `next dev` loads it on top of `.env.local`; `next build` and `next start` ignore it.

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_ID` | browser | WalletConnect Cloud project ID used by RainbowKit. Falls back to `demo` when unset. |
| `NEXT_PUBLIC_CHAIN_ID` | browser | `31337` for the local Hardhat node, `421614` for Arbitrum Sepolia (default when unset). Any other value fails at startup. |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | browser | Address of `StylusForgeNFT` on that chain |
| `CLAIM_SIGNER_PRIVATE_KEY` | server only | Key that signs claim vouchers. Never import it from a client component. |

See the [root README](../../README.md#local-development) to run the app against a local chain.

## Lessons and checks

Lesson ids, titles and XP come from [`curriculum/lessons.json`](../../curriculum/lessons.json); `lib/curriculum/lessons.ts` adds the slug, difficulty and exercise of each lesson and exports them as `LESSONS`, in curriculum order. The landing page, `/learn` and the lesson pages all read `LESSONS`.

"Check my code" runs `validateCode` from `lib/curriculum/validate.ts`: whitespace-insensitive snippet checks, with comments and string contents removed first. The code is not compiled. The format and the rules each lesson must satisfy are documented in the [curriculum README](../../curriculum/README.md#validation-rules).
