#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    error NoVisitor(uint256 index);
}

#[derive(SolidityError)]
pub enum GuestbookError {
    NoVisitor(NoVisitor),
}

sol_storage! {
    #[entrypoint]
    pub struct Guestbook {
        address[] visitors;
        uint256[] visits;
    }
}

#[public]
impl Guestbook {
    pub fn sign(&mut self) {
        let visitor = self.vm().msg_sender();
        self.visitors.push(visitor);
    }

    pub fn count(&self) -> U256 {
        U256::from(self.visitors.len())
    }

    pub fn visitor_or_zero(&self, index: U256) -> Address {
        match self.visitors.get(index) {
            Some(visitor) => visitor,
            None => Address::ZERO,
        }
    }

    pub fn visitor_at(&self, index: U256) -> Result<Address, GuestbookError> {
        self.visitors.get(index).ok_or(GuestbookError::NoVisitor(NoVisitor { index }))
    }

    pub fn visit(&mut self, index: U256) {
        if let Some(mut visits) = self.visits.setter(index) {
            let next = visits.get() + U256::from(1);
            visits.set(next);
        }
    }
}
