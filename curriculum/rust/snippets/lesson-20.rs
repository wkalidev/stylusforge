#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    call::RawCall,
    prelude::*,
};

sol! {
    error TooLarge(uint256 amount);
}

#[derive(SolidityError)]
pub enum VaultError {
    TooLarge(TooLarge),
}

sol_storage! {
    #[entrypoint]
    pub struct Vault {
        address owner;
        address[] depositors;
        mapping(address => uint256) balances;
    }
}

#[public]
impl Vault {
    #[constructor]
    pub fn constructor(&mut self, owner: Address) {
        self.owner.set(owner);
    }

    pub fn accounts(&self) -> (Address, Address) {
        // Who signed the transaction: never use it to authorize.
        let signer = self.vm().tx_origin();
        // Who called this contract: the account to authorize.
        let caller = self.vm().msg_sender();
        (signer, caller)
    }

    pub fn arithmetic(&self, available: U256, amount: U256) -> Result<u64, VaultError> {
        let wrapped = available - amount; // wraps around below zero
        let checked = available.checked_sub(amount); // None below zero
        let small = u64::try_from(amount); // Err when it does not fit
        let truncated = amount.to::<u64>(); // panics when it does not fit
        let _ = (wrapped, checked, truncated);
        small.map_err(|_| VaultError::TooLarge(TooLarge { amount }))
    }

    pub fn pay(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        unsafe {
            RawCall::new_with_value(self.vm(), amount)
                .flush_storage_cache()
                .call(to, &[])?;
        }
        Ok(())
    }

    pub fn total(&self) -> U256 {
        let mut total = U256::ZERO;
        // Costs more ink with every depositor, until it no longer fits in a transaction.
        for i in 0..self.depositors.len() {
            let depositor = self.depositors.get(i).unwrap_or_default();
            total += self.balances.get(depositor);
        }
        total
    }
}
