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
│  ├─ brand/ForgeMark.tsx       StylusForge mark and logo
│  ├─ layout/SiteHeader.tsx     shared header (logo, navigation, player controls slot)
│  ├─ layout/HeaderControls.tsx XP meter and wallet button in the header
│  ├─ progress/XpMeter.tsx      local rank, XP and progress to the next rank
│  ├─ ui/button.ts              button styles (heat, steel, quench)
│  ├─ Lesson/LessonLayout.tsx   explanation, editor, hints and code check
│  ├─ Lesson/forgeEditorTheme.ts Monaco theme matching the tokens
│  ├─ Lesson/LessonMarkdown.tsx markdown rendering of the explanation
│  └─ Wallet/Providers.tsx      Wagmi, TanStack Query and RainbowKit providers
├─ lib/
│  ├─ curriculum/lessons.ts     lesson list: curriculum/lessons.json + web content
│  ├─ curriculum/validate.ts    static checks shared by client and server
│  ├─ curriculum/solutions.ts   reference solutions (tests only)
│  ├─ progress/                 local progress: storage, passed lessons, saved code, ranks
│  ├─ chain.ts                  chain selection from NEXT_PUBLIC_CHAIN_ID
│  └─ wagmi.ts                  wagmi config for the selected chain
├─ eslint.config.mjs
└─ vitest.config.mts
```

## Design system

The forge identity: Rust as oxidized metal, learning as forging. Tokens live in `app/globals.css` (Tailwind 4 `@theme`), so every color is a utility such as `bg-steel-900` or `text-molten-500`.

| Family | Tokens | Meaning |
|---|---|---|
| Steel | `steel-950` … `steel-100` | Base surfaces and text: blackened steel with a cool cast |
| Heat | `molten-*`, `amber-*`, `ember-*` | Action and energy: primary buttons, progress, XP, local success |
| Quench | `quench-*` (Arbitrum blue `#28A0F0`) | Cooled and final: on-chain state, claimed certificates |

Keep the meaning: hot colors for what the student is doing, blue only for what is on-chain.

| Role | Face | Utility |
|---|---|---|
| Display (headings, numbers) | Big Shoulders, condensed display optical size | `font-display` |
| Text | Geist Sans | `font-sans` (default) |
| Code | Geist Mono | `font-mono` |

Font roles use `@theme inline` because `next/font` defines its variables on `<body>`, not on `:root`.

Utilities:

| Utility | Use |
|---|---|
| `forge-container` | Page width and gutters shared by the header and sections |
| `steel-surface` | Panel with a brushed sheen and a hairline border |
| `heat-glow` | Warm glow rising from the bottom edge (hero, highlights) |
| `ember-edge` | Hot top edge for the element in progress |
| `quench-edge` | Blue edge and glow for on-chain, finished items |

A fixed steel-grain overlay covers the page at 5% opacity and never intercepts input. Textures are static; motion is reserved for the hero and feedback moments, and respects `prefers-reduced-motion`. Buttons come from `buttonClasses(variant, size)` in `components/ui/button.ts` (`heat`, `steel`, `quench`). Focus is always visible as an amber outline.

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
| `NEXT_PUBLIC_WALLETCONNECT_ID` | browser | WalletConnect Cloud project ID used by RainbowKit. Required by production builds (`next build` fails without it); `next dev` falls back to the shared `demo` id with a warning. |
| `NEXT_PUBLIC_CHAIN_ID` | browser | `31337` for the local Hardhat node, `421614` for Arbitrum Sepolia (default when unset). Any other value fails at startup. |
| `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` | browser | Address of `StylusForgeNFT` on that chain |
| `CLAIM_SIGNER_PRIVATE_KEY` | server only | Key that signs claim vouchers. Never import it from a client component. |

See the [root README](../../README.md#local-development) to run the app against a local chain.

## Wallet and progress

The header shows the player's controls on every page: the XP meter and RainbowKit's connect button, themed with the forge palette (avatar only on small screens).

Progress is local first, so the reward is immediate and needs no wallet:

- a passing check records the lesson in `localStorage` (`stylusforge:completed:v1`) and the lesson bar shows "Passed";
- the code of each lesson is saved on every change (`stylusforge:code:v1:<id>`) and restored when the lesson is reopened; "Reset code" brings back the starter code;
- the XP meter sums the XP of the passed lessons and shows the rank: Apprentice from 0 XP, Smith from 250, Master Forger from 600.

The store (`lib/progress/storage.ts`) is read through `useSyncExternalStore`: empty during server rendering and hydration (no mismatch), synced across tabs through the `storage` event, and kept in memory for the page when `localStorage` is blocked. On-chain XP and certificates are shown on the profile page.

## Lessons and checks

Lesson ids, titles and XP come from [`curriculum/lessons.json`](../../curriculum/lessons.json); `lib/curriculum/lessons.ts` adds the slug, difficulty and exercise of each lesson and exports them as `LESSONS`, in curriculum order. The landing page, `/learn` and the lesson pages all read `LESSONS`.

"Check my code" runs `validateCode` from `lib/curriculum/validate.ts`: whitespace-insensitive snippet checks, with comments and string contents removed first. The code is not compiled. The format and the rules each lesson must satisfy are documented in the [curriculum README](../../curriculum/README.md#validation-rules).
