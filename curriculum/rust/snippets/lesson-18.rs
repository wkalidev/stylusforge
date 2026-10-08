#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, alloy_sol_types::sol, prelude::*};

sol! {
    error EmptyBatch();
}

#[derive(SolidityError)]
pub enum BatchError {
    EmptyBatch(EmptyBatch),
}

sol_storage! {
    #[entrypoint]
    pub struct Meter {
        uint256[] batch;
    }
}

#[public]
impl Meter {
    pub fn convert(&self, ink: u64) -> (u32, u64, u64) {
        let price = self.vm().tx_ink_price(); // ink per gas: 10,000 by default
        let gas = self.vm().ink_to_gas(ink); // ink divided by the price
        let ink = self.vm().gas_to_ink(gas); // gas times the price, saturating at u64::MAX
        (price, gas, ink)
    }

    pub fn measure(&self, n: u64) -> (U256, u64) {
        let before = self.vm().evm_ink_left();
        let total = Self::sum_to(n);
        let used = before - self.vm().evm_ink_left();
        (total, used)
    }

    pub fn first(&self) -> Result<U256, BatchError> {
        // A panic: on an empty batch, the call reverts with no data.
        let first = self.batch.get(0).unwrap();
        // An error: callers can decode EmptyBatch().
        let first = self.batch.get(0).ok_or(BatchError::EmptyBatch(EmptyBatch {}))?;
        Ok(first)
    }
}

impl Meter {
    fn sum_to(n: u64) -> U256 {
        let mut total = U256::ZERO;
        for i in 0..=n {
            total += U256::from(i);
        }
        total
    }
}
