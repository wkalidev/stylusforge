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
    id: 'storage',
    pattern: /#\[storage\]/,
    title: '#[storage]',
    description:
      'Declares storage as a Rust struct whose fields are storage types: `StorageU256`, `StorageMap`, or components such as the `Erc20` of OpenZeppelin. `sol_storage!` declares the same with Solidity syntax.',
  },
  {
    id: 'implements',
    pattern: /#\[implements\(/,
    title: '#[implements(...)]',
    description:
      'Lists the traits, such as `IErc20`, whose `#[public]` impl blocks the contract exports. Calls are only routed to the traits listed here.',
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
    id: 'ink_price',
    pattern: /\btx_ink_price\(\)/,
    title: 'tx_ink_price()',
    description:
      'How much ink one gas buys on this chain, as a `u32`: 10,000 by default. The chain owner sets it, so read it from the host rather than writing the default in your code.',
  },
  {
    id: 'ink_conversion',
    pattern: /(?<=\.)(?:ink_to_gas|gas_to_ink)\(/,
    title: 'ink_to_gas() / gas_to_ink()',
    description:
      'Convert between ink and gas at the ink price of the chain: `ink_to_gas` divides by the price, `gas_to_ink` multiplies by it and saturates at `u64::MAX`. Both take and return a `u64`.',
  },
  {
    id: 'raw_call',
    pattern: /\bRawCall\b/,
    title: 'RawCall',
    description:
      'A call with raw calldata, from `stylus_sdk::call`: `new`, `new_with_value(host, value)`, `new_static` or `new_delegate`, then `call(address, calldata)`, which is `unsafe`. Unlike the calls of `sol_interface!` and `transfer_eth`, it does not flush the storage cache unless asked.',
  },
  {
    id: 'storage_cache',
    pattern: /(?<=\.)(?:flush|clear)_storage_cache\(\)/,
    title: 'flush_storage_cache() / clear_storage_cache()',
    description:
      'Makes a `RawCall` write the storage cache to storage before calling, so the callee, and any call back into this contract, read your latest writes. `clear_storage_cache` also empties the cache, so storage is read again after the call.',
  },
  {
    id: 'unsafe',
    pattern: /\bunsafe\b/,
    title: 'unsafe',
    description:
      'Calls code whose safety the compiler cannot check. `RawCall::call` is `unsafe` because a raw call can change storage that your code still holds a reference to.',
  },
  {
    id: 'cfg_test',
    pattern: /#\[cfg\(test\)\]/,
    title: '#[cfg(test)]',
    description: 'Compiles the item only for `cargo test`. Test modules stay out of the WebAssembly you deploy.',
  },
  {
    id: 'test',
    pattern: /#\[test\]/,
    title: '#[test]',
    description: 'Marks a function that `cargo test` runs. It passes unless it panics, so a failed `assert!` or `assert_eq!` fails it.',
  },
  {
    id: 'test_vm',
    pattern: /\bTestVM(?:Builder)?\b/,
    title: 'TestVM',
    description:
      'The test VM of the SDK (`stylus_sdk::testing`, with the `stylus-test` feature): it stands in for the chain in unit tests. `TestVM::default()` starts from defaults; `TestVMBuilder` sets the sender, the value or the contract address up front. Build the contract on it with `Contract::from(&vm)`.',
  },
  {
    id: 'test_vm_setters',
    pattern: /(?<=\.)set_(?:sender|value|block_timestamp|block_number|balance|tx_origin|chain_id|contract_address)\(/,
    title: 'TestVM setters',
    description:
      'Set what the next calls see: `set_sender`, `set_value`, `set_block_timestamp`, `set_block_number`, `set_balance` (balances never move on their own in the test VM), `set_tx_origin`, `set_chain_id` and `set_contract_address`.',
  },
  {
    id: 'emitted_logs',
    pattern: /(?<=\.)get_emitted_logs\(\)/,
    title: 'get_emitted_logs()',
    description:
      'Every log the contract emitted on the test VM, in order, as `(topics, data)`. The first topic of an event is the hash of its signature.',
  },
  {
    id: 'mock_call',
    pattern: /(?<=\.)mock_(?:call|static_call|delegate_call)\(/,
    title: 'mock_call()',
    description:
      'Gives the test VM the answer of a call to another contract: `Ok(return data)` or `Err(revert data)`. It answers only the exact address and calldata (and value, for `mock_call`); calls that are not mocked succeed with empty return data.',
  },
  {
    id: 'signature_hash',
    pattern: /\bSIGNATURE_HASH\b/,
    title: 'SIGNATURE_HASH',
    description:
      'The keccak-256 hash of an event signature, from the `SolEvent` trait of `alloy_sol_types`: the first topic of every log of that event.',
  },
  {
    id: 'panic',
    pattern: /(?<=\.)(?:unwrap\(\)|expect\()/,
    title: 'unwrap() / expect()',
    description:
      'Panic on `None` (or `Err`). In a Stylus contract, a panic makes the call revert with no data, which callers cannot decode, and panic messages take room in the binary. Return an error declared with `sol!` instead, with `ok_or` and `?`. In a test, a panic only fails the test.',
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
    id: 'selector',
    pattern: /#\[selector\(/,
    title: '#[selector(name = "...")]',
    description:
      'Sets the Solidity name of a method when the camelCase of its Rust name is not the one callers use, such as `DOMAIN_SEPARATOR`. Its selector is the first 4 bytes of the keccak-256 hash of the signature.',
  },
  {
    id: 'u80',
    pattern: /\bU80\b/,
    title: 'U80',
    description: 'An unsigned 80-bit integer from `alloy_primitives::aliases`, the `uint80` of Solidity, as in the round ids of Chainlink feeds.',
  },
  {
    id: 'uint80',
    pattern: /\buint80\b/,
    title: 'uint80',
    description: 'An unsigned 80-bit integer in Solidity: a `U80` in Rust code, read and written with `get` and `set` in storage.',
  },
  {
    id: 'sol_interface',
    pattern: /\bsol_interface!/,
    title: 'sol_interface!',
    description:
      'Turns Solidity interfaces into Rust types that wrap the address of a deployed contract: `IFeed::new(address)`, then one snake_case method per function, which takes `self.vm()`, a `Call` configuration and the arguments, and returns a `Result`.',
  },
  {
    id: 'call_config',
    pattern: /\bCall::(?:new_mutating|new_payable|new|default)\(/,
    title: 'Call configuration',
    description:
      '`Call::new()` makes a static call, for `view` and `pure` functions. `Call::new_mutating(self)` lets the callee write, and `Call::new_payable(self, value)` also sends ETH; both need `&mut self`, so build them before borrowing `self.vm()`.',
  },
  {
    id: 'i256',
    pattern: /\bI256\b/,
    title: 'I256',
    description:
      'The signed 256-bit integer of `alloy_primitives`, the `int256` of Solidity: `I256::ZERO`, `is_positive()`, `is_negative()`, and `into_raw()` for its bits as a `U256`.',
  },
  {
    id: 'int256',
    pattern: /\bint256\b/,
    title: 'int256',
    description: 'A signed 256-bit integer in Solidity: `StorageI256` in storage, `I256` in Rust code.',
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
