#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    error NoEntry(uint256 index);
}

#[derive(SolidityError)]
pub enum ClubError {
    NoEntry(NoEntry),
}

sol_storage! {
    pub struct Settings {
        uint256 fee;
        address treasury;
    }

    pub struct Member {
        string name;
        uint256 level;
    }

    #[entrypoint]
    pub struct Club {
        Settings settings;
        mapping(address => Member) members;
        Member[] history;
    }
}

#[public]
impl Club {
    pub fn set_fee(&mut self, new_fee: U256) -> U256 {
        let fee = self.settings.fee.get();
        self.settings.fee.set(new_fee);
        fee
    }

    pub fn welcome(&mut self, account: Address, name: String) -> U256 {
        let level = self.members.getter(account).level.get();

        let mut member = self.members.setter(account);
        member.name.set_str(&name);
        member.level.set(U256::from(1));
        level
    }

    pub fn record(&mut self, name: String) {
        let mut entry = self.history.grow();
        entry.name.set_str(name);
    }

    pub fn entry_name(&self, index: U256) -> Result<String, ClubError> {
        let entry = self.history.getter(index).ok_or(ClubError::NoEntry(NoEntry { index }))?;
        let name = entry.name.get_string();
        Ok(name)
    }

    pub fn level_up(&mut self) {
        let account = self.vm().msg_sender();
        let mut member = self.members.setter(account);
        member.level.set(U256::from(2));
    }
}
