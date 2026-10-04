import { LESSONS } from '@/lib/curriculum/lessons';
import type { SolutionResponse } from '@/lib/curriculum/reference';
import { SOLUTIONS } from '@/lib/curriculum/solutions';
import { validateCode } from '@/lib/curriculum/validate';

const MAX_CODE_LENGTH = 50_000;

function error(status: number, message: string, hints?: string[]) {
  return Response.json({ error: message, ...(hints ? { hints } : {}) }, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * Returns a lesson's reference solution to a student who has passed it. The server cannot see
 * the browser's progress, so the request proves the pass: the submitted code must pass the
 * lesson checks, run again here.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, 'The request body must be JSON: { lessonId, code }.');
  }
  const { lessonId, code } = (body ?? {}) as Record<string, unknown>;
  if (typeof lessonId !== 'number' || !Number.isSafeInteger(lessonId)) {
    return error(400, 'lessonId must be an integer.');
  }
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
    return error(400, `code must be a string of at most ${MAX_CODE_LENGTH} characters.`);
  }

  const lesson = LESSONS.find((candidate) => candidate.id === lessonId);
  const solution = SOLUTIONS[lessonId];
  if (!lesson?.available || !solution) {
    return error(404, `Lesson ${lessonId} does not exist or is not available yet.`);
  }

  const result = validateCode(code, lesson.exercise.checks);
  if (!result.passed) {
    return error(422, 'Pass the lesson checks to compare with the reference solution.', result.hints);
  }

  return Response.json({ lessonId, solution } satisfies SolutionResponse, { headers: { 'cache-control': 'no-store' } });
}
