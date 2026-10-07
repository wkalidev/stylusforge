#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, alloy_sol_types::sol, prelude::*};

sol! {
    error TotalOverflow(uint256 price, uint256 quantity);
}

#[derive(SolidityError)]
pub enum MarketError {
    TotalOverflow(TotalOverflow),
}

sol_storage! {
    #[entrypoint]
    pub struct Market {
        uint256 price;
        uint256 limit;
    }
}

#[public]
impl Market {
    pub fn is_even(value: U256) -> bool {
        value % U256::from(2) == U256::ZERO
    }

    pub fn price(&self) -> U256 {
        self.price.get()
    }

    pub fn set_price(&mut self, price: U256) {
        self.price.set(price);
    }

    pub fn total(&self, quantity: U256) -> Result<U256, MarketError> {
        let price = self.price.get();
        let total = price
            .checked_mul(quantity)
            .ok_or(MarketError::TotalOverflow(TotalOverflow { price, quantity }))?;
        Ok(total)
    }

    pub fn fits(&self, value: U256) -> bool {
        // Two storage reads:
        let fits = value <= self.limit.get() && self.limit.get() > U256::ZERO;
        // One:
        let limit = self.limit.get();
        let fits = value <= limit && limit > U256::ZERO;
        fits
    }

    pub fn gas_left(&self) -> (u64, u64) {
        (self.vm().evm_gas_left(), self.vm().evm_ink_left())
    }
}
