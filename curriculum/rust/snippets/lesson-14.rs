#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Erc721 {
        mapping(uint256 => address) owners;
        mapping(address => uint256) balances;
        mapping(uint256 => address) token_approvals;
    }
}

#[public]
impl Erc721 {
    pub fn has_approval(&self, token_id: U256) -> bool {
        let approved = self.token_approvals.get(token_id);
        let has_approval = !approved.is_zero(); // the same as approved != Address::ZERO
        has_approval
    }
}
