import type { Address, Hex, LocalAccount } from 'viem';

/** How long a voucher stays valid. Long enough to confirm in a wallet, short enough to expire unused. */
export const CLAIM_VOUCHER_TTL_SECONDS = 15 * 60;

/** EIP-712 types of a claim voucher; must match CLAIM_TYPEHASH in StylusForgeNFT. */
export const CLAIM_TYPES = {
  Claim: [
    { name: 'student', type: 'address' },
    { name: 'lessonId', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export function claimDomain(chainId: number, verifyingContract: Address) {
  return { name: 'StylusForge', version: '1', chainId, verifyingContract } as const;
}

/** Body of a successful POST /api/claim (uint256 values as decimal strings). */
export interface ClaimResponse {
  lessonId: string;
  deadline: string;
  signature: Hex;
}

/** Body of a refused POST /api/claim. */
export interface ClaimErrorResponse {
  error: string;
  /** Objectives the submitted code does not meet yet (422 only). */
  objectives?: string[];
}

export interface ClaimVoucher {
  lessonId: bigint;
  deadline: bigint;
  signature: Hex;
}

/** Signs the voucher that lets `student` claim the certificate of `lessonId` until `deadline`. */
export async function signClaimVoucher(
  signer: LocalAccount,
  { chainId, verifyingContract, student, lessonId, deadline }: {
    chainId: number;
    verifyingContract: Address;
    student: Address;
    lessonId: bigint;
    deadline: bigint;
  },
): Promise<ClaimVoucher> {
  const signature = await signer.signTypedData({
    domain: claimDomain(chainId, verifyingContract),
    types: CLAIM_TYPES,
    primaryType: 'Claim',
    message: { student, lessonId, deadline },
  });
  return { lessonId, deadline, signature };
}
