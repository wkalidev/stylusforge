#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct Club {
        mapping(address => bool) members;
        mapping(address => uint256) deposits;
        mapping(address => mapping(address => uint256)) allowances;
    }
}

#[public]
impl Club {
    pub fn status(&self, account: Address) -> (bool, U256) {
        let joined = self.members.get(account); // false if never written
        let total = self.deposits.get(account); // U256::ZERO if never written
        (joined, total)
    }

    pub fn join(&mut self, amount: U256) {
        let account = self.vm().msg_sender();
        self.members.insert(account, true);
        let total = self.deposits.get(account) + amount;
        self.deposits.insert(account, total);
    }

    pub fn leave(&mut self) {
        let account = self.vm().msg_sender();
        self.members.delete(account);
    }

    pub fn reset_allowance(&mut self, owner: Address, spender: Address, value: U256) -> U256 {
        let allowed = self.allowances.getter(owner).get(spender);
        self.allowances.setter(owner).insert(spender, value);
        allowed
    }
}
