import 'server-only';

/**
 * Reference solutions, keyed by lesson id. Used by the validation tests to prove that every
 * check can be passed. `server-only` makes any import from client code fail the build, so the
 * answers can never reach the browser.
 */
export const SOLUTIONS: Record<number, string> = {
  1: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct HelloWorld {
        string greeting;
    }
}

#[public]
impl HelloWorld {
    pub fn get_greeting(&self) -> String {
        self.greeting.get_string()
    }

    pub fn set_greeting(&mut self, greeting: String) {
        self.greeting.set_str(greeting);
    }
}
`,
  2: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 count;
    }
}

#[public]
impl Counter {
    pub fn get(&self) -> U256 {
        self.count.get()
    }

    pub fn increment(&mut self) {
        self.count.set(self.count.get() + U256::from(1));
    }

    pub fn reset(&mut self) {
        self.count.set(U256::ZERO);
    }
}
`,
  3: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    error InsufficientBalance(uint256 available, uint256 required);
}

#[derive(SolidityError)]
pub enum TokenError {
    InsufficientBalance(InsufficientBalance),
}

sol_storage! {
    #[entrypoint]
    pub struct Token {
        mapping(address => uint256) balances;
    }
}

#[public]
impl Token {
    pub fn send(&mut self, to: Address, amount: U256) -> Result<(), TokenError> {
        let from = self.vm().msg_sender();
        let available = self.balances.get(from);
        if available < amount {
            return Err(TokenError::InsufficientBalance(InsufficientBalance {
                available,
                required: amount,
            }));
        }

        self.balances.setter(from).set(available - amount);
        let received = self.balances.get(to);
        self.balances.setter(to).set(received + amount);

        self.vm().log(Transfer { from, to, value: amount });
        Ok(())
    }
}
`,
  4: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    error InsufficientBalance(address from, uint256 have, uint256 want);
}

#[derive(SolidityError)]
pub enum Erc20Error {
    InsufficientBalance(InsufficientBalance),
}

sol_storage! {
    #[entrypoint]
    pub struct Erc20 {
        uint256 total_supply;
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
    }
}

#[public]
impl Erc20 {
    pub fn total_supply(&self) -> U256 {
        self.total_supply.get()
    }

    pub fn balance_of(&self, account: Address) -> U256 {
        self.balances.get(account)
    }

    pub fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Erc20Error> {
        let from = self.vm().msg_sender();
        let have = self.balances.get(from);
        if have < value {
            return Err(Erc20Error::InsufficientBalance(InsufficientBalance {
                from,
                have,
                want: value,
            }));
        }

        self.balances.setter(from).set(have - value);
        let received = self.balances.get(to);
        self.balances.setter(to).set(received + value);

        self.vm().log(Transfer { from, to, value });
        Ok(true)
    }
}
`,
  6: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct Scoreboard {
        mapping(address => uint256) scores;
    }
}

#[public]
impl Scoreboard {
    pub fn score_of(&self, account: Address) -> U256 {
        self.scores.get(account)
    }

    pub fn record(&mut self, points: U256) {
        let player = self.vm().msg_sender();
        let total = self.scores.get(player) + points;
        self.scores.insert(player, total);
    }

    pub fn clear(&mut self) {
        let player = self.vm().msg_sender();
        self.scores.delete(player);
    }
}
`,
  7: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, alloy_sol_types::sol, prelude::*};

sol! {
    error IndexOutOfBounds(uint256 index, uint256 length);
}

#[derive(SolidityError)]
pub enum PriceLogError {
    IndexOutOfBounds(IndexOutOfBounds),
}

sol_storage! {
    #[entrypoint]
    pub struct PriceLog {
        uint256[] prices;
    }
}

#[public]
impl PriceLog {
    pub fn length(&self) -> U256 {
        U256::from(self.prices.len())
    }

    pub fn record(&mut self, price: U256) {
        self.prices.push(price);
    }

    pub fn price_at(&self, index: U256) -> Result<U256, PriceLogError> {
        self.prices.get(index).ok_or(PriceLogError::IndexOutOfBounds(IndexOutOfBounds {
            index,
            length: self.length(),
        }))
    }

    pub fn remove_last(&mut self) {
        self.prices.pop();
    }
}
`,
  8: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use stylus_sdk::{alloy_primitives::U256, alloy_sol_types::sol, prelude::*};

