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
| `exercise.explanation` | Markdown (GitHub-flavoured: tables and fenced code blocks are supported; a `> ` line renders as a note; links open in a new tab) |
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

Content targets the current `stylus-sdk` (0.10): `sol_storage!` with Solidity field syntax, `#[entrypoint]` and `#[public]`, events emitted with `self.vm().log(...)`, errors declared in `sol!` and wrapped in an enum deriving `SolidityError`, and `self.vm().msg_sender()` for the caller. Module 2 adds the message and block context (`tx_origin`, `block_timestamp`, `block_number`, `msg_value`, `contract_address`, `balance`), `#[constructor]`, `#[payable]`, `transfer_eth` from `stylus_sdk::call::transfer`, and pure methods (no `self`). Module 3 adds nested mapping handles (`getter(owner).get(spender)`, `setter(owner).insert(spender, value)`), `uint256` mapping keys, `Address::ZERO` and `is_zero()`, and `U256::MAX`. Module 4 adds `sol_interface!` with static calls (`Call::new()`) and writing calls (`Call::new_mutating(self)`, built before `self.vm()` is borrowed), `I256` and `int256`, `U80`, and `#[selector(name = ...)]`. Module 5 adds the metering methods (`tx_ink_price()`, `ink_to_gas`, `gas_to_ink`), unit tests on the test VM of `stylus_sdk::testing` (`TestVM`, `Contract::from(&vm)`, its setters, `get_emitted_logs()`), `RawCall` with `flush_storage_cache()`, and `u64::try_from` and the ruint conversions of `U256`. Storage collections use the `StorageMap` and `StorageVec` accessors: `get`, `insert`, `setter(key).set`, `delete` on mappings; `len`, `push`, `get`, `getter`, `setter`, `pop` and `grow` on vectors.

