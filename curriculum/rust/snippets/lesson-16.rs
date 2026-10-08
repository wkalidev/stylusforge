#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{I256, U256},
    prelude::*,
};

sol_interface! {
    interface ICounter {
        function count() external view returns (uint256);
        function increment() external;
    }

    interface IPriceFeed {
        function decimals() external view returns (uint8);
        function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    }
}

sol_storage! {
    #[entrypoint]
    pub struct Reader {
        address counter;
        address feed;
        address uptime;
    }
}

#[public]
impl Reader {
    pub fn read_count(&self) -> Result<U256, Vec<u8>> {
        let counter = ICounter::new(self.counter.get());
        let count = counter.count(self.vm(), Call::new())?;
        Ok(count)
    }

    pub fn scaled(&self, price: U256) -> Result<U256, Vec<u8>> {
        let feed = IPriceFeed::new(self.feed.get());
        let decimals = feed.decimals(self.vm(), Call::new())?;
        // To 18 decimals, for a feed with at most 18.
        let scaled = price * U256::from(10).pow(U256::from(18 - decimals));
        Ok(scaled)
    }

    pub fn sequencer(&self, grace_period: U256) -> Result<bool, Vec<u8>> {
        let now = U256::from(self.vm().block_timestamp());
        let uptime = IPriceFeed::new(self.uptime.get());
        let (_, status, started_at, _, _) = uptime.latest_round_data(self.vm(), Call::new())?;
        let sequencer_up = status == I256::ZERO;
        let back_for = now - started_at;
        // Accept prices only when sequencer_up and back_for > grace_period.
        Ok(sequencer_up && back_for > grace_period)
    }
}