sol! {
    error UnknownTask(uint256 id);
}

#[derive(SolidityError)]
pub enum TodoError {
    UnknownTask(UnknownTask),
}

sol_storage! {
    pub struct Task {
        string title;
        bool done;
    }

    #[entrypoint]
    pub struct TodoList {
        Task[] tasks;
    }
}

#[public]
impl TodoList {
    pub fn add_task(&mut self, title: String) {
        let mut task = self.tasks.grow();
        task.title.set_str(title);
    }

    pub fn task(&self, id: U256) -> Result<(String, bool), TodoError> {
        let task = self.tasks.getter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?;
        Ok((task.title.get_string(), task.done.get()))
    }

    pub fn complete(&mut self, id: U256) -> Result<(), TodoError> {
        let mut task = self.tasks.setter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?;
        task.done.set(true);
        Ok(())
    }
}
`,
  9: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct Attendance {
        mapping(address => uint256) check_ins;
        address last_visitor;
    }
}

#[public]
impl Attendance {
    pub fn check_in(&mut self) {
        let visitor = self.vm().msg_sender();
        let now = U256::from(self.vm().block_timestamp());
        self.check_ins.insert(visitor, now);
        self.last_visitor.set(visitor);
    }

    pub fn checked_in_at(&self, account: Address) -> U256 {
        self.check_ins.get(account)
    }

    pub fn last_visitor(&self) -> Address {
        self.last_visitor.get()
    }
}
`,
  10: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    error Unauthorized(address caller);
}

#[derive(SolidityError)]
pub enum AccessError {
    Unauthorized(Unauthorized),
}

sol_storage! {
    #[entrypoint]
    pub struct FeeConfig {
        address owner;
        uint256 fee;
    }
}

#[public]
impl FeeConfig {
    #[constructor]
    pub fn constructor(&mut self, owner: Address) {
        self.owner.set(owner);
    }

    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    pub fn fee(&self) -> U256 {
        self.fee.get()
    }

    pub fn set_fee(&mut self, fee: U256) -> Result<(), AccessError> {
        self.only_owner()?;
        self.fee.set(fee);
        Ok(())
    }

    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), AccessError> {
        self.only_owner()?;
        self.owner.set(new_owner);
        Ok(())
    }
}

impl FeeConfig {
    fn only_owner(&self) -> Result<(), AccessError> {
        let caller = self.vm().msg_sender();
        if caller != self.owner.get() {
            return Err(AccessError::Unauthorized(Unauthorized { caller }));
        }
        Ok(())
    }
}
`,
  11: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    call::transfer::transfer_eth,
    prelude::*,
};

sol! {
    error InsufficientDeposit(uint256 available, uint256 requested);
}

#[derive(SolidityError)]
pub enum BankError {
    InsufficientDeposit(InsufficientDeposit),
}

sol_storage! {
    #[entrypoint]
    pub struct PiggyBank {
        mapping(address => uint256) deposits;
    }
}

#[public]
impl PiggyBank {
    #[payable]
    pub fn deposit(&mut self) {
        let account = self.vm().msg_sender();
        let total = self.deposits.get(account) + self.vm().msg_value();
        self.deposits.insert(account, total);
    }

    pub fn deposit_of(&self, account: Address) -> U256 {
        self.deposits.get(account)
    }

    pub fn balance(&self) -> U256 {
        self.vm().balance(self.vm().contract_address())
    }

    pub fn withdraw(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        let account = self.vm().msg_sender();
        let available = self.deposits.get(account);
        if available < amount {
            return Err(BankError::InsufficientDeposit(InsufficientDeposit { available, requested: amount }).into());
        }
        self.deposits.insert(account, available - amount);
        transfer_eth(self.vm(), account, amount)?;
        Ok(())
    }
}
`,
  12: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, alloy_sol_types::sol, prelude::*};

sol! {
    error FeeOverflow(uint256 amount, uint256 rate_bps);
}

#[derive(SolidityError)]
pub enum QuoteError {
    FeeOverflow(FeeOverflow),
}

sol_storage! {
    #[entrypoint]
    pub struct FeeQuote {
        uint256 rate_bps;
    }
}

