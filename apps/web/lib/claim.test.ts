import { encodeAbiParameters, hashStruct, keccak256, recoverTypedDataAddress, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import { CLAIM_TYPES, claimDomain, signClaimVoucher } from "./claim";

const contract = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const student = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

describe("signClaimVoucher", () => {
  it("produces a signature that recovers to the signer", async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const voucher = await signClaimVoucher(signer, {
      chainId: 31337,
      verifyingContract: contract,
      student,
      lessonId: 1n,
      deadline: 1_900_000_000n,
    });

    const recovered = await recoverTypedDataAddress({
      domain: claimDomain(31337, contract),
      types: CLAIM_TYPES,
      primaryType: "Claim",
      message: { student, lessonId: 1n, deadline: 1_900_000_000n },
      signature: voucher.signature,
    });
    expect(recovered).toBe(signer.address);
    expect(voucher).toMatchObject({ lessonId: 1n, deadline: 1_900_000_000n });
  });

  it("hashes the voucher exactly like the contract", () => {
    // StylusForgeNFT: keccak256(abi.encode(CLAIM_TYPEHASH, msg.sender, lessonId, deadline))
    const typehash = keccak256(toHex("Claim(address student,uint256 lessonId,uint256 deadline)"));
    const expected = keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }],
        [typehash, student, 4n, 123n],
      ),
    );
    const actual = hashStruct({
      types: CLAIM_TYPES,
      primaryType: "Claim",
      data: { student, lessonId: 4n, deadline: 123n },
    });
    expect(actual).toBe(expected);
  });
});
