#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
};

sol! {
    error NotOwner(address caller);
    error MathOverflow();
}

#[derive(SolidityError)]
pub enum VaultError {
    NotOwner(NotOwner),
    MathOverflow(MathOverflow),
}

sol_storage! {
    #[entrypoint]
    pub struct Vault {
        address owner;
        bool paused;
        uint256 total_shares;
        mapping(address => uint256) shares;
    }
}

#[public]
impl Vault {
    #[constructor]
    pub fn constructor(&mut self, owner: Address) {
        self.owner.set(owner);
    }

    pub fn worth(&self, account: Address) -> Result<U256, VaultError> {
        let held = self.shares.get(account);
        let vault_assets = self.vm().balance(self.vm().contract_address());
        let vault_shares = self.total_shares.get();
        let worth = held.checked_mul(vault_assets).ok_or(VaultError::MathOverflow(MathOverflow {}))? / vault_shares;
        Ok(worth)
    }

    #[payable]
    pub fn before(&mut self) -> U256 {
        // In a payable method, the balance already includes the value sent.
        let before = self.vm().balance(self.vm().contract_address()) - self.vm().msg_value();
        before
    }

    pub fn virtual_shares(&self, assets: U256, assets_before: U256, offset: u8) -> Result<U256, VaultError> {
        let supply = self.total_shares.get();
        // OpenZeppelin's ERC-4626: 10^offset virtual shares and 1 virtual wei.
        let virtual_shares = supply + U256::from(10).pow(U256::from(offset));
        let virtual_assets = assets_before + U256::from(1);
        let shares = assets.checked_mul(virtual_shares).ok_or(VaultError::MathOverflow(MathOverflow {}))? / virtual_assets;
        Ok(shares)
    }

    pub fn set_paused(&mut self, paused: bool) -> Result<(), VaultError> {
        let caller = self.vm().msg_sender();
        if caller != self.owner.get() {
            return Err(VaultError::NotOwner(NotOwner { caller }));
        }
        self.paused.set(paused);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    #[test]
    fn pauses() {
        let vm = TestVM::default();
        let mut vault = Vault::from(&vm);
        vault.constructor(vm.msg_sender());
        // VaultError has no Debug, so unwrap() does not compile: compare with ok() instead.
        assert_eq!(vault.set_paused(true).ok(), Some(()));
    }
}