#[public]
impl FeeQuote {
    pub fn fee(amount: U256, rate_bps: U256) -> Result<U256, QuoteError> {
        let scaled = amount
            .checked_mul(rate_bps)
            .ok_or(QuoteError::FeeOverflow(FeeOverflow { amount, rate_bps }))?;
        Ok(scaled / U256::from(10_000))
    }

    pub fn rate(&self) -> U256 {
        self.rate_bps.get()
    }

    pub fn set_rate(&mut self, rate_bps: U256) {
        self.rate_bps.set(rate_bps);
    }

    pub fn quote(&self, amount: U256) -> Result<U256, QuoteError> {
        Self::fee(amount, self.rate_bps.get())
    }

    pub fn quote_pair(&self, first: U256, second: U256) -> Result<(U256, U256), QuoteError> {
        let rate = self.rate_bps.get();
        Ok((Self::fee(first, rate)?, Self::fee(second, rate)?))
    }
}
`,
  13: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    error InsufficientBalance(address from, uint256 have, uint256 want);
    error InsufficientAllowance(address spender, uint256 have, uint256 want);
}

#[derive(SolidityError)]
pub enum Erc20Error {
    InsufficientBalance(InsufficientBalance),
    InsufficientAllowance(InsufficientAllowance),
}

sol_storage! {
    #[entrypoint]
    pub struct Erc20 {
        uint256 total_supply;
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
    }
}

impl Erc20 {
    fn move_tokens(&mut self, from: Address, to: Address, value: U256) -> Result<(), Erc20Error> {
        let have = self.balances.get(from);
        if have < value {
            return Err(Erc20Error::InsufficientBalance(InsufficientBalance {
                from,
                have,
                want: value,
            }));
        }

        self.balances.setter(from).set(have - value);
        let received = self.balances.get(to);
        self.balances.setter(to).set(received + value);

        self.vm().log(Transfer { from, to, value });
        Ok(())
    }
}

#[public]
impl Erc20 {
    pub fn total_supply(&self) -> U256 {
        self.total_supply.get()
    }

    pub fn balance_of(&self, account: Address) -> U256 {
        self.balances.get(account)
    }

    pub fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Erc20Error> {
        self.move_tokens(self.vm().msg_sender(), to, value)?;
        Ok(true)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.getter(owner).get(spender)
    }

    pub fn approve(&mut self, spender: Address, value: U256) -> bool {
        let owner = self.vm().msg_sender();
        self.allowances.setter(owner).insert(spender, value);
        self.vm().log(Approval { owner, spender, value });
        true
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, value: U256) -> Result<bool, Erc20Error> {
        let spender = self.vm().msg_sender();
        let allowed = self.allowances.getter(from).get(spender);
        if allowed < value {
            return Err(Erc20Error::InsufficientAllowance(InsufficientAllowance {
                spender,
                have: allowed,
                want: value,
            }));
        }
        if allowed != U256::MAX {
            self.allowances.setter(from).insert(spender, allowed - value);
        }

        self.move_tokens(from, to, value)?;
        Ok(true)
    }
}
`,
  14: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    event Transfer(address indexed from, address indexed to, uint256 indexed token_id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed token_id);
    error NonexistentToken(uint256 token_id);
    error AlreadyMinted(uint256 token_id);
    error InvalidReceiver(address receiver);
    error IncorrectOwner(address from, uint256 token_id, address owner);
    error InsufficientApproval(address operator, uint256 token_id);
}

#[derive(SolidityError)]
pub enum Erc721Error {
    NonexistentToken(NonexistentToken),
    AlreadyMinted(AlreadyMinted),
    InvalidReceiver(InvalidReceiver),
    IncorrectOwner(IncorrectOwner),
    InsufficientApproval(InsufficientApproval),
}

sol_storage! {
    #[entrypoint]
    pub struct Erc721 {
        mapping(uint256 => address) owners;
        mapping(address => uint256) balances;
        mapping(uint256 => address) token_approvals;
    }
}

#[public]
impl Erc721 {
    pub fn balance_of(&self, owner: Address) -> U256 {
        self.balances.get(owner)
    }

    pub fn owner_of(&self, token_id: U256) -> Result<Address, Erc721Error> {
        let owner = self.owners.get(token_id);
        if owner.is_zero() {
            return Err(Erc721Error::NonexistentToken(NonexistentToken { token_id }));
        }
        Ok(owner)
    }

