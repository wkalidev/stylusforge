import { getAddress, isAddress } from 'viem';
import { CLAIM_VOUCHER_TTL_SECONDS, signClaimVoucher, type ClaimResponse } from '@/lib/claim';
import { chain } from '@/lib/chain';
import { nftContractAddress } from '@/lib/contract';
import { LESSONS } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { getClaimSigner } from '@/lib/server/claimSigner';
import { errorResponse as error, MAX_BODY_BYTES, MAX_CODE_LENGTH } from '@/lib/server/codeSubmission';
import { readJsonBody } from '@/lib/server/jsonBody';

/** Validating and signing take milliseconds; a longer run is cut off instead of billed (#138). */
export const maxDuration = 10;

/** Every answer is specific to one request, and a voucher must never be served from a cache. */
const NO_STORE = { 'cache-control': 'no-store' };

/**
 * Issues a claim voucher: { address, lessonId, code } → { lessonId, deadline, signature }.
 * The code is validated again here; the browser's verdict is never trusted.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) {
    return body.reason === 'too-large'
      ? error(413, 'The request body is too large.')
      : error(400, 'The request body must be JSON: { address, lessonId, code }.');
  }
  const { address, lessonId, code } = (body.value ?? {}) as Record<string, unknown>;

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
    return error(422, 'The code does not pass the lesson checks yet.', result.objectives);
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

  return Response.json(
    {
      lessonId: voucher.lessonId.toString(),
      deadline: voucher.deadline.toString(),
      signature: voucher.signature,
    } satisfies ClaimResponse,
    { headers: NO_STORE },
  );
}
