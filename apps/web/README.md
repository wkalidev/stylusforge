# StylusForge web app

Next.js app for StylusForge: lesson pages with a Monaco code editor, exercise checks and wallet connection on Arbitrum Sepolia.

## Stack

- Next.js 16 (App Router, Turbopack) and React 19
- TypeScript and Tailwind CSS 4
- `@monaco-editor/react` for the in-browser editor
- wagmi 2, viem 2, RainbowKit 2 and TanStack Query 5
- ESLint 9 with `eslint-config-next` (flat config)

## Structure

```
apps/web/
├─ app/
│  ├─ layout.tsx            root layout, wraps the app in the wallet providers
│  ├─ page.tsx              landing page with the curriculum preview
│  └─ learn/
│     ├─ page.tsx           curriculum list
│     └─ [slug]/page.tsx    lesson page
├─ components/
│  ├─ Lesson/LessonLayout.tsx   explanation, editor, hints and code check
│  └─ Wallet/Providers.tsx      Wagmi, TanStack Query and RainbowKit providers
├─ lib/
│  ├─ curriculum/lessons.ts     lesson content, starter code and checks
│  └─ wagmi.ts                  wagmi config (Arbitrum Sepolia)
└─ eslint.config.mjs
```

## Scripts

Run them from the repository root (`pnpm dev`, `pnpm build`, `pnpm lint`) or from this directory:

| Script | Command |
|---|---|
| `pnpm dev` | `next dev` |
| `pnpm build` | `next build` |
| `pnpm start` | `next start` |
| `pnpm lint` | `eslint .` |

Install dependencies from the repository root with `pnpm install`.

## Environment variables

Create `apps/web/.env.local`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_ID` | WalletConnect Cloud project ID used by RainbowKit. Falls back to `demo` when unset. |

## Exercise checks

Each lesson in `lib/curriculum/lessons.ts` defines a list of checks. "Check my code" runs them in the browser by looking for an expected snippet in the editor content and shows the hint of every check that fails. The code is not compiled.
