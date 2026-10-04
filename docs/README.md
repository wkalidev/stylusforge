# Docs

## Architecture overview

StylusForge is a pnpm workspace with three parts that share one source of truth for lessons.

```
curriculum/lessons.json ──► contracts/ (deploy and registration scripts, tests)   lesson ids, names, XP, availability, module
                        └─► apps/web/  (lessons, landing, tree)
curriculum/modules.json ──► apps/web/  (module and zone names; the contracts only validate them)
```

| Package | Role |
|---|---|
| `curriculum/` | `lessons.json`: lesson id (= certificate token id), name, XP, availability and module; `modules.json`: module and forge zone names |
| `contracts/` | `StylusForgeNFT`: soul-bound ERC-1155 certificates, lesson registry, EIP-712 claims (Hardhat 3) |
| `apps/web/` | Next.js app: lessons with a Monaco editor, static checks, local progress, claim flow, profile, metadata |

### From a lesson to a certificate

```
Browser                                   Next.js server                 Chain
───────                                   ──────────────                 ─────
1. edit code (saved in localStorage)
2. "Check my code": validate.ts
   → lesson passed (localStorage),
     XP and rank update at once
3. "Claim certificate" ───────────────►  POST /api/claim
   { address, lessonId, code }            re-runs validate.ts
                                          signs Claim(student, lessonId,
                                          deadline) with the signer key
                         ◄───────────────  { lessonId, deadline, signature }
4. simulate, then send
   claim(lessonId, deadline, signature) ──────────────────────────────►  StylusForgeNFT
   from the student's wallet (they pay gas)                              checks deadline,
                                                                         signer, lesson,
                                                                         not yet claimed;
                                                                         mints token id
5. /profile reads getTotalXP and getCompletedLessons ◄───────────────────
   wallets read uri(id) → GET /api/metadata/{id} (JSON) → /image (SVG)
```

### Trust boundaries

- **The browser is not trusted.** Its check verdict only drives local feedback; `/api/claim` runs the same checks again before signing.
- **The signer key is the authority.** `CLAIM_SIGNER_PRIVATE_KEY` lives only on the server (`lib/server/claimSigner.ts`, guarded by `server-only`). The contract accepts a claim only with a voucher signed by its current `signer` for that exact student, lesson and deadline. The owner can rotate the signer; there is no admin mint.
- **Certificates cannot move.** Transfers, burns and operator approvals revert with `SoulBound()`.
- **Checks are static.** Code is matched, not compiled: whitespace-insensitive snippets with comments and strings removed. Compiling submissions (`cargo stylus check`) is planned for a later version.

### Where state lives

| State | Where | Read by |
|---|---|---|
| Passed lessons, saved code, revealed hints, streak, last lesson, shown unlocks, sound preference | `localStorage` in the student's browser | header XP meter, skill tree, lesson page |
| Certificates and on-chain XP | `StylusForgeNFT` (`completed`, `getCompletedLessons`, `getTotalXP`) | claim panel, unclaimed prompt, skill tree mark, profile |
| Lesson metadata | `curriculum/lessons.json`, registered on-chain at deployment, later lessons with `pnpm register:lessons` | everything |

Local and on-chain progress can differ (a lesson passed but not claimed, or claimed from another browser). The unclaimed prompt under the header brings them back together.

### Networks

`NEXT_PUBLIC_CHAIN_ID` selects the chain: `31337` for the local Hardhat node (`pnpm chain` + `pnpm deploy:local`, see the root README), Arbitrum Sepolia otherwise.
