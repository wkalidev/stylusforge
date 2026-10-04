# Contracts

Hardhat 3 project for `StylusForgeNFT`, the soul-bound ERC-1155 certificate contract of StylusForge.

## Stack

- Hardhat 3 with `@nomicfoundation/hardhat-toolbox-viem` (viem, Node.js test runner, Ignition, keystore, verify, network helpers)
- Solidity 0.8.28 (optimizer enabled, 200 runs)
- OpenZeppelin Contracts 5
- Target network: Arbitrum Sepolia (chain id 421614)

## Layout

```
contracts/
├─ contracts/StylusForgeNFT.sol   certificate contract
├─ scripts/deploy.ts              deployment script
├─ test/StylusForgeNFT.ts         tests (node:test + viem)
├─ hardhat.config.ts
└─ .env.example                   configuration variable names
```

## Commands

Install dependencies from the repository root with `pnpm install`. Then, from `contracts/`:

| Command | Description |
|---|---|
| `pnpm hardhat build` | Compile the contracts |
| `pnpm test` | Run all tests (`hardhat test`); also available as `pnpm test` from the root |
| `pnpm hardhat test nodejs` | Run only the TypeScript tests |

## Configuration variables

The `arbitrumSepolia` network reads its settings through Hardhat configuration variables (`configVariable`). They are resolved only when a command uses that network, so building and testing need none of them.

| Variable | Used by | Description |
|---|---|---|
| `ARBITRUM_SEPOLIA_RPC_URL` | `hardhat.config.ts` | Arbitrum Sepolia JSON-RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | `hardhat.config.ts` | Private key of the deployer account (0x-prefixed) |
| `CLAIM_SIGNER_ADDRESS` | `scripts/deploy.ts` | Public address of the backend key that signs claim vouchers |

Hardhat 3 does not load `.env` files. A variable is read from the environment first, then from the encrypted Hardhat keystore. `.env.example` only lists the names.

### Keystore

Store the values in the keystore (run from `contracts/`). The first `set` creates the keystore and asks for a password; values are typed at a hidden prompt, never on the command line:

```bash
pnpm hardhat keystore set ARBITRUM_SEPOLIA_RPC_URL
pnpm hardhat keystore set DEPLOYER_PRIVATE_KEY
pnpm hardhat keystore set CLAIM_SIGNER_ADDRESS
```

Other keystore commands:

```bash
pnpm hardhat keystore list                 # list stored keys (names only)
pnpm hardhat keystore delete <NAME>        # remove a key
pnpm hardhat keystore path                 # show where the keystore file is
pnpm hardhat keystore change-password      # change the keystore password
```

Use a dedicated testnet deployer key, never a key that holds mainnet funds.
