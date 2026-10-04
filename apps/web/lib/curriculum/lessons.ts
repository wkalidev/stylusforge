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
        '## Events and Errors in Stylus',
        '',
        'Events let your contract communicate with the outside world.',
        'Errors let you revert transactions with a clear message.',
        '',
        '### Defining events',
        '',
        'Use the sol! macro to define Solidity-compatible events:',
        '',
        'sol! {',
        '    event Transfer(address indexed from, address indexed to, uint256 value);',
        '}',
        '',
        '### Emitting events',
        '',
        'evm::log(Transfer { from, to, value });',
        '',
        '### Custom errors',
        '',
        'sol! {',
        '    error InsufficientBalance(uint256 available, uint256 required);',
        '}',
        '',
        '### Your task',
        '',
        'Add a Transfer event and emit it in a send() function.',
        'Add an InsufficientBalance error and revert when balance is too low.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(feature = "export-abi"), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::{prelude::*, evm};',
        'use alloy_primitives::{U256, Address};',
        '',
        '// TODO: define Transfer event and InsufficientBalance error using sol! macro',
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
        '    pub fn send(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {',
        '        // TODO: check balance, emit Transfer event',
        '        Ok(())',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        { anyOf: ['event Transfer'], hint: 'Define a Transfer event with from, to and value fields using sol! macro' },
        { anyOf: ['error InsufficientBalance'], hint: 'Define an InsufficientBalance error using sol! macro' },
        { anyOf: ['evm::log'], hint: 'Emit the Transfer event using evm::log(Transfer { ... })' },
      ],
    },
  },
  4: {
    slug: 'erc20-token',
    difficulty: 'Intermediate',
    exercise: {
      explanation: [
        '## ERC-20 Token in Stylus',
        '',
        'ERC-20 is the standard interface for fungible tokens on EVM chains.',
        'Stylus lets you implement it in Rust with full EVM compatibility.',
        '',
        '### Required functions',
        '',
        '- total_supply() -> U256',
        '- balance_of(account: Address) -> U256',
        '- transfer(to: Address, amount: U256) -> bool',
        '- approve(spender: Address, amount: U256) -> bool',
        '- transfer_from(from: Address, to: Address, amount: U256) -> bool',
        '',
        '### Storage needed',
        '',
        '- total_supply: U256',
        '- balances: mapping(address => uint256)',
        '- allowances: mapping(address => mapping(address => uint256))',
        '',
        '### Your task',
        '',
        'Implement total_supply, balance_of and transfer.',
        'Use the Transfer event from the previous lesson.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(feature = "export-abi"), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::{prelude::*, evm};',
        'use alloy_primitives::{U256, Address};',
        '',
        'sol! {',
        '    event Transfer(address indexed from, address indexed to, uint256 value);',
        '    event Approval(address indexed owner, address indexed spender, uint256 value);',
        '}',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Erc20 {',
        '        // TODO: add total_supply, balances and allowances fields',
        '    }',
        '}',
        '',
        '#[public]',
        'impl Erc20 {',
        '    pub fn total_supply(&self) -> U256 {',
        '        // TODO: return total_supply',
        '        U256::ZERO',
        '    }',
        '',
        '    pub fn balance_of(&self, account: Address) -> U256 {',
        '        // TODO: return balance of account',
        '        U256::ZERO',
        '    }',
        '',
        '    pub fn transfer(&mut self, to: Address, amount: U256) -> bool {',
        '        // TODO: transfer amount from sender to recipient',
        '        false',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        { anyOf: ['total_supply'], hint: 'Add a total_supply field in sol_storage!' },
        { anyOf: ['mapping(address => uint256) balances'], hint: 'Add a balances mapping in sol_storage!' },
        { anyOf: ['self.total_supply.get()'], hint: 'Return self.total_supply.get() in total_supply()' },
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
