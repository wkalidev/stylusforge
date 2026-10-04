/** Body of a successful POST /api/solution. */
export interface SolutionResponse {
  lessonId: number;
  solution: string;
}

/** Body of a refused POST /api/solution. */
export interface SolutionErrorResponse {
  error: string;
  /** Objectives the submitted code does not meet yet (422 only). */
  objectives?: string[];
}

/**
 * Asks the server for a lesson's reference solution, sending the student's code as proof of the
 * pass. Resolves to the solution, or throws an Error with the server's message.
 */
export async function fetchReferenceSolution(lessonId: number, code: string): Promise<string> {
  const response = await fetch('/api/solution', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lessonId, code }),
  });
  const body = (await response.json()) as SolutionResponse | SolutionErrorResponse;
  if (!response.ok || 'error' in body) {
    throw new Error('error' in body ? body.error : 'The reference solution could not be loaded.');
  }
  return body.solution;
}