    pub fn mint(&mut self, receiver: Address, token_id: U256) -> Result<(), Erc721Error> {
        if receiver.is_zero() {
            return Err(Erc721Error::InvalidReceiver(InvalidReceiver { receiver }));
        }
        if !self.owners.get(token_id).is_zero() {
            return Err(Erc721Error::AlreadyMinted(AlreadyMinted { token_id }));
        }
        let held = self.balances.get(receiver);
        self.balances.insert(receiver, held + U256::from(1));
        self.owners.insert(token_id, receiver);
        self.vm().log(Transfer { from: Address::ZERO, to: receiver, token_id });
        Ok(())
    }

    pub fn approve(&mut self, approved: Address, token_id: U256) -> Result<(), Erc721Error> {
        let sender = self.vm().msg_sender();
        if sender != self.owner_of(token_id)? {
            return Err(Erc721Error::InsufficientApproval(InsufficientApproval { operator: sender, token_id }));
        }
        self.token_approvals.insert(token_id, approved);
        self.vm().log(Approval { owner: sender, approved, token_id });
        Ok(())
    }

    pub fn get_approved(&self, token_id: U256) -> Result<Address, Erc721Error> {
        self.owner_of(token_id)?;
        Ok(self.token_approvals.get(token_id))
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Erc721Error> {
        let caller = self.vm().msg_sender();
        if to.is_zero() {
            return Err(Erc721Error::InvalidReceiver(InvalidReceiver { receiver: to }));
        }
        let owner = self.owner_of(token_id)?;
        if owner != from {
            return Err(Erc721Error::IncorrectOwner(IncorrectOwner { from, token_id, owner }));
        }
        if caller != owner && caller != self.token_approvals.get(token_id) {
            return Err(Erc721Error::InsufficientApproval(InsufficientApproval { operator: caller, token_id }));
        }

        self.token_approvals.delete(token_id);
        let sent = self.balances.get(from);
        self.balances.insert(from, sent - U256::from(1));
        let received = self.balances.get(to);
        self.balances.insert(to, received + U256::from(1));
        self.owners.insert(token_id, to);

        self.vm().log(Transfer { from, to, token_id });
        Ok(())
    }
}
`,
  15: `#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use openzeppelin_stylus::{
    token::erc20::{
        self,
        extensions::{Erc20Metadata, IErc20Metadata},
        Erc20, IErc20,
    },
    utils::introspection::erc165::IErc165,
};
use stylus_sdk::{
    alloy_primitives::{aliases::B32, Address, U256, U8},
    prelude::*,
};

#[entrypoint]
#[storage]
struct ForgeToken {
    erc20: Erc20,
    metadata: Erc20Metadata,
}

#[public]
#[implements(IErc20<Error = erc20::Error>, IErc20Metadata, IErc165)]
impl ForgeToken {
    #[constructor]
    pub fn constructor(
        &mut self,
        name: String,
        symbol: String,
        recipient: Address,
        supply: U256,
    ) -> Result<(), erc20::Error> {
        self.metadata.constructor(name, symbol);
        self.erc20._mint(recipient, supply)
    }
}

#[public]
impl IErc20 for ForgeToken {
    type Error = erc20::Error;

    fn total_supply(&self) -> U256 {
        self.erc20.total_supply()
    }

    fn balance_of(&self, account: Address) -> U256 {
        self.erc20.balance_of(account)
    }

    fn transfer(&mut self, to: Address, value: U256) -> Result<bool, Self::Error> {
        self.erc20.transfer(to, value)
    }

    fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.erc20.allowance(owner, spender)
    }

    fn approve(&mut self, spender: Address, value: U256) -> Result<bool, Self::Error> {
        self.erc20.approve(spender, value)
    }

    fn transfer_from(&mut self, from: Address, to: Address, value: U256) -> Result<bool, Self::Error> {
        self.erc20.transfer_from(from, to, value)
    }
}

#[public]
impl IErc20Metadata for ForgeToken {
    fn name(&self) -> String {
        self.metadata.name()
    }

    fn symbol(&self) -> String {
        self.metadata.symbol()
    }

    fn decimals(&self) -> U8 {
        self.metadata.decimals()
    }
}

#[public]
impl IErc165 for ForgeToken {
    fn supports_interface(&self, interface_id: B32) -> bool {
        self.erc20.supports_interface(interface_id) || self.metadata.supports_interface(interface_id)
    }
}
`,
};
