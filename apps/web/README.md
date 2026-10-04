# StylusForge web app

Next.js app for StylusForge: lesson pages with a Monaco code editor, exercise checks and wallet connection on Arbitrum Sepolia or a local Hardhat chain.

## Stack

- Next.js 16 (App Router, Turbopack) and React 19
- TypeScript and Tailwind CSS 4
- `@monaco-editor/react` for the in-browser editor
- wagmi 2, viem 2, RainbowKit 2 and TanStack Query 5
- three.js with `@react-three/fiber` and `@react-three/drei` for the landing hero
- `react-markdown` and `remark-gfm` for lesson explanations
- ESLint 9 with `eslint-config-next` (flat config)
- Vitest for unit tests

## Structure

```
apps/web/
├─ app/
│  ├─ layout.tsx            root layout, wraps the app in the wallet providers
│  ├─ page.tsx              landing page: hero, how it works, certificate preview, call to action
│  ├─ api/claim/route.ts    POST /api/claim: re-validates code, signs claim vouchers
│  ├─ api/metadata/[id]/    ERC-1155 metadata JSON (route.ts) and SVG image (image/route.ts)
│  ├─ profile/page.tsx      on-chain certificates and XP of the connected wallet
│  └─ learn/
│     ├─ page.tsx           skill tree of the lessons
│     └─ [slug]/page.tsx    lesson page (prerendered per available lesson, 404 otherwise)
├─ components/
│  ├─ brand/ForgeMark.tsx       StylusForge mark and logo
│  ├─ hero/                     3D hero: scene, ingot geometry, shaders, lazy loader, fallback
│  ├─ learn/SkillTree.tsx       lessons as connected nodes (completed, available, locked)
│  ├─ landing/                  landing sections: Hero, HowItWorks (TypingCode), CertificatePreview (TiltCard), FinalCta
│  ├─ claim/ClaimCertificate.tsx claim panel of a passed lesson
│  ├─ claim/UnclaimedPrompt.tsx bar listing passed lessons whose certificate is not claimed
│  ├─ profile/ProfileView.tsx   rank, XP and certificates read on-chain
│  ├─ layout/SiteHeader.tsx     shared header (logo, navigation, player controls slot)
│  ├─ layout/SiteFooter.tsx     footer: copyright, links, network badge
│  ├─ layout/HeaderControls.tsx XP meter, anvil sound toggle and wallet button in the header
│  ├─ layout/WalletButton.tsx   RainbowKit flows behind compact forge buttons
│  ├─ feedback/SparkBurst.tsx   spark burst on a passing check
│  ├─ progress/LessonXpBar.tsx  rank progress with the lesson's pending reward
│  ├─ progress/XpMeter.tsx      local rank, XP and progress to the next rank
│  ├─ ui/button.ts              button styles (heat, steel, quench)
│  ├─ Lesson/LessonLayout.tsx   resolves the lesson, or "Lesson not found"
│  ├─ Lesson/LessonWorkspace.tsx explanation, editor, checks, result bar, tabs below lg
│  ├─ Lesson/LessonIngot.tsx    heating ingot in the lesson header (lazy scene + fallback)
│  ├─ Lesson/forgeEditorTheme.ts Monaco theme matching the tokens
│  ├─ Lesson/LessonMarkdown.tsx markdown rendering of the explanation
│  └─ Wallet/Providers.tsx      Wagmi, TanStack Query and RainbowKit providers
├─ lib/
│  ├─ curriculum/lessons.ts     lesson list: curriculum/lessons.json + web content
│  ├─ curriculum/modules.ts     lessons grouped by module (curriculum/modules.json)
│  ├─ curriculum/validate.ts    static checks shared by client and server
│  ├─ curriculum/solutions.ts   reference solutions (tests only)
│  ├─ hooks/useMediaQuery.ts    media queries (reduced motion, constrained devices)
│  ├─ highlightRust.ts          small Rust tokenizer for code snippets
│  ├─ sound/                    synthesized anvil strike and the sound preference (muted by default)
│  ├─ progress/                 local progress: storage, passed lessons, saved code, ranks, skill tree states
│  ├─ useClaimedLessons.ts      on-chain claimed / unclaimed lessons of the connected wallet
│  ├─ chain.ts                  chain selection from NEXT_PUBLIC_CHAIN_ID
│  ├─ contract.ts               StylusForgeNFT ABI (checked against the artifact) and address
│  ├─ claim.ts                  EIP-712 voucher types and signing (shared)
│  ├─ claimErrors.ts            claim errors in plain words
│  ├─ certificate/              token id parsing, ERC-1155 metadata, SVG certificate
│  ├─ explorer.ts               block explorer links (none on the local chain)
│  ├─ site.ts                   footer facts: handles, links, first commit date
│  ├─ server/claimSigner.ts     server-only: loads CLAIM_SIGNER_PRIVATE_KEY
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

## Landing page

1. **Hero**: the headline "Forge your first Rust smart contract", the call to action and the 3D ingot (below).
2. **How it works**: a code panel types the lesson 1 solution once it scrolls into view (`TypingCode`, colored by `lib/highlightRust.ts`), next to the three steps Write, Validate and Claim on-chain. The claim step is in quench blue, the on-chain color.
3. **Certificate preview**: the real certificate SVG in a `TiltCard` that turns towards the pointer, with a moving glare.
4. **Call to action**: lesson count and total XP computed from the lessons data.

Motion respects `prefers-reduced-motion`: the snippet appears complete, the caret stops blinking and the certificate holds a fixed angle. The certificate also stays static without a fine pointer (touch screens). Screen readers get the full snippet at once.

## Landing hero

The landing page opens on a molten ingot rendered with three.js (`components/hero`). Everything is procedural, with no model files:

- **Geometry**: a rounded box whose upper half tapers to a smaller top face (`ingotGeometry.ts`).
- **Molten material** (`moltenMaterial.ts`): simplex-noise heat flowing under a dark crust, thin glowing cracks, a fresnel rim where the core shows through, and a slow pulse.
- **Heat halo** (`haloMaterial.ts`): an additive glow plane, used instead of a post-processing pass.
- **Sparks** (`sparks.ts`): GPU particles; each path is computed in the vertex shader from a seed and the time.

The ingot floats (drei `Float`), turns slowly and leans towards the pointer anywhere in the window.

Loading and performance:

- `HeroVisual` imports the scene with `next/dynamic` and `ssr: false`, so three.js is its own chunk and never part of the initial page scripts. A gradient ingot (`HeroFallback`) shows while it loads and when WebGL is unavailable.
- `prefers-reduced-motion`: a still ingot rendered on demand, without sparks.
- Phones and touch screens (`max-width: 768px` or `pointer: coarse`): 90 sparks instead of 320, pixel ratio capped at 1.25 instead of 1.75, no antialiasing.
- The frame loop stops while the hero is off-screen (IntersectionObserver).
- Measured at 60 fps (16.7 ms average, 16.9 ms p95 frame time) on an integrated AMD Radeon laptop GPU at 1440×900.

## Footer

Every page ends with the footer (`components/layout/SiteFooter.tsx`): "© <years> StylusForge", where the start year comes from the first commit (2026-09-27, stored in `lib/site.ts` because deployment builds use shallow clones) and the current year is computed at render time (build time for static pages), shown as a single year while they match; "Est. September 2026"; links to the source, wkalidev.com and the MIT license; a network badge (Arbitrum Sepolia or Local chain); and "Built with ♥ by wkalidev". Only handles are used, never real names.

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

The header shows the player's controls on every page: the XP meter, the anvil sound toggle and the wallet button (RainbowKit's modals behind compact forge-styled buttons).

Progress is local first, so the reward is immediate and needs no wallet:

- a passing check records the lesson in `localStorage` (`stylusforge:completed:v1`) and the lesson bar shows "Passed";
- the code of each lesson is saved on every change (`stylusforge:code:v1:<id>`) and restored when the lesson is reopened; "Reset code" brings back the starter code;
- the hints revealed for each lesson are saved too (`stylusforge:hints:v1:<id>`);
- the XP meter sums the XP of the passed lessons and shows the rank: Apprentice from 0 XP, Smith from 250, Master Forger from 600.

The store (`lib/progress/storage.ts`) is read through `useSyncExternalStore`: empty during server rendering and hydration (no mismatch), synced across tabs through the `storage` event, and kept in memory for the page when `localStorage` is blocked. On-chain XP and certificates are shown on the profile page.

## Claim flow

1. The student passes a lesson; a compact result bar appears under the editor ("Forged: +XP", the claim action and the next lesson), so the editor keeps its height.
2. Without a wallet it offers to connect one; on another network it offers to switch to the app's chain.
3. "Claim certificate" posts `{ address, lessonId, code }` to `/api/claim`. The route validates the input, runs the lesson checks again on the server, and signs an EIP-712 voucher `Claim(student, lessonId, deadline)` valid for 15 minutes with `CLAIM_SIGNER_PRIVATE_KEY`.
4. The panel simulates `claim(lessonId, deadline, signature)` (so contract errors are explained before the wallet opens), sends it with wagmi from the student's wallet, waits for the receipt and refreshes every on-chain read.
5. When `completed(student, lessonId)` is true the bar shows "Certificate owned", with an explorer link to the transaction (Arbiscan on Arbitrum Sepolia; the hash only on the local chain).

With a wallet connected, a bar under the header lists the lessons passed in this browser whose certificate the wallet does not own yet, so local and on-chain progress converge.

### `POST /api/claim`

| Status | Body | When |
|---|---|---|
| 200 | `{ lessonId, deadline, signature }` (uint256 as decimal strings) | Code passes; voucher signed |
| 400 | `{ error }` | Body is not JSON, invalid address, non-integer lesson id, code over 50,000 characters |
| 404 | `{ error }` | Unknown or unavailable lesson |
| 422 | `{ error, objectives }` | Code fails the lesson checks; `objectives` lists the unmet objectives, never the expected code |
| 503 | `{ error }` | Contract address or signer key not configured |

`CLAIM_SIGNER_PRIVATE_KEY` is only read in `lib/server/claimSigner.ts`, which imports `server-only`: importing it from a Client Component fails the build. The reference solutions (`lib/curriculum/solutions.ts`) are guarded the same way; vitest maps `server-only` to an empty module (`test/server-only.ts`). Its address must be the contract's `signer`; `pnpm deploy:local` sets both for the local chain.

## Profile and metadata

`/profile` shows what is on-chain for the connected wallet, not local progress: the claimed certificates (rendered with the certificate SVG) and the XP they carry (`getTotalXP`), with the rank that XP reaches. The header XP meter stays local, so both views can differ until every passed lesson is claimed.

The contract's metadata URI is `<app origin>/api/metadata/{id}` (`pnpm deploy:local` sets `http://localhost:3000/api/metadata/{id}`):

