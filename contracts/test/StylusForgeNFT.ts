import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import type { Address, Hex, LocalAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const LESSONS = [
  { id: 1n, name: "Hello World Stylus", xp: 100n },
  { id: 2n, name: "Storage and State", xp: 150n },
  { id: 3n, name: "Events and Errors", xp: 200n },
  { id: 4n, name: "ERC-20 Token", xp: 300n },
];

describe("StylusForgeNFT", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [owner, alice] = await viem.getWalletClients();
  const chainId = await publicClient.getChainId();

  async function deployFixture() {
    const nft = await viem.deployContract("StylusForgeNFT");
    for (const lesson of LESSONS) {
      await nft.write.addLesson([lesson.id, lesson.name, lesson.xp]);
    }
    const claimSigner = privateKeyToAccount(generatePrivateKey());
    await nft.write.setSigner([claimSigner.address]);
    return { nft, claimSigner };
  }

  function signClaim(
    signer: LocalAccount,
    verifyingContract: Address,
    student: Address,
    lessonId: bigint,
    deadline: bigint,
  ): Promise<Hex> {
    return signer.signTypedData({
      domain: { name: "StylusForge", version: "1", chainId, verifyingContract },
      types: {
        Claim: [
          { name: "student", type: "address" },
          { name: "lessonId", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: "Claim",
      message: { student, lessonId, deadline },
    });
  }

  async function deadlineIn(seconds: number): Promise<bigint> {
    return BigInt((await networkHelpers.time.latest()) + seconds);
  }

  describe("claim", function () {
    it("mints the certificate for a valid voucher", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const student = alice.account.address;
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, student, 1n, deadline);

      await viem.assertions.emitWithArgs(
        nft.write.claim([1n, deadline, signature], { account: alice.account }),
        nft,
        "LessonCompleted",
        [student, 1n],
      );

      assert.equal(await nft.read.balanceOf([student, 1n]), 1n);
      assert.equal(await nft.read.completed([student, 1n]), true);
      assert.equal(await nft.read.balanceOf([owner.account.address, 1n]), 0n);
    });
  });
});
