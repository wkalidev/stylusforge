/**
 * Stylus tokens explained on hover in the lesson editor. Each entry matches a distinctive piece of
 * syntax; descriptions follow stylus-sdk 0.10.
 */
export interface GlossaryEntry {
  id: string;
  /** Matches the token; the whole match is the hovered range. Must not use the g or y flags. */
  pattern: RegExp;
  title: string;
  /** Markdown shown in the tooltip. */
  description: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'sol_storage',
    pattern: /\bsol_storage!/,
    title: 'sol_storage!',
    description:
      'Declares contract storage with Solidity field syntax (`uint256 count;`). Each field becomes a typed storage accessor, laid out in the same slots as Solidity.',
  },
  {
    id: 'sol',
    pattern: /\bsol!/,
    title: 'sol!',
    description:
      'Declares Solidity events and errors (and other types) in Solidity syntax, so they get the same ABI as their Solidity counterparts.',
  },
  {
    id: 'entrypoint',
    pattern: /#\[entrypoint\]/,
    title: '#[entrypoint]',
    description: 'Marks the storage struct that receives calls: the contract itself. One per contract.',
  },
  {
    id: 'public',
    pattern: /#\[public\]/,
    title: '#[public]',
    description:
      'Exposes the methods of this `impl` block in the contract ABI. Rust `snake_case` names are exported in Solidity `camelCase`.',
  },
  {
    id: 'cfg_attr',
    pattern: /#!\[cfg_attr\(/,
    title: 'no_main outside export-abi',
    description:
      'A Stylus contract is a WASM library without a `main` function, except when built with the `export-abi` feature to print its Solidity ABI.',
  },
  {
    id: 'alloc',
    pattern: /\bextern crate alloc\b/,
    title: 'extern crate alloc',
    description: 'Stylus contracts are `no_std`: heap types like `String` and `Vec` come from the `alloc` crate.',
  },
  {
    id: 'prelude',
    pattern: /\bstylus_sdk::prelude\b/,
    title: 'stylus_sdk::prelude',
    description: 'Brings the SDK macros and traits into scope: `sol_storage!`, `#[public]`, `#[entrypoint]`, `SolidityError`, the host traits.',
  },
  {
    id: 'solidity_error',
    pattern: /\bSolidityError\b/,
    title: 'SolidityError',
    description:
      'Derive it on an enum of `sol!` errors so methods can return `Result<T, YourError>`; returning `Err(...)` reverts with the ABI-encoded error.',
  },
  {
    id: 'vm',
    pattern: /\bvm\(\)/,
    title: 'self.vm()',
    description: 'The host the contract runs on: caller, value, block data, logs, calls. Available on `&self` and `&mut self`.',
  },
  {
    id: 'msg_sender',
    pattern: /\bmsg_sender\(\)/,
    title: 'msg_sender()',
    description: 'The address that called the current method, like `msg.sender` in Solidity.',
  },
  {
    id: 'log',
    pattern: /(?<=vm\(\)\.)log\b/,
    title: 'vm().log(event)',
    description: 'Emits a `sol!` event as an EVM log. Indexed fields become topics.',
  },
  {
    id: 'get_string',
    pattern: /\bget_string\(\)/,
    title: 'get_string()',
    description: 'Reads a `string` storage field (`StorageString`) as a Rust `String`.',
  },
  {
    id: 'set_str',
    pattern: /\bset_str\(/,
    title: 'set_str(value)',
    description: 'Writes a `string` storage field from anything that converts to `&str`.',
  },
  {
    id: 'setter',
    pattern: /\bsetter\(/,
    title: 'setter(key)',
    description: 'Returns a writable handle to one entry of a `mapping`; chain `.set(value)` to store it.',
  },
  {
    id: 'insert',
    pattern: /(?<=\.)insert\(/,
    title: 'insert(key, value)',
    description: 'Stores `value` for `key` in a `mapping`, overwriting what was there. The same as `setter(key).set(value)`.',
  },
  {
    id: 'delete',
    pattern: /(?<=\.)delete\(/,
    title: 'delete(key)',
    description: 'Resets one entry of a `mapping` to its zero value. `take(key)` does the same and returns the old value.',
  },
  {
    id: 'mapping',
    pattern: /\bmapping\(/,
    title: 'mapping(K => V)',
    description: 'A `StorageMap`: `get(key)` reads (zero for unset keys), `setter(key).set(value)` writes. Keys are not enumerable.',
  },
  {
    id: 'uint256',
    pattern: /\buint256\b/,
    title: 'uint256',
    description: 'A 256-bit unsigned integer: `StorageU256` in storage, `U256` in Rust code.',
  },
  {
    id: 'u256',
    pattern: /\bU256\b/,
    title: 'U256',
    description: 'The 256-bit unsigned integer of `alloy_primitives`: `U256::ZERO`, `U256::from(1)`, checked and wrapping arithmetic.',
  },
  {
    id: 'address',
    pattern: /\bAddress\b/,
    title: 'Address',
    description: 'A 20-byte account address from `alloy_primitives`, the `address` type of Solidity.',
  },
];

export interface GlossaryHit {
  entry: GlossaryEntry;
  /** 1-based columns of the match, end exclusive (Monaco's convention). */
  startColumn: number;
  endColumn: number;
}

/** The glossary entry under a 1-based column of a line, if any. */
export function glossaryAt(line: string, column: number): GlossaryHit | null {
  for (const entry of GLOSSARY) {
    const pattern = new RegExp(entry.pattern.source, `${entry.pattern.flags}g`);
    for (const match of line.matchAll(pattern)) {
      const startColumn = (match.index ?? 0) + 1;
      const endColumn = startColumn + match[0].length;
      if (column >= startColumn && column < endColumn) {
        return { entry, startColumn, endColumn };
      }
    }
  }
  return null;
}
