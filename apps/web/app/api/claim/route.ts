import { getAddress, isAddress } from 'viem';
import { CLAIM_VOUCHER_TTL_SECONDS, signClaimVoucher } from '@/lib/claim';
import { chain } from '@/lib/chain';
import { nftContractAddress } from '@/lib/contract';
import { LESSONS } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { getClaimSigner } from '@/lib/server/claimSigner';

/** Larger than any lesson solution by far; rejects abusive payloads before validation. */
const MAX_CODE_LENGTH = 50_000;

export interface ClaimResponse {
  lessonId: string;
  deadline: string;
  signature: `0x${string}`;
}

export interface ClaimErrorResponse {
  error: string;
  hints?: string[];
}

function error(status: number, message: string, hints?: string[]) {
  return Response.json({ error: message, ...(hints ? { hints } : {}) } satisfies ClaimErrorResponse, { status });
}

/**
 * Issues a claim voucher: { address, lessonId, code } → { lessonId, deadline, signature }.
 * The code is validated again here; the browser's verdict is never trusted.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, 'The request body must be JSON: { address, lessonId, code }.');
  }
  const { address, lessonId, code } = (body ?? {}) as Record<string, unknown>;

  if (typeof address !== 'string' || !isAddress(address)) {
    return error(400, 'address must be a valid Ethereum address.');
  }
  if (typeof lessonId !== 'number' || !Number.isSafeInteger(lessonId)) {
    return error(400, 'lessonId must be an integer.');
  }
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
    return error(400, `code must be a string of at most ${MAX_CODE_LENGTH} characters.`);
  }

  const lesson = LESSONS.find((candidate) => candidate.id === lessonId);
  if (!lesson?.available) {
    return error(404, `Lesson ${lessonId} does not exist or is not available yet.`);
  }

  const result = validateCode(code, lesson.exercise.checks);
  if (!result.passed) {
    return error(422, 'The code does not pass the lesson checks yet.', result.hints);
  }

  const signer = getClaimSigner();
  if (!nftContractAddress || !signer) {
    return error(503, 'Certificate claiming is not configured on this server.');
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + CLAIM_VOUCHER_TTL_SECONDS);
  const voucher = await signClaimVoucher(signer, {
    chainId: chain.id,
    verifyingContract: nftContractAddress,
    student: getAddress(address),
    lessonId: BigInt(lessonId),
    deadline,
  });

  return Response.json({
    lessonId: voucher.lessonId.toString(),
    deadline: voucher.deadline.toString(),
    signature: voucher.signature,
  } satisfies ClaimResponse);
}