Reference solutions, starters and the code in explanations compile with `cargo check` against the latest `stylus-sdk` (0.10.10 for every lesson but 15), in a crate that also depends on `alloy-primitives` and `alloy-sol-types`, as Stylus projects do. CI checks it on every pull request (see [Checking the lesson Rust](#checking-the-lesson-rust)). From module 2 on, the ABI exported with `export-abi` gives the `abiName` of each simulated function.

Lesson 15 is the exception: `openzeppelin-stylus` 0.3.0, its latest release, pins `stylus-sdk =0.9.0` and `alloy-primitives`/`alloy-sol-types` `=0.8.20`, which cannot share a crate with stylus-sdk 0.10.10. It is checked in a separate crate (`curriculum/rust/openzeppelin`) with those four exact versions and `ruint` held at 1.14.0, the version in the lockfile of openzeppelin-stylus 0.3.0 (later `ruint` releases fail to build stylus-sdk 0.9.0). Check it with `--features export-abi` or for `wasm32-unknown-unknown`: on the host without `export-abi`, openzeppelin-stylus 0.3.0 expects the stylus-sdk test VM and does not compile. The 0.10.10 crate of the other lessons is unaffected. Its `export-abi` leaves out the methods of `#[implements]` traits, so the `abiName`s of lesson 15 follow the snake_case to camelCase rule of `#[public]`. Moving lesson 15 to stylus-sdk 0.10 is tracked in [#123](https://github.com/wkalidev/stylusforge/issues/123).

### Module 1: Foundations

| Lesson | Contract | Teaches |
|---|---|---|
| 1 Hello World Stylus | `HelloWorld` | Contract anatomy, `string` storage |
| 2 Storage and State | `Counter` | `uint256` storage, `get` and `set` |
| 6 Mappings | `Scoreboard` | `mapping(K => V)`: zero by default, `get`, `insert`, `delete`, nested mappings with `getter` and `setter` |
| 7 Storage vectors | `PriceLog` | `T[]`: `len`, `push`, `get` returning an `Option`, reverting with `ok_or`, `pop` |
| 8 Nested structs | `TodoList` | Storage structs as fields, mapping values and vector elements; `grow`, `getter` and `setter` handles, and how they borrow the contract |

### Module 2: Contract logic

| Lesson | Contract | Teaches |
|---|---|---|
| 9 msg context | `Attendance` | `msg_sender` and `tx_origin` (never for authorization), `block_timestamp`, `block_number` (an estimate of the L1 block number on Arbitrum), `chain_id`, `contract_address`; `u64` to `U256`; `address` storage |
| 3 Events and Errors | `Token` | `sol!` events and errors, `SolidityError`, reverting with `Err`, emitting with `vm().log` |
| 10 Access control | `FeeConfig` | `#[constructor]` taking the owner as a parameter (`msg_sender` there is StylusDeployer), a guard in a plain `impl` block (every method of a `#[public]` block is exported), `?` |
| 11 Payable and sending ETH | `PiggyBank` | `#[payable]` and `msg_value`, the contract balance, `transfer_eth` returning `Result<(), Vec<u8>>` and `.into()` for custom errors, checks-effects-interactions next to the default reentrancy guard |
| 12 View/pure and gas | `FeeQuote` | State mutability from the receiver (pure, view, write, payable), `checked_mul` with `ok_or`, reading storage once, ink and gas |

Lesson 3 comes before lesson 10 because it teaches the custom errors that access control reverts with. Module 2 lessons declare their errors in the starter when the lesson is about something else, so the starter compiles.

### Module 3: Tokens

| Lesson | Contract | Teaches |
|---|---|---|
| 4 ERC-20 Token | `Erc20` | The ERC-20 interface, supply and balances, `transfer` with `InsufficientBalance` and `Transfer` |
| 13 Allowances | `Erc20` | `approve`, `allowance` and `transfer_from`; nested mappings through `getter` and `setter` handles; `InsufficientAllowance`; the unlimited `U256::MAX` allowance; the approve race |
| 14 ERC-721 | `Erc721` | `mapping(uint256 => address)`, `Address::ZERO` for a token that does not exist, `owner_of` reverting, per-token approvals, the checks of `transfer_from` (zero receiver, owner, authorization) and its effects (approval cleared, balances, owner, `Transfer`); an open `mint`, for the exercise only |
| 15 OpenZeppelin for Stylus | `ForgeToken` | `openzeppelin-stylus` 0.3.0 on stylus-sdk 0.9.0: `#[storage]` components, `#[implements]` routing, forwarding trait impls, a constructor calling `Erc20Metadata::constructor` and `_mint`, ERC-165, and the API differences a student meets in 0.9 (`log(self.vm(), event)`, `self.vm().transfer_eth`, `export-abi`) |

Lesson 13 continues the token of lesson 4: its starter moves tokens with a `move_tokens` helper in a plain `impl` block, shared by `transfer` and `transfer_from`. Lesson 14 leaves out operators and safe transfers, which call the receiver: calls between contracts are module 4.

### Module 4: Interoperability

| Lesson | Contract | Teaches |
|---|---|---|
| 16 Calling Solidity | `PriceConsumer` | `sol_interface!` with a Chainlink `AggregatorV3Interface` subset, static calls with `Call::new()`, destructuring `latestRoundData`, `I256`, call errors passed on with `?`; refusing stale (`updatedAt` against a maximum age) and non-positive answers. The explanation covers decimals, heartbeats, incomplete rounds and the L2 Sequencer Uptime Feed with its grace period, as Chainlink documents them |
| 17 Being called (export-abi) | `PriceFeed` | `cargo stylus export-abi`, selectors, `#[selector(name = ...)]` (renaming the method is accepted too), Solidity to Rust types (`u8`, `U80`, `I256`), `int256` and `uint80` storage, `view` and `STATICCALL`, an owner-only update |
| 5 DeFi Interaction | `TokenVault` | Writing calls with `Call::new_mutating(self)` (E0502 when written inline next to `self.vm()`), `transfer_from` after an approval, checking the returned `bool`, checks-effects-interactions next to the deprecated reentrancy guard; fee-on-transfer tokens (balance before and after) and tokens that return no value (SafeERC20) |

Lesson 17 implements the interface that lesson 16 calls. Its selector objective uses `literals`, so the name inside `#[selector(name = "...")]` must be exactly `latestRoundData`. Every listed lesson is available since lesson 5: tests that need an unavailable lesson mark lesson 5 unavailable with `apps/web/test/unavailableLesson.ts`.

### Module 5: Stylus specifics

| Lesson | Contract | Teaches |
|---|---|---|
| 18 WASM, ink and gas | `InkBudget` | Ink and gas and the ink price (10,000 ink per gas by default, set by the chain owner), `tx_ink_price()`, `ink_to_gas` and `gas_to_ink`, what costs ink (published instruction and host call prices, storage at EVM prices with the cache, memory pages), measuring with `evm_ink_left()`, the size limits (24 KB compressed, 128 KB uncompressed) and the release profile of the Arbitrum docs, panics (no revert data, and room in the binary) against `sol!` errors, activation through ArbWasm, its 365-day expiry and keepalive, and caching with the cache manager |
| 19 Testing in Rust | `TimeLock` | Unit tests on the test VM: the `stylus-test` feature as a dev-dependency, `#[cfg(test)]`, `TestVM::default()` and `from(&vm)`, calling the constructor, `set_sender`, `set_value` and `set_block_timestamp`, asserting encoded errors and `get_emitted_logs()` with `SIGNATURE_HASH`; what the test VM does not do (no revert of writes, `#[payable]` not enforced, no ETH moves, unmocked calls succeed, nothing metered) |
| 20 Security pitfalls | `Treasury` | An audit with five planted bugs, each refused with `noneOf` until it is gone: a public `init` instead of `#[constructor]`, `tx_origin` for authorization, a wrapping subtraction (`checked_sub` required), the balance written after the ETH leaves, and a `RawCall` that does not flush the storage cache; also conversions of `U256`, the deprecated reentrancy guard, and loops that grow with the users |
| 21 Final project, mini vault | `MiniVault` | Shares minted in proportion to the assets held before the deposit (the balance minus `msg_value`), rounding down as ERC-4626 asks, a zero-share guard, an owner-only pause, burning before `transfer_eth`, and one TestVM test (`ok()`, as an enum deriving `SolidityError` has no `Debug`); the donation attack, why the zero-share guard is not enough, and the virtual shares and assets of OpenZeppelin's ERC-4626 |

Lesson 18 states the pause on new Stylus activations on Arbitrum One and Nova as a note dated October 8, 2026, which links the official notice; [#131](https://github.com/wkalidev/stylusforge/issues/131) tracks revisiting it. Lessons 19 and 21 are checked statically like the others: their checks read the test code, and the Rust lesson checks job runs the tests of their solutions, starters and harnesses. Lesson 20 teaches `checked_sub` as the fix of its subtraction, so a guard written next to a raw `-` fails that objective. The panel of lesson 21 sends ETH only through `deposit`, so its donation attack is reproduced by the simulation tests, not in the browser.

### Checking the lesson Rust

The **Rust lesson checks** job of CI compiles the Rust of every available lesson: its reference solution, its starter code and its explanation snippets.

| Path | Role |
|---|---|
| `curriculum/rust/stylus` | Check crate for every lesson but 15: `stylus-sdk =0.10.10`, alloy 1.7.3, and the same `stylus-sdk` with its `stylus-test` feature as a dev-dependency, for unit tests |
| `curriculum/rust/openzeppelin` | Check crate for lesson 15: `openzeppelin-stylus =0.3.0`, `stylus-sdk =0.9.0`, alloy 0.8.20, checked with `--features export-abi` |
| `curriculum/rust/rust-toolchain.toml` | The Rust toolchain of both crates |
| `curriculum/rust/snippets/lesson-<id>.rs` | A compiled harness per lesson holding the code of its explanation |
| `apps/web/scripts/export-rust.ts` | Writes each lesson's solution, starter and harness, sorted by crate |
| `curriculum/rust/check.sh` | Copies each written file to its crate's `src/lib.rs` and runs `cargo check --locked`, then `cargo test --locked` when the file contains `#[cfg(test)]` |

Both crates commit their `Cargo.lock`, so CI resolves the exact versions checked here (the `ruint` 1.14.0 pin lives in the lockfile of the openzeppelin crate). `apps/web/lib/curriculum/rust.ts` maps each lesson to its crate; lesson 15 moves to the stylus crate with #123.

Explanation snippets are fragments (a field, a few statements, an `impl` shortened with `// ...`), so they compile inside the lesson's harness: a contract that holds every line of every ```` ```rust ```` block of the explanation, in order, with whatever it needs around them. A unit test in `lessons.test.ts` fails when a block of an explanation is missing from its harness, so edit the harness with the explanation. Warnings are allowed (starters have unused parameters); an error or a failing test fails the job, which lists the failing files.

The test VM is a dev-dependency, so `cargo check --lib` still builds each contract as it is deployed, while `cargo test` builds it with the `stylus-test` feature: `#[entrypoint]` then generates no `user_entrypoint`, and every storage struct gets `from(&vm)`. The test VM brings `alloy-provider` and `tokio` into the lockfile of the stylus crate; the first run without the cache takes longer.

To run it locally from the repository root, with rustup installed (`rustup toolchain install` in `curriculum/rust` installs the pinned toolchain):

```sh
out="$(mktemp -d)"
pnpm --filter web export:rust "$out"
bash curriculum/rust/check.sh "$out"
```

## Simulations

After a pass, the lesson page offers "Try it": a JavaScript model of the lesson's contract (`apps/web/lib/curriculum/simulations.ts`, format in `simulation.ts`). It is labelled as a simulation and never runs the student's Rust.

A simulation has a `contract` name, an optional `note` on its starting state (for example a seeded balance), `accounts` (Alice, Bob, Carol), an `initialState()` and `functions`. Each function has its Rust `name`, its ABI `abiName`, `view` or not, typed `params` (`uint256`, `uint64`, `int256`, `address`, `string`, `bytes4`, `bool`), an optional `returns` (also `uint8`, `uint32` and, in tuples, `uint80`; an array such as `['string', 'bool']` for a tuple), `payable` when it accepts ETH, and a pure `run(state, args, caller, context)` that returns `{ state, returns, events, transfers }` or `{ revert: { error, args } }`. A `#[constructor]` has no simulated function: the model starts deployed, and its `note` says with what.

State fields are scalars (`bigint`, `string`, `boolean`), mappings (records keyed by lowercase address, or by decimal token id for `uint256` keys, read and written with `readMapping`, `readAddressMapping` (the zero address when unset), `writeMapping` and `deleteMapping`; nested mappings with `readNestedMapping` and `writeNestedMapping`), vectors (arrays) and structs (records keyed by field name).

The lesson's contract has the address `SIM_CONTRACT_ADDRESS` (`context.self`). A simulation can declare `mocks`: contracts it calls, such as a price feed or a token, modelled in JavaScript. A mock has a `name`, an `address` and a `note`; its storage is the record `state[name]` (`mockState`, `writeMockState`), and its functions carry `contract: name`. The panel shows mock functions and storage apart, labelled as mocks, and prefixes their calls and events with the mock's name. A function of the lesson's contract reads and writes a mock's record in the same transaction, so a revert undoes both. Accounts, the lesson's contract and the mocks are all named addresses (`namedAddresses`): arguments accept their names, and the panel shows them by name. With `selectors: true`, the panel shows the 4-byte selector of each function (`functionSelector`). The panel shows vectors by index, structs, tuples and inner mappings inline, and mapping keys as account names or numbers.

`context` holds what a call sees besides its arguments:

- `timestamp`: the block time. The panel keeps a simplified clock that starts at 2026-01-01 00:00:00 UTC and moves 12 seconds per sent transaction (`simTimestamp`); a simulation that reads it sets `clock: true` so the panel shows it, and says in its `note` that real Arbitrum blocks are much faster.
- `value`: the wei sent with the call. The panel adds a value field to payable functions; like the SDK, a function that is not payable reverts, with no error data, when it receives ETH.
- `inkPrice`: the ink price of the chain (`tx_ink_price()`), `SIM_INK_PRICE`: 10,000 ink per gas, the default.
- `balance`: the contract's ETH balance during the call, the value included. The engine adds the value and takes out the `transfers` a function returns (`transfer_eth`); a revert refunds the value, and a transfer above the balance fails the call. The panel shows the balance under the storage, as it is not storage.

With `directEth: true`, the panel can also send ETH to the contract without calling a method (`sendEthDirectly`), as the selected caller and as a transaction of its own. A plain transfer, with no calldata, reverts: no model has a receive function, like a Stylus contract without `#[receive]` or `#[fallback]`. The self-destruct of a contract that names it credits the balance without running any code or writing storage, the way lesson 21's donation attack forces ETH into its vault.

The engine parses arguments by type (uint256 within range, addresses by hex or account name), runs the function on a copy of the state, and leaves the state unchanged on a revert or an invalid argument. Model the same order of operations and the same arithmetic as the reference solution: `U256` `+` and `-` wrap around modulo 2^256 in Rust, so use `wrappingAdd` and `wrappingSub` (`*` wraps too), and revert only where the Rust code does (an explicit `Err`, or `checked_add` or `checked_mul` turned into an error). Tests require a simulation for every available lesson, with the same functions as its reference solution (every `fn` of its `#[public]` blocks, trait impls included, but no `#[constructor]`; mock functions are left out), and a scenario per lesson. `simulations.test.ts` also needs an overflow case for every lesson whose solution uses `+`, `-` or `*`, and fails if the simulation reverts or does not wrap like `U256`. A lesson that uses checked arithmetic instead has a test that the simulation reverts where Rust does (lesson 12).

## Glossary

`apps/web/lib/curriculum/glossary.ts` explains Stylus tokens on hover in the lesson editor: `sol_storage!`, `sol!`, `#[entrypoint]`, `#[public]`, the `no_main` `cfg_attr`, `extern crate alloc`, the prelude, `SolidityError`, `#[constructor]`, `#[payable]`, `self.vm()`, `msg_sender()`, `tx_origin()`, `msg_value()`, `vm().balance`, `contract_address()`, `transfer_eth`, `evm_gas_left()` and `evm_ink_left()`, checked arithmetic, `block_timestamp()`, `block_number()`, `vm().log`, `get_string`, `set_str`, `setter`, `mapping`, `insert`, `delete`, `getter`, `T[]`, `push`, `pop`, `len`, `grow`, `uint256`, an `address` storage field, `U256`, `U256::MAX`, `Address`, `Address::ZERO`, `is_zero()`, `#[storage]`, `#[implements(...)]`, `sol_interface!`, the `Call` configurations, `I256`, `int256`, `#[selector(...)]`, `U80`, `uint80`, `tx_ink_price()`, `ink_to_gas()` and `gas_to_ink()`, `unwrap()` and `expect()` (panics), `RawCall`, `flush_storage_cache()` and `clear_storage_cache()`, `unsafe`, `#[cfg(test)]`, `#[test]`, `TestVM`, the test VM setters, `get_emitted_logs()`, `mock_call()` and `SIGNATURE_HASH`.

Each entry has an `id`, a `pattern` (a regular expression without the `g` or `y` flag; the whole match is the hovered range), a `title` and a Markdown `description` written for stylus-sdk 0.10. Tokens in comments and strings get no tooltip. Tests check that every key token of the starter code has an entry; add one when a lesson introduces new syntax.

## Validation rules

Checks are static: the code is not compiled. `apps/web/lib/curriculum/validate.ts` runs them in the browser for instant feedback and again on the server before a certificate voucher is signed.

A check has:

| Field | Description |
|---|---|
| `anyOf` | Snippets; the check passes when the code contains any of them. A snippet may use a placeholder such as `$x` for a local variable (see the matching rules). |
| `alsoAnyOf` | Optional groups of snippets for further parts of the same goal: the check also needs one snippet of every group. Use it to merge steps of one idea (grow a vector, then set the new element's title) instead of writing one check per line. |
| `given` | Optional groups of snippets that name a value the check uses, usually code that an earlier check asks for: the check also needs one snippet of every group. Use it with a placeholder so a later step accepts a local of any name, but only the right one: `given: [['let $c = self.vm().msg_sender();']]` with `anyOf: ['if $c != self.owner.get() {']`. A wrong earlier step then also fails the steps that use its value. Hints need not repeat these snippets. |
| `literals` | Optional groups of snippets whose string literals must be spelled exactly, such as `#[selector(name = "latestRoundData")] pub fn $n(`: the check also needs one snippet of every group. Use it only where a string literal is the goal (a selector name), never as a shortcut for code. A check has `anyOf`, `literals` or both. |
| `noneOf` | Optional forbidden snippets: the check fails while the code contains any of them, matched like the others. Use it when a fix could be written next to a bug that stays (a `#[constructor]` added beside a public `init`), and forbid the planted bug itself. |
| `objective` | The goal in plain words, never the expected code: "Increment the count by 1", not "write `self.count.set(...)`". Plain text, no backticks. |
| `hints` | Two or more hints, revealed one at a time, from a nudge to the exact code. Only the last one gives the expected code. Inline code goes between backticks. |
| `anchor` | A snippet locating the line the check is about (a struct, a function signature, the `sol!` block). |

When a check fails, the editor underlines its anchor line and shows the objective, plus the hints revealed so far, on hover. Matching works on the code with comments and string contents blanked in place, so positions and lines are preserved.

### Writing objectives and hints

- The objective says what to achieve; the hints say how, one level at a time: first the idea (where the code goes, what to read or write), then the API or type to use, then the exact line.
- The `### Your task` step follows the same rule: it describes the goals and names what the checks need (field and function names), but never shows the expected code. The explanation steps before it teach the syntax with other examples.
- Failing objectives, not hints, are what `/api/claim` and `/api/solution` return for code that does not pass.

Matching rules:

- whitespace does not matter, except that two identifiers must stay separated (`uint256 count;` matches `uint256   count ;` but not `uint256count;`);
- a snippet never matches in the middle of an identifier (`uint256 count;` does not match `uint256 counter;`);
- newlines count as whitespace, so a method chain split across lines (`self` / `.tasks` / `.getter(id)`, rustfmt style) matches the one-line snippet;
- a placeholder, `$` followed by a name such as `$x`, stands for a local variable: it matches any Rust identifier except a keyword (`let`, `mut`, `self`, `Self`, `fn`, `return`, `match`…), and every occurrence of the same placeholder in a snippet matches the same identifier. `let $x = self.scores.get(player); self.scores.insert(player, $x + points)` accepts the variable under any name, but only when the value inserted is the one read; `let mut $x = …` is supported;
- a placeholder also binds across the `given`, `anyOf` and `alsoAnyOf` groups of a check: every group that uses `$x` must match with the same identifier, so a step can require the local that an earlier step reads (`given`), and two parts of one goal the same local (`let $r = self.rate_bps.get();` then `Self::fee(first, $r)?` and `Self::fee(second, $r)?`). Give independent locals different placeholders. Each `literals` and `noneOf` snippet binds its own placeholders, and placeholders never bind across checks;
- a snippet matches one contiguous piece of code: a snippet with several statements only matches when they are consecutive, with nothing in between. Write one alternative per common shape (a local holding the value, a `let mut` updated in place) rather than relying on statements in between;
- comments (`//`, nested `/* */`) and the contents of string literals, raw strings included, are removed first, so a snippet written in a comment or a string does not count, and a forbidden snippet left in one does not fail the check;
- `literals` snippets are the exception: they match the code with comments removed but strings kept. A match counts only where each literal of the snippet is a whole string literal of the code and the rest of the match is code, so the snippet written in a comment, or pasted inside another string, still does not count. Literal contents match exactly, whitespace included; the tokens around them follow the rules above, so rustfmt layouts still match.

Every lesson must satisfy, and `apps/web/lib/curriculum/lessons.test.ts` enforces:

1. each check has an anchor found in the starter code;
2. each check fails on the starter code (no check is passed for free);
3. the reference solution passes every check;
4. the solution still passes when reformatted;
5. the solution pasted in comments or a raw string fails;
6. no objective and no `### Your task` step contains any expected snippet of a check, and objectives contain no backticks;
7. each check has at least two non-empty hints, and only the last one contains the expected code: every part of it for a check with `alsoAnyOf` or `literals`, none of it in the hints before;
8. no placeholder appears in anything shown to students: titles, previews, explanations, starter code, quizzes, objectives and hints. Placeholders only belong in `anyOf`, `alsoAnyOf`, `given`, `literals`, `noneOf` and `anchor`; hints show the code with real names;
9. a check with `noneOf` finds one of its forbidden snippets in the starter code: it forbids a bug that the starter plants.
