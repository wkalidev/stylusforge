#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    call::transfer::transfer_eth,
    prelude::*,
};

sol! {
    error NothingOwed(address account);
}

#[derive(SolidityError)]
pub enum RewardsError {
    NothingOwed(NothingOwed),
}

sol_storage! {
    #[entrypoint]
    pub struct TipJar {
        mapping(address => uint256) tips;
        mapping(address => uint256) rewards;
    }
}

#[public]
impl TipJar {
    #[payable]
    pub fn tip(&mut self) {
        let tipper = self.vm().msg_sender();
        let total = self.tips.get(tipper) + self.vm().msg_value();
        self.tips.insert(tipper, total);
    }

    pub fn held(&self) -> U256 {
        self.vm().balance(self.vm().contract_address())
    }

    pub fn pay(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        transfer_eth(self.vm(), to, amount)?;
        Ok(())
    }

    pub fn refuse(&self, account: Address) -> Result<(), Vec<u8>> {
        return Err(RewardsError::NothingOwed(NothingOwed { account }).into());
    }

    pub fn claim(&mut self) -> Result<(), Vec<u8>> {
        let account = self.vm().msg_sender();
        let owed = self.rewards.get(account);
        if owed == U256::ZERO {
            return Err(RewardsError::NothingOwed(NothingOwed { account }).into());
        }
        self.rewards.delete(account);
        transfer_eth(self.vm(), account, owed)?;
        Ok(())
    }
}
