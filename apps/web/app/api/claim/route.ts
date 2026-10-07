import { getAddress, isAddress } from 'viem';
import { CLAIM_VOUCHER_TTL_SECONDS, signClaimVoucher, type ClaimErrorResponse, type ClaimResponse } from '@/lib/claim';
import { chain } from '@/lib/chain';
import { nftContractAddress } from '@/lib/contract';
import { LESSONS } from '@/lib/curriculum/lessons';
import { validateCode } from '@/lib/curriculum/validate';
import { getClaimSigner } from '@/lib/server/claimSigner';
import { readJsonBody } from '@/lib/server/jsonBody';

/** Larger than any lesson solution by far; rejects abusive payloads before validation. */
const MAX_CODE_LENGTH = 50_000;

/**
 * Body size limit, checked before parsing. Room for the longest accepted code once encoded as
 * JSON: a UTF-16 unit takes at most 3 bytes in UTF-8, and an escaped quote or newline 2.
 */
const MAX_BODY_BYTES = 4 * MAX_CODE_LENGTH;

/** Every answer is specific to one request, and a voucher must never be served from a cache. */
const NO_STORE = { 'cache-control': 'no-store' };

function error(status: number, message: string, objectives?: string[]) {
  return Response.json({ error: message, ...(objectives ? { objectives } : {}) } satisfies ClaimErrorResponse, {
    status,
    headers: NO_STORE,
  });
}

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
