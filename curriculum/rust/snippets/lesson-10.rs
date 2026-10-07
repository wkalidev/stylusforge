#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    error NotAdmin(address caller);
}

#[derive(SolidityError)]
pub enum TreasuryError {
    NotAdmin(NotAdmin),
}

sol_storage! {
    #[entrypoint]
    pub struct Treasury {
        address admin;
        uint256 limit;
    }
}

#[public]
impl Treasury {
    #[constructor]
    pub fn constructor(&mut self, admin: Address) {
        self.admin.set(admin);
    }

    pub fn set_limit(&mut self, limit: U256) -> Result<(), TreasuryError> {
        self.only_admin()?;
        self.limit.set(limit);
        Ok(())
    }
}

impl Treasury {
    fn only_admin(&self) -> Result<(), TreasuryError> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(TreasuryError::NotAdmin(NotAdmin { caller }));
        }
        Ok(())
    }
}
