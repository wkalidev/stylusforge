import curriculum from '../../../../curriculum/lessons.json';
import modules from '../../../../curriculum/modules.json';
import type { LessonQuiz } from './steps';
import type { LessonCheck } from './validate';

export interface LessonExercise {
  /** Markdown; its `###` sections become the steps of the explanation (see steps.ts). */
  explanation: string;
  starterCode: string;
  checks: LessonCheck[];
  /** Optional questions shown between steps. */
  quizzes?: LessonQuiz[];
}

interface LessonBase {
  /** Lesson id, also the ERC-1155 token id of its certificate. */
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  xp: number;
  /** Id of the module (curriculum/modules.json) the lesson belongs to. */
  module: string;
}

/** Available lessons have an exercise; unavailable ones are listed as coming soon. */
export type Lesson = LessonBase &
  ({ available: true; exercise: LessonExercise } | { available: false; exercise?: undefined });

interface LessonContent {
  slug: string;
  difficulty: string;
  exercise?: LessonExercise;
}

/** Web-only lesson content, keyed by lesson id. Ids, names and XP live in curriculum/lessons.json. */
const CONTENT: Record<number, LessonContent> = {
  1: {
    slug: 'hello-world',
    difficulty: 'Beginner',
    exercise: {
      explanation: [
        '## Hello World with Arbitrum Stylus',
        '',
        'Stylus lets you write smart contracts in Rust. They compile to WebAssembly and run on Arbitrum next to Solidity contracts, with the same storage model and ABI.',
        '',
        '### Anatomy of a Stylus contract',
        '',
        '1. `sol_storage!` declares the storage with Solidity syntax: `type name;` per field.',
        '2. `#[entrypoint]` marks the struct that receives the calls.',
        '3. A `#[public]` impl block exposes its methods in the contract ABI.',
        '',
        '```rust',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Profile {',
        '        string name;',
        '    }',
        '}',
        '```',
        '',
        'Each field gets a typed storage accessor. A `string` field is a `StorageString`:',
        '',
        '- `self.name.get_string()` reads it as a `String`;',
        '- `self.name.set_str(value)` writes it.',
        '',
        '### Your task',
        '',
        '1. Give the contract a storage field called `greeting` that holds text.',
        '2. Make `get_greeting` return the stored greeting.',
        '3. Make `set_greeting` store the text it receives.',
        '',
        'Stuck? Each objective has hints, from a nudge to the exact code.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]',
        'extern crate alloc;',
        '',
        'use alloc::string::String;',
        'use stylus_sdk::prelude::*;',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct HelloWorld {',
        '        // TODO: add a string field called greeting',
        '    }',
        '}',
        '',
        '#[public]',
        'impl HelloWorld {',
        '    pub fn get_greeting(&self) -> String {',
        '        // TODO: return the stored greeting',
        '        String::new()',
        '    }',
        '',
        '    pub fn set_greeting(&mut self, greeting: String) {',
        '        // TODO: store the greeting',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        {
          anyOf: ['string greeting;'],
          hint: 'Declare the field in sol_storage! with Solidity syntax: string greeting;',
          objective: 'Store a greeting text in the contract storage',
          hints: [
            'Storage fields are declared inside `sol_storage!`, in the `HelloWorld` struct, with Solidity syntax: the type, then the name.',
            'The Solidity type for text is `string` and the field is called `greeting`. End the declaration with a semicolon.',
            'Add `string greeting;` inside `pub struct HelloWorld { ... }`.',
          ],
          anchor: 'pub struct HelloWorld {',
        },
        {
          anyOf: ['self.greeting.get_string()'],
          hint: 'Return self.greeting.get_string() from get_greeting',
          objective: 'Return the stored greeting from get_greeting',
          hints: [
            'A `string` field is a `StorageString` accessor: you read it with a method instead of using it as a plain value.',
            '`StorageString` has a method that returns its contents as a Rust `String`: `get_string()`.',
            'Replace `String::new()` with `self.greeting.get_string()`.',
          ],
          anchor: 'pub fn get_greeting(',
        },
        {
          anyOf: ['self.greeting.set_str(greeting)', 'self.greeting.set_str(&greeting)'],
          hint: 'Store the argument with self.greeting.set_str(greeting) in set_greeting',
          objective: 'Save the new greeting in set_greeting',
          hints: [
            'Writing a storage field also goes through its accessor, and `set_greeting` already takes `&mut self`.',
            '`StorageString` is written with `set_str`, which takes the text to store.',
            'Add `self.greeting.set_str(greeting);` to the body of `set_greeting`.',
          ],
          anchor: 'pub fn set_greeting(',
        },
      ],
      quizzes: [
        {
          afterStep: "Anatomy of a Stylus contract",
          question: "How do you declare a string field called greeting inside sol_storage!?",
          options: ["greeting: String,", "string greeting;", "let greeting: String;"],
          answer: 1,
          explanation: "sol_storage! uses Solidity field syntax: the type, then the name, then a semicolon. Rust struct syntax does not work inside it.",
        },
      ],
    },
  },
  2: {
    slug: 'storage-state',
    difficulty: 'Beginner',
    exercise: {
      explanation: [
        '## Storage and State',
        '',
        'Contract state lives in storage slots, exactly like in Solidity. In `sol_storage!` each field is declared with its Solidity type and becomes a typed storage accessor in Rust:',
        '',
        '| Solidity field | Rust accessor | Read | Write |',
        '|---|---|---|---|',
        '| `uint256 count;` | `StorageU256` | `self.count.get()` | `self.count.set(value)` |',
        '| `address owner;` | `StorageAddress` | `self.owner.get()` | `self.owner.set(value)` |',
        '| `bool paused;` | `StorageBool` | `self.paused.get()` | `self.paused.set(value)` |',
        '| `mapping(address => uint256) balances;` | `StorageMap` | `self.balances.get(key)` | `self.balances.setter(key).set(value)` |',
        '',
        'Numbers use `U256` from `stylus_sdk::alloy_primitives`. It has constants such as `U256::ZERO` and `U256::from(1)` builds one from a Rust integer.',
        '',
        '```rust',
        'let next = self.count.get() + U256::from(1);',
        'self.count.set(next);',
        '```',
        '',
        'Methods that write storage take `&mut self`; read-only methods take `&self`.',
        '',
        '### Your task',
        '',
        'Build a counter:',
        '',
        '1. Store an unsigned 256-bit number called `count`.',
        '2. `get` returns the current count.',
        '3. `increment` adds one to the count.',
        '4. `reset` sets it back to zero.',
        '',
        'Stuck? Each objective has hints, from a nudge to the exact code.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::{alloy_primitives::U256, prelude::*};',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Counter {',
        '        // TODO: add a uint256 field called count',
        '    }',
        '}',
        '',
        '#[public]',
        'impl Counter {',
        '    pub fn get(&self) -> U256 {',
        '        // TODO: return the count',
        '        U256::ZERO',
        '    }',
        '',
        '    pub fn increment(&mut self) {',
        '        // TODO: add 1 to the count',
        '    }',
        '',
        '    pub fn reset(&mut self) {',
        '        // TODO: set the count back to zero',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        {
          anyOf: ['uint256 count;'],
          hint: 'Declare the field in sol_storage! with Solidity syntax: uint256 count;',
          objective: 'Store a number called count in the contract',
          hints: [
            'Declare the field inside `sol_storage!`, in the `Counter` struct, with Solidity syntax.',
            'A counter uses the Solidity type `uint256`. End the declaration with a semicolon.',
            'Add `uint256 count;` inside `pub struct Counter { ... }`.',
          ],
          anchor: 'pub struct Counter {',
        },
        {
          anyOf: ['-> U256 { self.count.get() }', '-> U256 { return self.count.get(); }'],
          hint: 'Return self.count.get() from get',
          objective: 'Return the current count from get',
          hints: [
            'A `uint256` field is a `StorageU256` accessor: read it instead of returning the field itself.',
            '`StorageU256` has a `get()` method that returns a `U256`.',
            'Replace `U256::ZERO` with `self.count.get()`.',
          ],
          anchor: 'pub fn get(&self)',
        },
        {
          anyOf: ['self.count.set(self.count.get() + U256::from(1))', 'self.count.set(self.count.get() + U256::from(1u8))'],
          hint: 'In increment, write self.count.set(self.count.get() + U256::from(1))',
          objective: 'Increment the count by 1',
          hints: [
            'Read the current value, add one, then write the result back.',
            'Read with `get()`, build a one with `U256::from(1)` and write with `set(...)`.',
            'Write `self.count.set(self.count.get() + U256::from(1));` in `increment`.',
          ],
          anchor: 'pub fn increment(',
        },
        {
          anyOf: ['self.count.set(U256::ZERO)', 'self.count.set(U256::from(0))'],
          hint: 'In reset, write self.count.set(U256::ZERO)',
          objective: 'Reset the count to zero',
          hints: [
            'Resetting is a write: store the value zero in the field.',
            '`U256` has a constant for zero: `U256::ZERO`.',
            'Write `self.count.set(U256::ZERO);` in `reset`.',
          ],
          anchor: 'pub fn reset(',
        },
      ],
      quizzes: [
        {
          afterStep: "Storage and State",
          question: "Which line writes a new value to a uint256 field called count?",
          options: ["self.count = value;", "self.count.write(value);", "self.count.set(value);"],
          answer: 2,
          explanation: "Storage fields are accessors, not plain values: read with get() and write with set(value).",
        },
      ],
    },
  },
  3: {
    slug: 'events-errors',
    difficulty: 'Intermediate',
    exercise: {
      explanation: [
        '## Events and Errors',
        '',
        'Events tell the outside world what happened; errors revert a call with a reason that callers can decode. Stylus declares both with the `sol!` macro, using Solidity syntax, so they have the same ABI as their Solidity counterparts.',
        '',
        '### Events',
        '',
        '```rust',
        'sol! {',
        '    event Transfer(address indexed from, address indexed to, uint256 value);',
        '}',
        '```',
        '',
        'Emit one through the host with `self.vm().log(...)`:',
        '',
        '```rust',
        'self.vm().log(Transfer { from, to, value });',
        '```',
        '',
        '### Errors',
        '',
        'Declare the error in `sol!`, then wrap it in an enum that derives `SolidityError`:',
        '',
        '```rust',
        'sol! {',
        '    error Unauthorized(address caller);',
        '}',
        '',
        '#[derive(SolidityError)]',
        'pub enum VaultError {',
        '    Unauthorized(Unauthorized),',
        '}',
        '```',
        '',
        'A method that can fail returns `Result<T, VaultError>`. Returning `Err(...)` reverts the call with the encoded error:',
        '',
        '```rust',
        'return Err(VaultError::Unauthorized(Unauthorized { caller }));',
        '```',
        '',
        'The caller of the current call is `self.vm().msg_sender()`.',
        '',
        '### Your task',
        '',
        '1. In `sol!`, declare `event Transfer(address indexed from, address indexed to, uint256 value);` and `error InsufficientBalance(uint256 available, uint256 required);`.',
        '2. Add an `InsufficientBalance(InsufficientBalance)` variant to `TokenError`.',
        '3. In `send`, return `InsufficientBalance` when `available < amount`.',
        '4. Emit `Transfer` once the balances are updated.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::{',
        '    alloy_primitives::{Address, U256},',
        '    alloy_sol_types::sol,',
        '    prelude::*,',
        '};',
        '',
        'sol! {',
        '    // TODO: declare the Transfer event and the InsufficientBalance error',
        '}',
        '',
        '#[derive(SolidityError)]',
        'pub enum TokenError {',
        '    // TODO: add an InsufficientBalance variant',
        '}',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Token {',
        '        mapping(address => uint256) balances;',
        '    }',
        '}',
        '',
        '#[public]',
        'impl Token {',
        '    pub fn send(&mut self, to: Address, amount: U256) -> Result<(), TokenError> {',
        '        let from = self.vm().msg_sender();',
        '        let available = self.balances.get(from);',
        '        // TODO: return InsufficientBalance when available < amount',
        '',
        '        self.balances.setter(from).set(available - amount);',
        '        let received = self.balances.get(to);',
        '        self.balances.setter(to).set(received + amount);',
        '',
        '        // TODO: emit Transfer',
        '        Ok(())',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        {
          anyOf: ['event Transfer(address indexed from, address indexed to, uint256 value);'],
          hint: 'Declare event Transfer(address indexed from, address indexed to, uint256 value); in sol!',
          anchor: 'sol! {',
        },
        {
          anyOf: ['error InsufficientBalance(uint256 available, uint256 required);'],
          hint: 'Declare error InsufficientBalance(uint256 available, uint256 required); in sol!',
          anchor: 'sol! {',
        },
        {
          anyOf: ['InsufficientBalance(InsufficientBalance)'],
          hint: 'Add an InsufficientBalance(InsufficientBalance) variant to TokenError',
          anchor: 'pub enum TokenError {',
        },
        {
          anyOf: ['if available < amount {', 'if amount > available {'],
          hint: 'Compare the balance with the amount before moving tokens: if available < amount { ... }',
          anchor: 'let available = self.balances.get(from);',
        },
        {
          anyOf: ['Err(TokenError::InsufficientBalance(InsufficientBalance {'],
          hint: 'Revert with Err(TokenError::InsufficientBalance(InsufficientBalance { available, required: amount }))',
          anchor: 'let available = self.balances.get(from);',
        },
        {
          anyOf: ['self.vm().log(Transfer {'],
          hint: 'Emit the event with self.vm().log(Transfer { from, to, value: amount })',
          anchor: 'Ok(())',
        },
      ],
      quizzes: [
        {
          afterStep: "Events",
          question: "How does a stylus-sdk 0.10 method emit a Transfer event?",
          options: ["self.vm().log(Transfer { from, to, value })", "evm::log(Transfer { from, to, value })", "emit Transfer(from, to, value);"],
          answer: 0,
          explanation: "Events go through the host with self.vm().log(...). The evm module, and evm::log with it, was removed in stylus-sdk 0.10.",
        },
        {
          afterStep: "Errors",
          question: "What does returning Err(...) from a #[public] method do?",
          options: ["It logs the error and the call succeeds", "It reverts the call with the ABI-encoded error", "It panics and consumes all the gas"],
          answer: 1,
          explanation: "With an error enum deriving SolidityError, Err(...) reverts the call and callers can decode the error, like a Solidity custom error.",
        },
      ],
    },
  },
  4: {
    slug: 'erc20-token',
    difficulty: 'Intermediate',
    exercise: {
      explanation: [
        '## ERC-20 Token',
        '',
        'ERC-20 is the standard interface of fungible tokens on EVM chains. A Stylus contract that exposes the same methods and events is a regular ERC-20 for wallets, explorers and other contracts.',
        '',
        '### Interface',
        '',
        '| Method | Returns |',
        '|---|---|',
        '| `total_supply()` | `U256`: tokens in existence |',
        '| `balance_of(account)` | `U256`: tokens held by `account` |',
        '| `transfer(to, value)` | `bool`: moves `value` from the caller to `to` |',
        '| `approve(spender, value)` | `bool`: lets `spender` move up to `value` |',
        '| `transfer_from(from, to, value)` | `bool`: spends an allowance |',
        '',
        'Stylus exposes snake_case Rust methods under their camelCase Solidity names (`total_supply` is `totalSupply` in the ABI).',
        '',
        '### Storage',
        '',
        '```rust',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Erc20 {',
        '        uint256 total_supply;',
        '        mapping(address => uint256) balances;',
        '        mapping(address => mapping(address => uint256)) allowances;',
        '    }',
        '}',
        '```',
        '',
        '### Your task',
        '',
        '1. Declare the three storage fields above.',
        '2. `total_supply` returns `self.total_supply.get()`; `balance_of` returns `self.balances.get(account)`.',
        '3. `transfer` reverts with `InsufficientBalance` when the caller holds less than `value`, moves the tokens, emits `Transfer` and returns `Ok(true)`.',
        '',
        '`approve` and `transfer_from` follow the same pattern with `allowances`; they are left for later.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::{',
        '    alloy_primitives::{Address, U256},',
        '    alloy_sol_types::sol,',
        '    prelude::*,',
        '};',
        '',
        'sol! {',
        '    event Transfer(address indexed from, address indexed to, uint256 value);',
        '    event Approval(address indexed owner, address indexed spender, uint256 value);',
        '    error InsufficientBalance(address from, uint256 have, uint256 want);',
        '}',
        '',
        '#[derive(SolidityError)]',
        'pub enum Erc20Error {',
        '    InsufficientBalance(InsufficientBalance),',
        '}',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Erc20 {',
        '        // TODO: add total_supply, balances and allowances',
        '    }',
        '}',
        '',
        '#[public]',
        'impl Erc20 {',
        '    pub fn total_supply(&self) -> U256 {',
        '        // TODO: return the total supply',
        '        U256::ZERO',
        '    }',
        '',
        '    pub fn balance_of(&self, account: Address) -> U256 {',
        '        // TODO: return the balance of account',
        '        U256::ZERO',
        '    }',
        '',
        '    pub fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Erc20Error> {',
        '        let from = self.vm().msg_sender();',
        '        // TODO: revert when from holds less than value,',
        '        // move value from from to to, emit Transfer and return Ok(true)',
        '        Ok(false)',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        {
          anyOf: ['uint256 total_supply;'],
          hint: 'Declare uint256 total_supply; in sol_storage!',
          anchor: 'pub struct Erc20 {',
        },
        {
          anyOf: ['mapping(address => uint256) balances;'],
          hint: 'Declare mapping(address => uint256) balances; in sol_storage!',
          anchor: 'pub struct Erc20 {',
        },
        {
          anyOf: ['mapping(address => mapping(address => uint256)) allowances;'],
          hint: 'Declare mapping(address => mapping(address => uint256)) allowances; in sol_storage!',
          anchor: 'pub struct Erc20 {',
        },
        {
          anyOf: ['self.total_supply.get()'],
          hint: 'Return self.total_supply.get() from total_supply',
          anchor: 'pub fn total_supply(',
        },
        {
          anyOf: ['self.balances.get(account)'],
          hint: 'Return self.balances.get(account) from balance_of',
          anchor: 'pub fn balance_of(',
        },
        {
          anyOf: ['Err(Erc20Error::InsufficientBalance(InsufficientBalance {'],
          hint: 'In transfer, revert with Err(Erc20Error::InsufficientBalance(InsufficientBalance { from, have, want: value }))',
          anchor: 'let from = self.vm().msg_sender();',
        },
        {
          anyOf: ['self.vm().log(Transfer {'],
          hint: 'Emit self.vm().log(Transfer { from, to, value }) in transfer',
          anchor: 'pub fn transfer(',
        },
        {
          anyOf: ['Ok(true)'],
          hint: 'Return Ok(true) once the transfer is done',
          anchor: 'pub fn transfer(',
        },
      ],
      quizzes: [
        {
          afterStep: "Interface",
          question: "Under which name does the Rust method balance_of appear in the contract ABI?",
          options: ["balance_of", "BalanceOf", "balanceOf"],
          answer: 2,
          explanation: "Stylus exports snake_case Rust methods under camelCase Solidity names, so wallets see the standard ERC-20 balanceOf.",
        },
        {
          afterStep: "Storage",
          question: "How do you write the new balance of to in the balances mapping?",
          options: ["self.balances.setter(to).set(new_balance)", "self.balances.get(to).set(new_balance)", "self.balances[to] = new_balance"],
          answer: 0,
          explanation: "get(key) returns a copy of the value; setter(key) returns a writable handle to the entry, and set(value) stores it.",
        },
      ],
    },
  },
  5: {
    slug: 'defi-interaction',
    difficulty: 'Advanced',
  },
};

/** Every lesson of curriculum/lessons.json, in curriculum order, merged with its web content. */
export const LESSONS: Lesson[] = curriculum.map(({ id, name, xp, available, module }): Lesson => {
  const content = CONTENT[id];
  if (!content) {
    throw new Error(`Lesson ${id} is in curriculum/lessons.json but has no web content`);
  }
  if (!modules.some((entry) => entry.id === module)) {
    throw new Error(`Lesson ${id} belongs to an unknown module: ${module}`);
  }
  const base = { id, slug: content.slug, title: name, difficulty: content.difficulty, xp, module };
  if (!available) {
    return { ...base, available: false };
  }
  if (!content.exercise) {
    throw new Error(`Lesson ${id} is available but has no exercise`);
  }
  return { ...base, available: true, exercise: content.exercise };
});

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug);
}
