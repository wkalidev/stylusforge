#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::Address, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Operators {
        mapping(address => mapping(address => bool)) approved;
    }
}

#[public]
impl Operators {
    pub fn approve_operator(&mut self, holder: Address, operator: Address) -> bool {
        // Read: may operator act for holder?
        let allowed = self.approved.getter(holder).get(operator);
        // Write: the outer key first, then the inner one.
        self.approved.setter(holder).insert(operator, true);
        allowed
    }
}
