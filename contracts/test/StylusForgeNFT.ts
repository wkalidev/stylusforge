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

    it("rejects a voucher signed by another key", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);
      const impostor = privateKeyToAccount(generatePrivateKey());
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(impostor, nft.address, alice.account.address, 1n, deadline);

      await viem.assertions.revertWithCustomError(
        nft.write.claim([1n, deadline, signature], { account: alice.account }),
        nft,
        "InvalidSignature",
      );
    });

    it("rejects a voucher issued to another student", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, owner.account.address, 1n, deadline);

      await viem.assertions.revertWithCustomError(
        nft.write.claim([1n, deadline, signature], { account: alice.account }),
        nft,
        "InvalidSignature",
      );
    });

    it("rejects a voucher for a different lesson", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, 1n, deadline);

      await viem.assertions.revertWithCustomError(
        nft.write.claim([2n, deadline, signature], { account: alice.account }),
        nft,
        "InvalidSignature",
      );
    });

    it("rejects a voucher after its deadline", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(60);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, 1n, deadline);
      await networkHelpers.time.increaseTo(deadline + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.claim([1n, deadline, signature], { account: alice.account }),
        nft,
        "ClaimExpired",
        [deadline],
      );
    });

    it("rejects replaying a voucher that was already used", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const student = alice.account.address;
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, student, 1n, deadline);
      await nft.write.claim([1n, deadline, signature], { account: alice.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.claim([1n, deadline, signature], { account: alice.account }),
        nft,
        "AlreadyCompleted",
        [student, 1n],
      );
      assert.equal(await nft.read.balanceOf([student, 1n]), 1n);
    });
  });

  describe("soul-bound", function () {
    async function claimedFixture() {
      const { nft, claimSigner } = await deployFixture();
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, 1n, deadline);
      await nft.write.claim([1n, deadline, signature], { account: alice.account });
      return { nft };
    }

    it("rejects safeTransferFrom", async function () {
      const { nft } = await networkHelpers.loadFixture(claimedFixture);

      await viem.assertions.revertWithCustomError(
        nft.write.safeTransferFrom(
          [alice.account.address, owner.account.address, 1n, 1n, "0x"],
          { account: alice.account },
        ),
        nft,
        "SoulBound",
      );
    });

    it("rejects safeBatchTransferFrom", async function () {
      const { nft } = await networkHelpers.loadFixture(claimedFixture);

      await viem.assertions.revertWithCustomError(
        nft.write.safeBatchTransferFrom(
          [alice.account.address, owner.account.address, [1n], [1n], "0x"],
          { account: alice.account },
        ),
        nft,
        "SoulBound",
      );
    });

    it("rejects transfers by an approved operator", async function () {
      const { nft } = await networkHelpers.loadFixture(claimedFixture);
      await nft.write.setApprovalForAll([owner.account.address, true], { account: alice.account });

      await viem.assertions.revertWithCustomError(
        nft.write.safeTransferFrom([alice.account.address, owner.account.address, 1n, 1n, "0x"]),
        nft,
        "SoulBound",
      );
      assert.equal(await nft.read.balanceOf([alice.account.address, 1n]), 1n);
    });
  });

  describe("owner-only functions", function () {
    it("restricts addLesson, setSigner, setURI and mintCertificate to the owner", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);
      const asAlice = { account: alice.account };
      const notOwner: [Address] = [alice.account.address];

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.addLesson([5n, "DeFi Interaction", 500n], asAlice),
        nft,
        "OwnableUnauthorizedAccount",
        notOwner,
      );
      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.setSigner([alice.account.address], asAlice),
        nft,
        "OwnableUnauthorizedAccount",
        notOwner,
      );
      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.setURI(["https://example.com/{id}.json"], asAlice),
        nft,
        "OwnableUnauthorizedAccount",
        notOwner,
      );
      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.mintCertificate([alice.account.address, 1n], asAlice),
        nft,
        "OwnableUnauthorizedAccount",
        notOwner,
      );
    });

    it("registers lessons and rejects duplicate or zero ids", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.emitWithArgs(
        nft.write.addLesson([5n, "DeFi Interaction", 500n]),
        nft,
        "LessonAdded",
        [5n, "DeFi Interaction", 500n],
      );
      assert.deepEqual(await nft.read.getLessonIds(), [1n, 2n, 3n, 4n, 5n]);
      assert.deepEqual(await nft.read.lessons([5n]), ["DeFi Interaction", 500n, true]);

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.addLesson([1n, "Duplicate", 1n]),
        nft,
        "LessonAlreadyExists",
        [1n],
      );
      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.addLesson([0n, "Zero", 1n]),
        nft,
        "InvalidLesson",
        [0n],
      );
    });

    it("updates the signer and rejects the zero address", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const next = privateKeyToAccount(generatePrivateKey());

      await viem.assertions.emitWithArgs(
        nft.write.setSigner([next.address]),
        nft,
        "SignerUpdated",
        [claimSigner.address, next.address],
      );
      assert.equal(await nft.read.signer(), next.address);

      await viem.assertions.revertWithCustomError(
        nft.write.setSigner(["0x0000000000000000000000000000000000000000"]),
        nft,
        "InvalidSigner",
      );
    });

    it("sets the metadata URI", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);
      const uri = "https://stylusforge.example/api/metadata/{id}";

      await nft.write.setURI([uri]);

      assert.equal(await nft.read.uri([1n]), uri);
    });

    it("lets the owner mint a certificate directly", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);

      await nft.write.mintCertificate([alice.account.address, 2n]);

      assert.equal(await nft.read.balanceOf([alice.account.address, 2n]), 1n);
      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.mintCertificate([alice.account.address, 99n]),
        nft,
        "InvalidLesson",
        [99n],
      );
    });
  });

  describe("progress views", function () {
    it("reports completed lessons and the XP total from the registry", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const student = alice.account.address;
      const deadline = await deadlineIn(3600);

      assert.equal(await nft.read.getTotalXP([student]), 0n);

      for (const lessonId of [1n, 3n]) {
        const signature = await signClaim(claimSigner, nft.address, student, lessonId, deadline);
        await nft.write.claim([lessonId, deadline, signature], { account: alice.account });
      }

      assert.deepEqual(await nft.read.getCompletedLessons([student]), [
        [1n, 2n, 3n, 4n],
        [true, false, true, false],
      ]);
      assert.equal(await nft.read.getTotalXP([student]), 100n + 200n);
    });
  });
});
