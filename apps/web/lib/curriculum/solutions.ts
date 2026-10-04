/**
 * Reference solutions, keyed by lesson id. Used by the validation tests to prove that every
 * check can be passed. Never import this module from app code: it would ship the answers to
 * the browser.
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
};
