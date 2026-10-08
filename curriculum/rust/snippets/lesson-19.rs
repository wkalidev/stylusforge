#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    error InsufficientDeposit(uint256 available, uint256 requested);
}

#[derive(SolidityError)]
pub enum BankError {
    InsufficientDeposit(InsufficientDeposit),
}

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 count;
        mapping(address => uint256) deposits;
    }
}

#[public]
impl Counter {
    pub fn count(&self) -> U256 {
        self.count.get()
    }

    pub fn increment(&mut self) {
        let count = self.count.get();
        self.count.set(count + U256::from(1));
    }

    pub fn withdraw(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        let account = self.vm().msg_sender();
        let available = self.deposits.get(account);
        if available < amount {
            return Err(BankError::InsufficientDeposit(InsufficientDeposit { available, requested: amount }).into());
        }
        self.deposits.insert(account, available - amount);
        Ok(())
    }

    pub fn send(&mut self, to: Address, value: U256) {
        let from = self.vm().msg_sender();
        self.vm().log(Transfer { from, to, value });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::alloy_sol_types::SolEvent;
    use stylus_sdk::testing::*;

    #[test]
    fn counts() {
        let vm = TestVM::default();
        let mut counter = Counter::from(&vm);
        counter.increment();
        assert_eq!(counter.count(), U256::from(1));
    }

    #[test]
    fn sets_the_scene() {
        let vm = TestVM::default();
        let alice = Address::repeat_byte(0xa1);
        vm.set_sender(alice);
        vm.set_value(U256::from(1_000));
        vm.set_block_timestamp(1_700_000_000);
        assert_eq!(vm.msg_sender(), alice);
    }

    #[test]
    fn asserts_errors_and_events() {
        let vm = TestVM::default();
        let mut bank = Counter::from(&vm);
        let result = bank.withdraw(U256::from(5));
        assert_eq!(result, Err(BankError::InsufficientDeposit(InsufficientDeposit { available: U256::ZERO, requested: U256::from(5) }).into()));

        bank.send(Address::repeat_byte(0xb0), U256::from(1));
        let logs = vm.get_emitted_logs();
        assert_eq!(logs[0].0[0], Transfer::SIGNATURE_HASH);
    }
}
