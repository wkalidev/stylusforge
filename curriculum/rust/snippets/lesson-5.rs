#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

sol_interface! {
    interface IERC20 {
        function balanceOf(address account) external view returns (uint256);
        function transfer(address to, uint256 value) external returns (bool);
        function transferFrom(address from, address to, uint256 value) external returns (bool);
    }

    interface IPool {
        function deposit() external payable;
    }
}

sol_storage! {
    #[entrypoint]
    pub struct Payer {
        address token;
        address pool;
    }
}

#[public]
impl Payer {
    pub fn pay(&mut self, to: Address, amount: U256) -> Result<bool, Vec<u8>> {
        let token = IERC20::new(self.token.get());
        let config = Call::new_mutating(self);
        let ok = token.transfer(self.vm(), config, to, amount)?;
        Ok(ok)
    }

    #[payable]
    pub fn forward(&mut self) -> Result<(), Vec<u8>> {
        let amount = self.vm().msg_value();
        let pool = IPool::new(self.pool.get());
        let config = Call::new_payable(self, amount);
        pool.deposit(self.vm(), config)?;
        Ok(())
    }

    pub fn pull(&mut self, amount: U256) -> Result<U256, Vec<u8>> {
        let account = self.vm().msg_sender();
        let vault = self.vm().contract_address();
        let token = IERC20::new(self.token.get());
        let before = token.balance_of(self.vm(), Call::new(), vault)?;
        let config = Call::new_mutating(self);
        token.transfer_from(self.vm(), config, account, vault, amount)?;
        let received = token.balance_of(self.vm(), Call::new(), vault)? - before;
        Ok(received)
    }
}
