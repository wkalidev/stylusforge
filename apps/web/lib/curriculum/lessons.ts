import curriculum from '../../../../curriculum/lessons.json';

export interface LessonCheck {
  code: string;
  hint: string;
}

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
        'Stylus lets you write smart contracts in Rust compiled to WASM running on Arbitrum.',
        '',
        '### Structure of a Stylus contract',
        '',
        '1. Import the stylus_sdk crate',
        '2. Define storage with sol_storage! macro',
        '3. Add an impl block with your functions',
        '4. Use #[public] to expose functions',
        '',
        '### Your task',
        '',
        'Add a String field called greeting in sol_storage!',
        'Then implement get_greeting and set_greeting.',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(feature = "export-abi"), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::prelude::*;',
        'use alloc::string::String;',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct HelloWorld {',
        '        // TODO: add a String field called greeting',
        '    }',
        '}',
        '',
        '#[public]',
        'impl HelloWorld {',
        '    pub fn get_greeting(&self) -> String {',
        '        String::new()',
        '    }',
        '    pub fn set_greeting(&mut self, greeting: String) {',
        '        // TODO: store the greeting',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        { code: 'String greeting', hint: 'Add a String field called greeting in sol_storage!' },
        { code: 'get_string()', hint: 'Use self.greeting.get_string() in get_greeting' },
        { code: 'set_str', hint: 'Use self.greeting.set_str(&greeting) in set_greeting' },
      ],
    },
  },
  2: {
    slug: 'storage-state',
    difficulty: 'Beginner',
    exercise: {
      explanation: [
        '## Storage and State in Stylus',
        '',
        'Stylus contracts store data on-chain using the sol_storage! macro.',
        'Each field maps to an EVM storage slot.',
        '',
        '### Available storage types',
        '',
        '- StorageU256 / StorageU128 / StorageU64 — unsigned integers',
        '- StorageAddress — Ethereum addresses',
        '- StorageBool — booleans',
        '- StorageString — strings',
        '- StorageMap<K, V> — key-value mappings',
        '',
        '### Your task',
        '',
        'Create a counter contract with:',
        '- A U256 field called count',
        '- A get() function returning the count',
        '- An increment() function adding 1',
        '- A reset() function setting count to 0',
      ].join('\n'),
      starterCode: [
        '#![cfg_attr(not(feature = "export-abi"), no_main)]',
        'extern crate alloc;',
        '',
        'use stylus_sdk::prelude::*;',
        'use alloy_primitives::U256;',
        '',
        'sol_storage! {',
        '    #[entrypoint]',
        '    pub struct Counter {',
        '        // TODO: add a U256 field called count',
        '    }',
        '}',
        '',
        '#[public]',
        'impl Counter {',
        '    pub fn get(&self) -> U256 {',
        '        // TODO: return count',
        '        U256::ZERO',
        '    }',
        '',
        '    pub fn increment(&mut self) {',
        '        // TODO: add 1 to count',
        '    }',
        '',
        '    pub fn reset(&mut self) {',
        '        // TODO: set count to zero',
        '    }',
        '}',
      ].join('\n'),
      checks: [
        { code: 'U256 count', hint: 'Add a U256 field called count in sol_storage!' },
        { code: 'self.count.get()', hint: 'Use self.count.get() to return the count value' },
        { code: 'self.count.set(', hint: 'Use self.count.set(...) to update the count' },
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
        { code: 'event Transfer', hint: 'Define a Transfer event with from, to and value fields using sol! macro' },
        { code: 'error InsufficientBalance', hint: 'Define an InsufficientBalance error using sol! macro' },
        { code: 'evm::log', hint: 'Emit the Transfer event using evm::log(Transfer { ... })' },
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
        { code: 'total_supply', hint: 'Add a total_supply field in sol_storage!' },
        { code: 'mapping(address => uint256) balances', hint: 'Add a balances mapping in sol_storage!' },
        { code: 'self.total_supply.get()', hint: 'Return self.total_supply.get() in total_supply()' },
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
