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

## StylusForgeNFT

Each lesson is an ERC-1155 token id. A student owns at most one certificate per lesson, and certificates cannot be transferred or burned.

### Functions

| Function | Access | Description |
|---|---|---|
| `claim(lessonId, deadline, signature)` | anyone | Mints the certificate of `lessonId` to the caller with a voucher signed by `signer` |
| `addLesson(lessonId, name, xp)` | owner | Registers a lesson (id must be non-zero and unused) |
| `setSigner(newSigner)` | owner | Sets the address whose vouchers are accepted |
| `setURI(newUri)` | owner | Sets the ERC-1155 metadata URI template (`{id}` is replaced by clients) |
| `mintCertificate(student, lessonId)` | owner | Admin mint, with the same checks as `claim` |
| `lessons(lessonId)` | view | `(name, xp, exists)` |
| `getLessonIds()` | view | Registered lesson ids, in registration order |
| `completed(student, lessonId)` | view | Whether the student owns the certificate |
| `getCompletedLessons(student)` | view | `(lessonIds, done)`: every registered id with its completion flag |
| `getTotalXP(student)` | view | Sum of the XP of the completed lessons |
| `signer()` | view | Current claim signer |

Events: `LessonAdded(lessonId, name, xp)`, `LessonCompleted(student, lessonId)`, `SignerUpdated(previousSigner, newSigner)`.

Custom errors: `InvalidLesson`, `LessonAlreadyExists`, `AlreadyCompleted`, `SoulBound`, `InvalidSigner`, `InvalidSignature`, `ClaimExpired`, plus OpenZeppelin's `OwnableUnauthorizedAccount`.

### Soul-bound rule

`_update` only lets mints through (`from == address(0)`). Every transfer, including one by an approved operator, and every burn reverts with `SoulBound()`.

### Claim flow

1. The student completes a lesson in the web app.
2. The backend checks the code and signs an EIP-712 voucher with the claim signer key:
   - domain: `name = "StylusForge"`, `version = "1"`, `chainId`, `verifyingContract` = contract address
   - type: `Claim(address student,uint256 lessonId,uint256 deadline)`
3. The student sends `claim(lessonId, deadline, signature)` from the `student` address and pays the gas.
4. The contract rejects the claim if the deadline has passed (`ClaimExpired`), if the signature does not recover to `signer` for this caller and lesson (`InvalidSignature`), if the lesson is not registered (`InvalidLesson`) or if the certificate is already owned (`AlreadyCompleted`, which also blocks replays).

## Deployment

`scripts/deploy.ts`:

1. reads `CLAIM_SIGNER_ADDRESS` (environment or keystore) and stops before connecting if it is missing or invalid;
2. deploys `StylusForgeNFT` from the deployer account;
3. registers lessons 1 to 4 with their XP;
4. sets the claim signer;
5. prints the variables to add to `apps/web/.env.local`.

Dry run on the in-process Hardhat network (no real transaction):

```bash
CLAIM_SIGNER_ADDRESS=0x... pnpm hardhat run scripts/deploy.ts
```

Deploy to Arbitrum Sepolia once the three configuration variables are set and the deployer account holds Sepolia ETH:

```bash
pnpm hardhat run scripts/deploy.ts --network arbitrumSepolia
```

The metadata URI is not set by the script: call `setURI` once the web app serves the metadata route.
