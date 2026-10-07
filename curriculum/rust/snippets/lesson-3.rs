#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
}

sol! {
    error Unauthorized(address caller);
}

#[derive(SolidityError)]
pub enum VaultError {
    Unauthorized(Unauthorized),
}

sol_storage! {
    #[entrypoint]
    pub struct Vault {
        address owner;
    }
}

#[public]
impl Vault {
    pub fn announce(&mut self, to: Address, value: U256) {
        let from = self.vm().msg_sender();
        self.vm().log(Transfer { from, to, value });
    }

    pub fn guard(&self) -> Result<(), VaultError> {
        let caller = self.vm().msg_sender();
        if caller != self.owner.get() {
            return Err(VaultError::Unauthorized(Unauthorized { caller }));
        }
        Ok(())
    }
}
