import type { ClaimErrorResponse } from '@/lib/claim';
import type { SolutionErrorResponse } from '@/lib/curriculum/reference';

/** Longest code /api/claim and /api/solution accept, in UTF-16 units: larger than any lesson solution by far. */
export const MAX_CODE_LENGTH = 50_000;

/**
 * Body size limit of both routes, checked before parsing. Room for the longest accepted code once
 * encoded as JSON: a UTF-16 unit takes at most 3 bytes in UTF-8, and an escaped quote or newline 2.
 */
export const MAX_BODY_BYTES = 4 * MAX_CODE_LENGTH;

/**
 * A refused request: `{ error, objectives? }`, never cached, since every answer is specific to one
 * request and a voucher must never be served from a cache.
 */
export function errorResponse(status: number, message: string, objectives?: string[]): Response {
  return Response.json(
    { error: message, ...(objectives ? { objectives } : {}) } satisfies ClaimErrorResponse & SolutionErrorResponse,
    { status, headers: { 'cache-control': 'no-store' } },
  );
}
