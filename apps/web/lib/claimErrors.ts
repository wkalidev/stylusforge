import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem';

/** Raised by the claim button when /api/claim refuses to issue a voucher. */
export class VoucherRequestError extends Error {
  constructor(
    message: string,
    /** Objectives the code does not meet yet, when the server refused it. */
    readonly objectives: string[] = [],
  ) {
    super(message);
    this.name = 'VoucherRequestError';
  }
}

const REVERT_MESSAGES: Record<string, string> = {
  AlreadyCompleted: 'This certificate is already on-chain for this wallet.',
  ClaimExpired: 'The voucher expired before the transaction was sent. Claim again to get a new one.',
  InvalidSignature: 'The contract rejected the voucher: it was not signed by the current claim signer.',
  InvalidLesson: 'This lesson is not registered on the contract.',
};

/** A message the student can act on, for any error of the claim flow. */
export function describeClaimError(error: unknown): string {
  if (error instanceof VoucherRequestError) {
    return error.message;
  }
  if (error instanceof BaseError) {
    if (error.walk((cause) => cause instanceof UserRejectedRequestError)) {
      return 'The transaction was rejected in the wallet. Nothing was sent.';
    }
    const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && REVERT_MESSAGES[name]) {
        return REVERT_MESSAGES[name];
      }
    }
    return error.shortMessage;
  }
  if (error instanceof TypeError) {
    return 'The claim server could not be reached. Check your connection and try again.';
  }
  return 'Something went wrong while claiming. Try again.';
}
