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
├─ scripts/deploy.ts              Arbitrum Sepolia deployment script
├─ scripts/deploy-local.ts        local node deployment, writes the web dev env
├─ scripts/deploy-certificate.ts  shared deploy steps (deploy, lessons, signer)
├─ scripts/set-uri.ts             points the metadata URI at the deployed web app
├─ scripts/register-lessons.ts    registers new lessons on a deployed contract
├─ scripts/lesson-registration.ts compares the curriculum with the registered lessons
├─ scripts/metadata-uri.ts        builds <base>/api/metadata/{id}
├─ scripts/config-variables.ts    reads configuration variables (environment, then keystore)
├─ scripts/lessons.ts             loads and validates ../curriculum/lessons.json and modules.json
├─ test/StylusForgeNFT.ts         contract tests (node:test + viem)
├─ test/lessonRegistration.ts     registration diffing tests
├─ hardhat.config.ts
└─ .env.example                   configuration variable names
```

Lesson ids, names and XP come from [`curriculum/lessons.json`](../curriculum/lessons.json), the single source of truth shared with the web app. The deploy scripts and the tests read it through `scripts/lessons.ts`, which returns only the lessons marked `"available": true`: an unavailable lesson is never registered, since a registered lesson cannot change. The loader also checks that every lesson belongs to a module of [`curriculum/modules.json`](../curriculum/modules.json) and that lessons are listed module by module.

## Commands

Install dependencies from the repository root with `pnpm install`. Then, from `contracts/`:

| Command | Description |
|---|---|
| `pnpm hardhat build` | Compile the contracts |
| `pnpm test` | Run all tests (`hardhat test`); also available as `pnpm test` from the root |
| `pnpm hardhat test nodejs` | Run only the TypeScript tests |
| `pnpm chain` | Start a local Hardhat node on `http://127.0.0.1:8545` (chain id 31337); also available from the root |
| `pnpm deploy:local` | Deploy to that node and write `apps/web/.env.development.local`; also available from the root |
| `pnpm register:lessons --network <name>` | Register the available lessons missing on a deployed contract ([below](#registering-new-lessons)); also available from the root |

## Configuration variables

The `arbitrumSepolia` network and contract verification read their settings through Hardhat configuration variables (`configVariable`). A variable is resolved only when a command needs it, so building and testing need none of them.

| Variable | Used by | Description |
|---|---|---|
| `ARBITRUM_SEPOLIA_RPC_URL` | `hardhat.config.ts` | Arbitrum Sepolia JSON-RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | `hardhat.config.ts` | Private key of the deployer account (0x-prefixed) |
| `CLAIM_SIGNER_ADDRESS` | `scripts/deploy.ts` | Public address of the backend key that signs claim vouchers |
| `ETHERSCAN_API_KEY` | `hardhat.config.ts` (`verify`) | Etherscan API V2 key, used to verify the contract on Arbiscan |
| `NFT_CONTRACT_ADDRESS` | `scripts/set-uri.ts`, `scripts/register-lessons.ts` | Address of the deployed `StylusForgeNFT` |
| `METADATA_BASE_URL` | `scripts/set-uri.ts` | Domain of the deployed web app only, such as `https://stylusforge.example` (https, no path, no trailing slash) |

Hardhat 3 does not load `.env` files. A variable is read from the environment first, then from the encrypted Hardhat keystore. `.env.example` only lists the names.

### Keystore

Store the values in the keystore (run from `contracts/`). The first `set` creates the keystore and asks for a password; values are typed at a hidden prompt, never on the command line:

```bash
pnpm hardhat keystore set ARBITRUM_SEPOLIA_RPC_URL
pnpm hardhat keystore set DEPLOYER_PRIVATE_KEY
pnpm hardhat keystore set CLAIM_SIGNER_ADDRESS
pnpm hardhat keystore set ETHERSCAN_API_KEY
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
| `lessons(lessonId)` | view | `(name, xp, exists)` |
| `getLessonIds()` | view | Registered lesson ids, in registration order |
| `completed(student, lessonId)` | view | Whether the student owns the certificate |
| `getCompletedLessons(student)` | view | `(lessonIds, done)`: every registered id with its completion flag |
| `getTotalXP(student)` | view | Sum of the XP of the completed lessons |
| `signer()` | view | Current claim signer |

`claim` is the only way to mint. There is no admin mint: the owner controls minting by rotating the signer with `setSigner`.

Events: `LessonAdded(lessonId, name, xp)`, `LessonCompleted(student, lessonId)`, `SignerUpdated(previousSigner, newSigner)`.

Custom errors: `InvalidLesson`, `LessonAlreadyExists`, `AlreadyCompleted`, `SoulBound`, `InvalidSigner`, `InvalidSignature`, `ClaimExpired`, plus OpenZeppelin's `OwnableUnauthorizedAccount`.

### Soul-bound rule

`_update` only lets mints through (`from == address(0)`). Every transfer and every burn reverts with `SoulBound()`. `setApprovalForAll` also reverts with `SoulBound()`, so no operator can ever be approved and `isApprovedForAll` is always `false`.

### Claim flow

1. The student completes a lesson in the web app.
2. The backend checks the code and signs an EIP-712 voucher with the claim signer key:
   - domain: `name = "StylusForge"`, `version = "1"`, `chainId`, `verifyingContract` = contract address
   - type: `Claim(address student,uint256 lessonId,uint256 deadline)`
3. The student sends `claim(lessonId, deadline, signature)` from the `student` address and pays the gas.
4. The contract rejects the claim if the deadline has passed (`ClaimExpired`), if the signature does not recover to `signer` for this caller and lesson (`InvalidSignature`), if the lesson is not registered (`InvalidLesson`) or if the certificate is already owned (`AlreadyCompleted`, which also blocks replays).

## Deployment

### Local node

With `pnpm chain` running, `pnpm deploy:local` runs `scripts/deploy-local.ts` on the built-in `localhost` network:

1. stops unless it is connected to a running node with chain id 31337 (the in-process network also uses 31337 but vanishes when the script exits);
2. deploys from Hardhat account #0, registers the available lessons and sets Hardhat account #1 as the claim signer;
3. sets the metadata URI to `http://localhost:3000/api/metadata/{id}` (the web app's metadata route under `pnpm dev`);
4. writes `apps/web/.env.development.local` (`NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`, `CLAIM_SIGNER_PRIVATE_KEY`), overwriting it on every run. It writes no other file.

Both keys are the public Hardhat test keys; no configuration variable is needed. The node keeps its state in memory, so run `pnpm deploy:local` again after restarting it. The full local workflow, including MetaMask, is in the [root README](../README.md#local-development).

### Arbitrum Sepolia

`scripts/deploy.ts`:

1. reads `CLAIM_SIGNER_ADDRESS` (environment or keystore) and stops before connecting if it is missing or invalid;
2. deploys `StylusForgeNFT` from the deployer account;
3. registers every available lesson of `curriculum/lessons.json` with its name and XP;
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

The metadata URI is not set by the script: once the web app is deployed, run `scripts/set-uri.ts` (below).

### Metadata URI

After the web app is deployed, point the certificate metadata at it from the owner account (the deployer):

```bash
pnpm hardhat keystore set NFT_CONTRACT_ADDRESS   # the deployed StylusForgeNFT address
pnpm hardhat keystore set METADATA_BASE_URL      # the domain only: https://stylusforge.example
pnpm hardhat run scripts/set-uri.ts --network arbitrumSepolia
```

**`METADATA_BASE_URL` is the web app's domain only**, such as `https://stylusforge.example`: no path, no trailing slash and no `{id}`. The script appends `/api/metadata/{id}` itself and sets the URI to `<METADATA_BASE_URL>/api/metadata/{id}`.

| Value | Result |
|---|---|
| `https://stylusforge.example` | Accepted: `https://stylusforge.example/api/metadata/{id}` |
| `https://stylusforge.example/` | Refused: trailing slash |
| `https://stylusforge.example/api/metadata/{id}` | Refused: the full URL would get the route twice |
| `https://stylusforge.example/forge` | Refused: path |

It also refuses non-https bases (http is accepted for localhost) and queries, fragments or credentials, and stops if the connected account is not the contract owner. Before sending, it prints the current and the final URI and asks for confirmation (`y`). Without an interactive terminal it sends nothing. It does nothing when the URI is already set, so it is safe to run again.

### Registering new lessons

Lessons published after the deployment are added with `addLesson`, without redeploying. Once a lesson is written and marked `"available": true` in `curriculum/lessons.json`, run from the owner account:

```bash
pnpm hardhat keystore set NFT_CONTRACT_ADDRESS   # if not set yet
pnpm register:lessons --network arbitrumSepolia
```

The script reads every registered lesson (`getLessonIds`, then `lessons(id)`), compares them with the available lessons of the curriculum (`scripts/lesson-registration.ts`) and registers the missing ones in curriculum order. It is safe to run again: it does nothing when every lesson is registered.

Registered lessons are immutable, so the script stops before sending any transaction when a registered lesson has a different name or XP in the curriculum, or is no longer an available lesson; it lists every conflict and never changes a registered lesson. It also stops if the connected account is not the contract owner.

On the local node, use `--network localhost` with `NFT_CONTRACT_ADDRESS` set to the address printed by `pnpm deploy:local`.

## Verification on Arbiscan

Verification uses `hardhat-verify` (bundled in the viem toolbox) with an [Etherscan API V2](https://docs.etherscan.io/etherscan-v2) key: one key, created at <https://etherscan.io/myapikey>, works for every Etherscan-family explorer, including Arbiscan on Arbitrum Sepolia. Store it in the keystore:

```bash
pnpm hardhat keystore set ETHERSCAN_API_KEY
```

After deploying, verify with the address printed by the script (the constructor takes no arguments):

```bash
pnpm hardhat verify etherscan --network arbitrumSepolia <CONTRACT_ADDRESS>
```

`pnpm hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>` also submits to Sourcify and Blockscout.

`verify` compiles with the `production` build profile, while `hardhat run` deploys with the `default` one. With the compiler settings in `hardhat.config.ts` both profiles produce the same bytecode, so a contract deployed by `scripts/deploy.ts` verifies as is. If you change the profiles, deploy with `--build-profile production`.

## Deployments

### Arbitrum Sepolia (421614)

| | |
|---|---|
| `StylusForgeNFT` | [`0xf7f027a6af8d2f99a9b8f466983f4515522daa8d`](https://sepolia.arbiscan.io/address/0xf7f027a6af8d2f99a9b8f466983f4515522daa8d#code) (source verified on Arbiscan) |
| Owner | `0x6815FF8b05dfBf916a528E24494bB8d851Ee0A03` |
| Claim signer | `0x96cecfC59220e6FC83d213Ad3ba806d5868Bb4e0` |
| Metadata URI | `https://stylusforge-drab.vercel.app/api/metadata/{id}` |
| Registered lessons | 1 to 4 |
| Web app | <https://stylusforge-drab.vercel.app> |

Lessons added later (6 to 8 for module 1) are registered with `pnpm register:lessons --network arbitrumSepolia` once the web app that serves them is deployed ([Registering new lessons](#registering-new-lessons)). Check the registry with `lessons(id)` on Arbiscan's "Read Contract" tab.
