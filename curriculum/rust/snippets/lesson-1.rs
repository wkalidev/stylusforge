#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct Profile {
        string name;
    }
}

#[public]
impl Profile {
    pub fn name(&self) -> String {
        self.name.get_string()
    }
}
