import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import type { Address, Hex, LocalAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { loadLessons } from "../scripts/lessons.js";

const LESSONS = loadLessons();
const LESSON_IDS = LESSONS.map((lesson) => lesson.id);
const [FIRST, SECOND] = LESSONS;
const LAST = LESSONS[LESSONS.length - 1];
const UNREGISTERED_ID = LESSON_IDS.reduce((max, id) => (id > max ? id : max)) + 1n;

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
      const signature = await signClaim(claimSigner, nft.address, student, FIRST.id, deadline);

      await viem.assertions.emitWithArgs(
        nft.write.claim([FIRST.id, deadline, signature], { account: alice.account }),
        nft,
        "LessonCompleted",
        [student, FIRST.id],
      );

      assert.equal(await nft.read.balanceOf([student, FIRST.id]), 1n);
      assert.equal(await nft.read.completed([student, FIRST.id]), true);
      assert.equal(await nft.read.balanceOf([owner.account.address, FIRST.id]), 0n);
    });

    it("rejects a voucher signed by another key", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);
      const impostor = privateKeyToAccount(generatePrivateKey());
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(impostor, nft.address, alice.account.address, FIRST.id, deadline);

      await viem.assertions.revertWithCustomError(
        nft.write.claim([FIRST.id, deadline, signature], { account: alice.account }),
        nft,
        "InvalidSignature",
      );
    });

    it("rejects a voucher issued to another student", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, owner.account.address, FIRST.id, deadline);

      await viem.assertions.revertWithCustomError(
        nft.write.claim([FIRST.id, deadline, signature], { account: alice.account }),
        nft,
        "InvalidSignature",
      );
    });

    it("rejects a voucher for a different lesson", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, FIRST.id, deadline);

      await viem.assertions.revertWithCustomError(
        nft.write.claim([SECOND.id, deadline, signature], { account: alice.account }),
        nft,
        "InvalidSignature",
      );
    });

    it("rejects a voucher after its deadline", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(60);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, FIRST.id, deadline);
      await networkHelpers.time.increaseTo(deadline + 1n);

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.claim([FIRST.id, deadline, signature], { account: alice.account }),
        nft,
        "ClaimExpired",
        [deadline],
      );
    });

    it("rejects a voucher for an unregistered lesson", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, UNREGISTERED_ID, deadline);

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.claim([UNREGISTERED_ID, deadline, signature], { account: alice.account }),
        nft,
        "InvalidLesson",
        [UNREGISTERED_ID],
      );
    });

    it("rejects replaying a voucher that was already used", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const student = alice.account.address;
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, student, FIRST.id, deadline);
      await nft.write.claim([FIRST.id, deadline, signature], { account: alice.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.claim([FIRST.id, deadline, signature], { account: alice.account }),
        nft,
        "AlreadyCompleted",
        [student, FIRST.id],
      );
      assert.equal(await nft.read.balanceOf([student, FIRST.id]), 1n);
    });
  });

  describe("soul-bound", function () {
    async function claimedFixture() {
      const { nft, claimSigner } = await deployFixture();
      const deadline = await deadlineIn(3600);
      const signature = await signClaim(claimSigner, nft.address, alice.account.address, FIRST.id, deadline);
      await nft.write.claim([FIRST.id, deadline, signature], { account: alice.account });
      return { nft };
    }

    it("rejects safeTransferFrom", async function () {
      const { nft } = await networkHelpers.loadFixture(claimedFixture);

      await viem.assertions.revertWithCustomError(
        nft.write.safeTransferFrom(
          [alice.account.address, owner.account.address, FIRST.id, 1n, "0x"],
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
          [alice.account.address, owner.account.address, [FIRST.id], [1n], "0x"],
          { account: alice.account },
        ),
        nft,
        "SoulBound",
      );
    });

    it("rejects setApprovalForAll", async function () {
      const { nft } = await networkHelpers.loadFixture(claimedFixture);

      await viem.assertions.revertWithCustomError(
        nft.write.setApprovalForAll([owner.account.address, true], { account: alice.account }),
        nft,
        "SoulBound",
      );
      assert.equal(await nft.read.isApprovedForAll([alice.account.address, owner.account.address]), false);
    });
  });

  describe("owner-only functions", function () {
    it("restricts addLesson, setSigner and setURI to the owner", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);
      const asAlice = { account: alice.account };
      const notOwner: [Address] = [alice.account.address];

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.addLesson([UNREGISTERED_ID, "DeFi Interaction", 500n], asAlice),
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
    });

    it("registers lessons and rejects duplicate or zero ids", async function () {
      const { nft } = await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.emitWithArgs(
        nft.write.addLesson([UNREGISTERED_ID, "DeFi Interaction", 500n]),
        nft,
        "LessonAdded",
        [UNREGISTERED_ID, "DeFi Interaction", 500n],
      );
      assert.deepEqual(await nft.read.getLessonIds(), [...LESSON_IDS, UNREGISTERED_ID]);
      assert.deepEqual(await nft.read.lessons([UNREGISTERED_ID]), ["DeFi Interaction", 500n, true]);

      await viem.assertions.revertWithCustomErrorWithArgs(
        nft.write.addLesson([FIRST.id, "Duplicate", 1n]),
        nft,
        "LessonAlreadyExists",
        [FIRST.id],
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

      assert.equal(await nft.read.uri([FIRST.id]), uri);
    });
  });

  describe("progress views", function () {
    it("reports completed lessons and the XP total from the registry", async function () {
      const { nft, claimSigner } = await networkHelpers.loadFixture(deployFixture);
      const student = alice.account.address;
      const deadline = await deadlineIn(3600);

      assert.equal(await nft.read.getTotalXP([student]), 0n);

      for (const lessonId of [FIRST.id, LAST.id]) {
        const signature = await signClaim(claimSigner, nft.address, student, lessonId, deadline);
        await nft.write.claim([lessonId, deadline, signature], { account: alice.account });
      }

      assert.deepEqual(await nft.read.getCompletedLessons([student]), [
        LESSON_IDS,
        LESSON_IDS.map((id) => id === FIRST.id || id === LAST.id),
      ]);
      assert.equal(await nft.read.getTotalXP([student]), FIRST.xp + LAST.xp);
    });
  });
});