| Route | Returns |
|---|---|
| `GET /api/metadata/[id]` | ERC-1155 JSON: `name`, `description`, `image`, `external_url`, `attributes` (lesson, XP, difficulty, transferable) |
| `GET /api/metadata/[id]/image` | The SVG certificate (`image/svg+xml`) |

`[id]` is the decimal id or the 64-hex-digit form clients substitute for `{id}`. Unknown and unavailable lessons return 404. Both responses are cacheable for an hour. The SVG is standalone (no external resources) so wallets and marketplaces can display it.

## Lesson feedback

The lesson page keeps its split layout from `lg` up: explanation on the left, editor on the right. Below `lg` it becomes **Learn / Code** tabs (an ARIA tablist; arrow keys switch tabs), and the explanation ends with an "Open the editor" button.

- **Compare with reference**: after a pass, a read-only diff between the student's code and the reference solution replaces the editor until "Back to my code". The solution comes from `POST /api/solution` with `{ lessonId, code }`, which re-runs the checks and answers only for passing code (400 / 404 otherwise, 422 with the unmet `objectives`, never cached); solutions stay behind `server-only` and never reach the client bundle.
- **Try it**: after a pass, a JavaScript simulation of the lesson's contract (labelled as such) lets the student pick a caller, call functions and see returns, events, reverts and storage change. It is a third **Try** tab below `lg`; from `lg` the right column switches between **Code** and **Try it**, so the editor keeps its height. See the [curriculum README](../../curriculum/README.md#simulations).
- **Step by step**: the explanation is shown one step at a time with a segmented progress bar (each segment jumps to its step), previous / next (focus moves to the new step), optional "Quick check" quizzes between steps, and a "Show all steps" toggle. The last step opens the editor.
- **Heating ingot**: a small version of the landing ingot sits in the lesson header (`LessonIngot`). Its heat is the share of live objectives met: cold steel, then dull red, then molten, eased over about a second. It follows the hero's rules: lazy chunk (`ssr: false`), gradient fallback while loading and without WebGL, still with reduced motion, paused off-screen. The molten shader takes a `uHeat` uniform (1 for the hero).
- **Live objectives**: the lesson checks are listed as objectives and re-evaluated 300 ms after typing pauses: a card above the explanation from `lg`, a collapsible summary above the editor below `lg`. Met objectives light up from cold steel to molten, with a heat bar and a live count. They are guidance only; "Check my code" is the validation that records progress, and lists the objectives still missing when it fails.
- **Progressive hints**: each objective states a goal, never the code. A failing objective has a "Show a hint" button that reveals its hints one at a time, from a nudge to the exact code ("Next hint (2/3)"). Hints render inline code and disappear once the objective is met. The number of revealed hints is saved per lesson in `localStorage` (`stylusforge:hints:v1:<id>`, `lib/progress/hints.ts`), so both objectives views and the editor stay in sync.
- **Token tooltips**: hovering a Stylus token in the editor (`sol_storage!`, `#[public]`, `self.vm()`, ...) explains it, from the [glossary](../../curriculum/README.md#glossary).
- **Inline diagnostics**: each failing check underlines the line of its `anchor` (see the [curriculum README](../../curriculum/README.md#validation-rules)) with an amber squiggle; hovering shows the objective and the hints revealed so far.
- **Shortcut**: Ctrl+Enter (⌘ Enter on macOS) runs "Check my code" from the editor or anywhere on the page; inside the editor it replaces Monaco's own "insert line below". The button shows the shortcut and declares `aria-keyshortcuts`.

- **XP bar**: the top bar shows the lesson's reward and a bar with the rank progress plus a ghost segment for that reward. It says when passing the lesson promotes the student, then fills once the lesson is passed.
- **Spark burst**: a passing check throws sparks from the check button (Web Animations API, no re-render). There is no burst with `prefers-reduced-motion`.
- **Anvil sound**: an optional strike synthesized with the Web Audio API (`lib/sound/anvil.ts`, no audio file): a filtered noise impact plus five inharmonic, decaying partials. It is muted by default. The header toggle (`aria-pressed`) turns it on, plays one strike as a preview, and the choice is remembered in `localStorage`.
- After a pass, "Forged: +XP" links to the next lesson.

## Skill tree

`/learn` shows the curriculum as a path of connected nodes (`components/learn/SkillTree.tsx`), with states from `lib/progress/skillTree.ts`:

| State | When | Look |
|---|---|---|
| Completed | Passed in this browser | Molten knot, glowing path to the next node, "Passed" |
| Available | The first lesson, or the lesson right after a completed one | Amber ring (pulsing unless reduced motion), "Ready to start" |
| Locked | Anything else | Lock knot, dashed steel path, "Pass <previous lesson> to unlock" or "Coming soon" |

With a wallet connected, lessons whose certificate the wallet owns carry a quench-blue "Certificate on-chain" mark. Locked lessons that are written stay reachable by URL: the tree guides, it does not gate content.

## Lessons and checks

Lesson ids, titles and XP come from [`curriculum/lessons.json`](../../curriculum/lessons.json); `lib/curriculum/lessons.ts` adds the slug, difficulty and exercise of each lesson and exports them as `LESSONS`, in curriculum order. The landing page, `/learn` and the lesson pages all read `LESSONS`. `lib/curriculum/modules.ts` exports `MODULES`: the modules of [`curriculum/modules.json`](../../curriculum/modules.json), in order, each with its name, forge zone and lessons. The build fails if a lesson names an unknown module.

"Check my code" runs `validateCode` from `lib/curriculum/validate.ts`: whitespace-insensitive snippet checks, with comments and string contents removed first. The code is not compiled. The format and the rules each lesson must satisfy are documented in the [curriculum README](../../curriculum/README.md#validation-rules).
