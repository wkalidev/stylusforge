#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{aliases::U80, B256, I256},
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct Permit {
        bytes32 domain_separator;
        uint80 round_id;
        int256 answer;
    }
}

#[public]
impl Permit {
    #[selector(name = "DOMAIN_SEPARATOR")]
    pub fn domain_separator(&self) -> B256 {
        self.domain_separator.get()
    }

    pub fn round(&self) -> (U80, I256) {
        (self.round_id.get(), self.answer.get())
    }
}
