import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, UserRejectedRequestError } from 'viem';

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

/** What the claim button shows for an error: a message to act on and, if any, the raw error. */
export interface ClaimErrorView {
  message: string;
  /** The raw error, for a collapsible details section; null when the message says it all. */
  details: string | null;
}

const REVERT_MESSAGES: Record<string, string> = {
  AlreadyCompleted: 'This certificate is already on-chain for this wallet.',
  ClaimExpired: 'The voucher expired before the transaction was sent. Claim again to get a new one.',
  InvalidSignature: 'The contract rejected the voucher: it was not signed by the current claim signer.',
  InvalidLesson: 'This lesson is not registered on the contract.',
};

export const CLAIM_ERROR_MESSAGES = {
  rejected: 'Transaction rejected in your wallet. Nothing was sent.',
  fee: 'Network fee changed, please try again.',
  funds: 'Insufficient funds for gas. Add ETH on this network to the wallet, then try again.',
  refused: 'The wallet or the network refused the transaction, so nothing was claimed. See the details below.',
  offline: 'The claim server could not be reached. Check your connection and try again.',
  unknown: 'Something went wrong while claiming. Try again.',
} as const;

const FEE_PATTERN =
  /max fee per gas less than block base fee|fee cap less than block base fee|maxFeePerGas .*less than .*base ?fee|transaction underpriced|fee too low/i;
const FUNDS_PATTERN = /insufficient funds/i;
const REJECTED_PATTERN = /user (rejected|denied)/i;

/**
 * Every error of the cause chain, the raw wallet error included. Wallets report most failures as
 * JSON-RPC -32603 with the real reason in `data.message`, and viem turns any -32603 from a
 * contract write into "The contract function ... reverted", so the top-level message cannot be
 * trusted: the reason is read along the whole chain.
 */
function causeChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  while (current !== null && current !== undefined && !chain.includes(current) && chain.length < 20) {
    chain.push(current);
    current = (current as { cause?: unknown }).cause;
  }
  return chain;
}

/** The messages of an error chain: messages, details and the wallet's `data.message`. */
function chainTexts(chain: unknown[]): string[] {
  return chain.flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    if (typeof entry !== 'object' || entry === null) return [];
    const { message, shortMessage, details, data } = entry as Record<string, unknown>;
    const nested = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).message : undefined;
    return [message, shortMessage, details, nested].filter((text): text is string => typeof text === 'string');
  });
}

function rawDetails(error: unknown, chain: unknown[]): string {
  const root = chain.at(-1);
  const top = error instanceof Error ? error.message : String(error);
  if (root === error || root instanceof Error || typeof root !== 'object' || root === null) {
    return top;
  }
  const json = JSON.stringify(root, (_key, value: unknown) => (typeof value === 'bigint' ? value.toString() : value), 2);
  return `${top}\n\nWallet error:\n${json}`;
}

/** A message the student can act on, and the raw error behind it, for any error of the claim flow. */
export function describeClaimError(error: unknown): ClaimErrorView {
  if (error instanceof VoucherRequestError) {
    return { message: error.message, details: null };
  }
  const chain = causeChain(error);
  const texts = chainTexts(chain);
  const details = rawDetails(error, chain);
  const has = (pattern: RegExp) => texts.some((text) => pattern.test(text));
  const codes = chain.map((entry) => (entry as { code?: unknown })?.code);

  if (chain.some((entry) => entry instanceof UserRejectedRequestError) || codes.includes(4001) || has(REJECTED_PATTERN)) {
    return { message: CLAIM_ERROR_MESSAGES.rejected, details: null };
  }
  const reverted = chain.find((entry): entry is ContractFunctionRevertedError => entry instanceof ContractFunctionRevertedError);
  const name = reverted?.data?.errorName;
  if (name && REVERT_MESSAGES[name]) {
    return { message: REVERT_MESSAGES[name], details };
  }
  if (has(FEE_PATTERN)) {
    return { message: CLAIM_ERROR_MESSAGES.fee, details };
  }
  if (chain.some((entry) => entry instanceof InsufficientFundsError) || has(FUNDS_PATTERN)) {
    return { message: CLAIM_ERROR_MESSAGES.funds, details };
  }
  // A "revert" without revert data is a wallet or RPC refusal relabelled by viem, not a revert.
  if (reverted && !reverted.raw) {
    return { message: CLAIM_ERROR_MESSAGES.refused, details };
  }
  if (error instanceof BaseError) {
    return { message: error.shortMessage, details };
  }
  if (error instanceof TypeError) {
    return { message: CLAIM_ERROR_MESSAGES.offline, details };
  }
  return { message: CLAIM_ERROR_MESSAGES.unknown, details };
}
