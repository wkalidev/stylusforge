# Curriculum

Lesson metadata for StylusForge, plus the rules every lesson exercise follows.

## lessons.json

[`lessons.json`](lessons.json) is the single source of truth for each lesson's identity, shared by the contracts and the web app:

```json
[
  { "id": 1, "name": "Hello World Stylus", "xp": 100, "available": true, "module": "foundations" },
  { "id": 5, "name": "DeFi Interaction", "xp": 400, "available": false, "module": "interoperability" }
]
```

| Field | Type | Rule |
|---|---|---|
| `id` | integer | Positive and unique. It is the ERC-1155 token id of the lesson certificate. |
| `name` | string | Non-empty. Registered on-chain with `addLesson` and shown as the lesson title. |
| `xp` | integer | Zero or more. XP awarded for the lesson. |
| `available` | boolean | `true` when the lesson is written. Unavailable lessons are shown as "Soon" and never registered on-chain. |
| `module` | string | Id of the lesson's module in `modules.json`. |

The order of the array is the curriculum order. Lessons are listed module by module, in the order of `modules.json`, so ids do not follow the curriculum order: existing ids never change and new lessons take the next free id.

## modules.json

[`modules.json`](modules.json) lists the modules, in curriculum order. Each module is shown as a zone of the forge, next to its name:

| `id` | `name` | `zone` |
|---|---|---|
| `foundations` | Foundations | The Hearth |
| `contract-logic` | Contract logic | The Anvil |
| `tokens` | Tokens | The Mint |
| `interoperability` | Interoperability | The Bellows |
| `stylus-specifics` | Stylus specifics | The Quench |

All three fields are non-empty strings and ids are unique. Modules are web-only: the contract knows nothing about them.

### Consumers

- `contracts/scripts/deploy.ts` and `contracts/scripts/deploy-local.ts` register every available lesson on `StylusForgeNFT`.
- `contracts/test/StylusForgeNFT.ts` registers the same lessons and derives its expectations from them.
- `apps/web/lib/curriculum/lessons.ts` builds the web lesson list (landing page, `/learn`, lesson pages) from it, and `apps/web/lib/curriculum/modules.ts` groups that list by module.

The contracts load the file through `contracts/scripts/lessons.ts`, which validates it and fails on a malformed entry, an unknown module or lessons that are not grouped by module. The web app fails to build if a lesson has no web content or if an available lesson has no exercise.

### Changing lessons

The deploy scripts register every available lesson. On a deployed contract a lesson cannot be renamed, repriced or removed, so never edit the name or XP of a registered lesson. To publish a new lesson after deployment, add its web content, set `"available": true` and run `pnpm register:lessons --network <name>` from the owner account: it registers the missing lessons and refuses to run if a registered lesson differs from this file ([contracts README](../contracts/README.md#registering-new-lessons)).

## Lesson content

The web-only content lives in `apps/web/lib/curriculum/lessons.ts`, keyed by lesson id:

| Field | Description |
|---|---|
| `slug` | URL segment of the lesson page (`/learn/<slug>`) |
| `difficulty` | `Beginner`, `Intermediate` or `Advanced` |
| `exercise.explanation` | Markdown (GitHub-flavoured: tables and fenced code blocks are supported) |
| `exercise.starterCode` | Rust code loaded in the editor |
| `exercise.checks` | Static checks, see below |

### Steps and quizzes

The lesson page shows the explanation one step at a time: the `## ` title and its introduction are the first step, then each `### ` section is a step titled by its heading (`apps/web/lib/curriculum/steps.ts`). End every explanation with a `### Your task` step, and keep step titles unique within a lesson.

`exercise.quizzes` adds optional questions between steps:

| Field | Description |
|---|---|
| `afterStep` | Title of the step the question follows (not `Your task`) |
| `question` | The question |
| `options` | Two or more distinct answers |
| `answer` | Index of the correct option (vary its position between questions) |
| `explanation` | Shown once answered, right or wrong |

Quizzes never block progress. Tests check that every lesson has titled steps ending with the task and well-formed quizzes attached to existing steps.

Each available lesson also has a reference solution in `apps/web/lib/curriculum/solutions.ts`. Solutions are only imported by tests, never by app code, so they do not reach the browser.

Content targets the current `stylus-sdk` (0.10): `sol_storage!` with Solidity field syntax, `#[entrypoint]` and `#[public]`, events emitted with `self.vm().log(...)`, errors declared in `sol!` and wrapped in an enum deriving `SolidityError`, and `self.vm().msg_sender()` for the caller.

## Simulations

After a pass, the lesson page offers "Try it": a JavaScript model of the lesson's contract (`apps/web/lib/curriculum/simulations.ts`, format in `simulation.ts`). It is labelled as a simulation and never runs the student's Rust.

A simulation has a `contract` name, an optional `note` on its starting state (for example a seeded balance), `accounts` (Alice, Bob, Carol), an `initialState()` and `functions`. Each function has its Rust `name`, its ABI `abiName`, `view` or not, typed `params` (`uint256`, `address`, `string`), an optional `returns`, and a pure `run(state, args, caller)` that returns `{ state, returns, events }` or `{ revert: { error, args } }`.

The engine parses arguments by type (uint256 within range, addresses by hex or account name), runs the function on a copy of the state, and leaves the state unchanged on a revert, an invalid argument or an arithmetic error (`checkedAdd` / `checkedSub`). Model the same order of operations as the reference solution. Tests require a simulation for every available lesson, with the same functions as its reference solution, and a scenario per lesson.

## Glossary

`apps/web/lib/curriculum/glossary.ts` explains Stylus tokens on hover in the lesson editor: `sol_storage!`, `sol!`, `#[entrypoint]`, `#[public]`, the `no_main` `cfg_attr`, `extern crate alloc`, the prelude, `SolidityError`, `self.vm()`, `msg_sender()`, `vm().log`, `get_string`, `set_str`, `setter`, `mapping`, `uint256`, `U256` and `Address`.

Each entry has an `id`, a `pattern` (a regular expression without the `g` or `y` flag; the whole match is the hovered range), a `title` and a Markdown `description` written for stylus-sdk 0.10. Tokens in comments and strings get no tooltip. Tests check that every key token of the starter code has an entry; add one when a lesson introduces new syntax.

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
