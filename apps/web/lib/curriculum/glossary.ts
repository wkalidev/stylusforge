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
    id: 'constructor',
    pattern: /#\[constructor\]/,
    title: '#[constructor]',
    description:
      'Runs once, when the contract is deployed; the SDK refuses any later call. With `cargo stylus deploy`, `msg_sender()` there is the StylusDeployer contract, so pass the owner as a parameter.',
  },
  {
    id: 'payable',
    pattern: /#\[payable\]/,
    title: '#[payable]',
    description: 'Lets a method receive ETH. A call that sends ETH to a method without it reverts.',
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
    id: 'tx_origin',
    pattern: /\btx_origin\(\)/,
    title: 'tx_origin()',
    description:
      'The wallet that signed the transaction, like `tx.origin` in Solidity. Never use it for authorization: any contract the owner calls would pass the check. Use `msg_sender()`.',
  },
  {
    id: 'msg_value',
    pattern: /\bmsg_value\(\)/,
    title: 'msg_value()',
    description: 'The wei sent with the call, as a `U256`, like `msg.value` in Solidity. Only `#[payable]` methods accept a value above zero.',
  },
  {
    id: 'balance',
    pattern: /(?<=vm\(\)\.)balance\(/,
    title: 'vm().balance(address)',
    description: 'The ETH balance in wei of any account. `self.vm().balance(self.vm().contract_address())` is the ETH this contract holds.',
  },
  {
    id: 'contract_address',
    pattern: /\bcontract_address\(\)/,
    title: 'contract_address()',
    description: 'The address of this contract, like `address(this)` in Solidity.',
  },
  {
    id: 'transfer_eth',
    pattern: /\btransfer_eth\b/,
    title: 'transfer_eth(host, to, amount)',
    description:
      'Sends `amount` wei from the contract to `to`, from `stylus_sdk::call::transfer`. It calls the recipient with all the remaining gas and returns `Result<(), Vec<u8>>`: update storage before calling it.',
  },
  {
    id: 'gas_left',
    pattern: /\bevm_(?:gas|ink)_left\(\)/,
    title: 'evm_gas_left() / evm_ink_left()',
    description: 'The gas, or the ink, left for the call. Stylus meters its WebAssembly in ink, a finer unit that converts to gas.',
  },
  {
    id: 'checked',
    pattern: /(?<=\.)checked_(?:add|sub|mul|div)\(/,
    title: 'checked arithmetic',
    description:
      '`checked_add`, `checked_sub`, `checked_mul` and `checked_div` return `None` on overflow (or division by zero) instead of wrapping around like `+`, `-` and `*`. Turn the `None` into an error with `ok_or`.',
  },
  {
    id: 'block_timestamp',
    pattern: /\bblock_timestamp\(\)/,
    title: 'block_timestamp()',
    description:
      'Unix time in seconds, as a `u64`: a bounded estimate of when the sequencer sequenced the transaction. Convert it with `U256::from(...)` to store it.',
  },
  {
    id: 'block_number',
    pattern: /\bblock_number\(\)/,
    title: 'block_number()',
    description:
      'A `u64`. On Arbitrum, a bounded estimate of the L1 (Ethereum) block number at which the sequencer sequenced the transaction, not the Arbitrum block number.',
  },
  {
    id: 'address_field',
    pattern: /\baddress(?=\s+\w+\s*;)/,
    title: 'address',
    description: 'A storage field holding one `Address`: `get()` reads it (the zero address until written), `set(value)` writes it.',
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
    id: 'getter',
    pattern: /\bgetter\(/,
    title: 'getter(key)',
    description:
      'Returns a read handle to one entry of a `mapping`, or `Some` handle to an element of a vector (`None` past its end). Use it to read the fields of a struct or an inner mapping.',
  },
  {
    id: 'grow',
    pattern: /(?<=\.)grow\(\)/,
    title: 'grow()',
    description:
      'Appends an element with every field at zero to a storage vector and returns a writable handle to it. Use it for vectors of structs, which cannot be pushed.',
  },
  {
    id: 'setter',
    pattern: /\bsetter\(/,
    title: 'setter(key)',
    description:
      'Returns a writable handle to one entry of a `mapping`; chain `.set(value)` to store it. On a vector it returns `Some` handle to an element, or `None` past its end.',
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
    id: 'vector',
    pattern: /\b\w+\[\]/,
    title: 'T[] (storage vector)',
    description:
      'A `StorageVec`: a dynamic array with `len()`, `push(value)`, `get(index)` (an `Option`), `setter(index)` and `pop()`. It only shrinks from its end.',
  },
  {
    id: 'push',
    pattern: /(?<=\.)push\(/,
    title: 'push(value)',
    description: 'Appends `value` at the end of a storage vector, which grows by one.',
  },
  {
    id: 'pop',
    pattern: /(?<=\.)pop\(\)/,
    title: 'pop()',
    description: 'Removes the last element of a storage vector and returns it: `Some(value)`, or `None` when the vector is empty.',
  },
  {
    id: 'len',
    pattern: /(?<=\.)len\(\)/,
    title: 'len()',
    description: 'The number of elements of a storage vector, as a Rust `usize`. Convert it with `U256::from(...)` to return it.',
  },
  {
    id: 'uint256',
    pattern: /\buint256\b/,
    title: 'uint256',
    description: 'A 256-bit unsigned integer: `StorageU256` in storage, `U256` in Rust code.',
  },
  {
    id: 'u256_max',
    pattern: /\bU256::MAX\b/,
    title: 'U256::MAX',
    description:
      'The largest `U256`, 2^256 − 1. ERC-20 tokens read an allowance of `U256::MAX` as unlimited: the `transfer_from` of OpenZeppelin never lowers it.',
  },
  {
    id: 'u256',
    pattern: /\bU256\b/,
    title: 'U256',
    description: 'The 256-bit unsigned integer of `alloy_primitives`: `U256::ZERO`, `U256::from(1)`, checked and wrapping arithmetic.',
  },
  {
    id: 'address_zero',
    pattern: /\bAddress::ZERO\b/,
    title: 'Address::ZERO',
    description:
      'The zero address, `0x0000…0000`. An `address` never written reads as it, so an ERC-721 token owned by the zero address does not exist, and no token may be sent to it.',
  },
  {
    id: 'is_zero',
    pattern: /(?<=\.)is_zero\(\)/,
    title: 'is_zero()',
    description: 'Whether a value is zero: `owner.is_zero()` is the same as `owner == Address::ZERO`. `U256` has it too.',
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
