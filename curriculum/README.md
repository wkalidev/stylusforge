# Curriculum

Lesson metadata for StylusForge, plus the rules every lesson exercise follows.

## lessons.json

[`lessons.json`](lessons.json) is the single source of truth for each lesson's identity, shared by the contracts and the web app:

```json
[
  { "id": 1, "name": "Hello World Stylus", "xp": 100, "available": true },
  { "id": 5, "name": "DeFi Interaction", "xp": 500, "available": false }
]
```

| Field | Type | Rule |
|---|---|---|
| `id` | integer | Positive and unique. It is the ERC-1155 token id of the lesson certificate. |
| `name` | string | Non-empty. Registered on-chain with `addLesson` and shown as the lesson title. |
| `xp` | integer | Zero or more. XP awarded for the lesson. |
| `available` | boolean | `true` when the lesson is written. Unavailable lessons are shown as "Soon" and never registered on-chain. |

The order of the array is the curriculum order.

### Consumers

- `contracts/scripts/deploy.ts` and `contracts/scripts/deploy-local.ts` register every available lesson on `StylusForgeNFT`.
- `contracts/test/StylusForgeNFT.ts` registers the same lessons and derives its expectations from them.
- `apps/web/lib/curriculum/lessons.ts` builds the web lesson list (landing page, `/learn`, lesson pages) from it.

The contracts load the file through `contracts/scripts/lessons.ts`, which validates it and fails on a malformed entry. The web app fails to build if a lesson has no web content or if an available lesson has no exercise.

### Changing lessons

Lessons are registered once, at deployment. On a deployed contract a lesson cannot be renamed, repriced or removed, so editing an existing entry here does not change it on-chain. To publish a new lesson after deployment, add its web content, set `"available": true` and call `addLesson` with the same values from the owner account.

## Lesson content

The web-only content lives in `apps/web/lib/curriculum/lessons.ts`, keyed by lesson id:

| Field | Description |
|---|---|
| `slug` | URL segment of the lesson page (`/learn/<slug>`) |
| `difficulty` | `Beginner`, `Intermediate` or `Advanced` |
| `exercise.explanation` | Markdown (GitHub-flavoured: tables and fenced code blocks are supported) |
| `exercise.starterCode` | Rust code loaded in the editor |
| `exercise.checks` | Static checks, see below |

Each available lesson also has a reference solution in `apps/web/lib/curriculum/solutions.ts`. Solutions are only imported by tests, never by app code, so they do not reach the browser.

Content targets the current `stylus-sdk` (0.10): `sol_storage!` with Solidity field syntax, `#[entrypoint]` and `#[public]`, events emitted with `self.vm().log(...)`, errors declared in `sol!` and wrapped in an enum deriving `SolidityError`, and `self.vm().msg_sender()` for the caller.

## Validation rules

Checks are static: the code is not compiled. `apps/web/lib/curriculum/validate.ts` runs them in the browser for instant feedback and again on the server before a certificate voucher is signed.

A check is a list of snippets (`anyOf`), a hint and an `anchor`. It passes when the code contains any of its snippets. The anchor is a snippet locating the line the check is about (a struct, a function signature, the `sol!` block): when the check fails, the editor underlines that line and shows the hint on hover. Matching works on the code with comments and string contents blanked in place, so positions and lines are preserved.

Matching rules:

- whitespace does not matter, except that two identifiers must stay separated (`uint256 count;` matches `uint256   count ;` but not `uint256count;`);
- a snippet never matches in the middle of an identifier (`uint256 count;` does not match `uint256 counter;`);
- comments (`//`, nested `/* */`) and the contents of string literals, raw strings included, are removed first, so a snippet written in a comment or a string does not count.

Every lesson must satisfy, and `apps/web/lib/curriculum/lessons.test.ts` enforces:

1. each check has an anchor found in the starter code;
2. each check fails on the starter code (no check is passed for free);
3. the reference solution passes every check;
4. the solution still passes when reformatted;
5. the solution pasted in comments or a raw string fails.
