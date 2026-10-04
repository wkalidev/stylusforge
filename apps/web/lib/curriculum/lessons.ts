import curriculum from '../../../../curriculum/lessons.json';
import type { LessonCheck } from './validate';

export interface LessonExercise {
  explanation: string;
  starterCode: string;
  checks: LessonCheck[];
}

interface LessonBase {
  /** Lesson id, also the ERC-1155 token id of its certificate. */
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  xp: number;
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
        '1. Add a `string greeting;` field to the storage.',
        '2. Return it from `get_greeting` with `self.greeting.get_string()`.',
        '3. Store the argument in `set_greeting` with `self.greeting.set_str(greeting)`.',
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
        },
        {
          anyOf: ['self.greeting.get_string()'],
          hint: 'Return self.greeting.get_string() from get_greeting',
        },
        {
          anyOf: ['self.greeting.set_str(greeting)', 'self.greeting.set_str(&greeting)'],
          hint: 'Store the argument with self.greeting.set_str(greeting) in set_greeting',
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
        '1. Add a `uint256 count;` field.',
        '2. `get` returns `self.count.get()`.',
        '3. `increment` adds one to the count.',
        '4. `reset` sets it back to `U256::ZERO`.',
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
        },
        {
          anyOf: ['-> U256 { self.count.get() }', '-> U256 { return self.count.get(); }'],
          hint: 'Return self.count.get() from get',
        },
        {
          anyOf: ['self.count.set(self.count.get() + U256::from(1))', 'self.count.set(self.count.get() + U256::from(1u8))'],
          hint: 'In increment, write self.count.set(self.count.get() + U256::from(1))',
        },
        {
          anyOf: ['self.count.set(U256::ZERO)', 'self.count.set(U256::from(0))'],
          hint: 'In reset, write self.count.set(U256::ZERO)',
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
        },
        {
          anyOf: ['error InsufficientBalance(uint256 available, uint256 required);'],
          hint: 'Declare error InsufficientBalance(uint256 available, uint256 required); in sol!',
        },
        {
          anyOf: ['InsufficientBalance(InsufficientBalance)'],
          hint: 'Add an InsufficientBalance(InsufficientBalance) variant to TokenError',
        },
        {
          anyOf: ['if available < amount {', 'if amount > available {'],
          hint: 'Compare the balance with the amount before moving tokens: if available < amount { ... }',
        },
        {
          anyOf: ['Err(TokenError::InsufficientBalance(InsufficientBalance {'],
          hint: 'Revert with Err(TokenError::InsufficientBalance(InsufficientBalance { available, required: amount }))',
        },
        {
          anyOf: ['self.vm().log(Transfer {'],
          hint: 'Emit the event with self.vm().log(Transfer { from, to, value: amount })',
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
        },
        {
          anyOf: ['mapping(address => uint256) balances;'],
          hint: 'Declare mapping(address => uint256) balances; in sol_storage!',
        },
        {
          anyOf: ['mapping(address => mapping(address => uint256)) allowances;'],
          hint: 'Declare mapping(address => mapping(address => uint256)) allowances; in sol_storage!',
        },
        {
          anyOf: ['self.total_supply.get()'],
          hint: 'Return self.total_supply.get() from total_supply',
        },
        {
          anyOf: ['self.balances.get(account)'],
          hint: 'Return self.balances.get(account) from balance_of',
        },
        {
          anyOf: ['Err(Erc20Error::InsufficientBalance(InsufficientBalance {'],
          hint: 'In transfer, revert with Err(Erc20Error::InsufficientBalance(InsufficientBalance { from, have, want: value }))',
        },
        {
          anyOf: ['self.vm().log(Transfer {'],
          hint: 'Emit self.vm().log(Transfer { from, to, value }) in transfer',
        },
        {
          anyOf: ['Ok(true)'],
          hint: 'Return Ok(true) once the transfer is done',
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
export const LESSONS: Lesson[] = curriculum.map(({ id, name, xp, available }): Lesson => {
  const content = CONTENT[id];
  if (!content) {
    throw new Error(`Lesson ${id} is in curriculum/lessons.json but has no web content`);
  }
  const base = { id, slug: content.slug, title: name, difficulty: content.difficulty, xp };
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
