#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct Door {
        address last_opener;
        uint256 opened_in;
    }
}

#[public]
impl Door {
    pub fn open(&mut self) {
        let opener = self.vm().msg_sender();
        self.last_opener.set(opener);
        self.opened_in.set(U256::from(self.vm().block_number()));
    }

    pub fn whoami(&self) -> Address {
        self.vm().msg_sender()
    }

    pub fn is_owner(&self, owner: Address) -> bool {
        let is_owner = self.vm().msg_sender() == owner; // right: only the owner's own calls
        let is_owner = self.vm().tx_origin() == owner; // wrong: any contract the owner calls
        is_owner
    }

    pub fn block(&self) -> U256 {
        let opened_in = U256::from(self.vm().block_number());
        opened_in
    }
}
