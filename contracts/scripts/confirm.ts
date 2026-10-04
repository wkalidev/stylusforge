import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

/** Whether an answer confirms: "y" or "yes", in any case. Anything else, empty included, is a no. */
export function isYes(answer: string): boolean {
  return /^(y|yes)$/i.test(answer.trim());
}

/**
 * Asks a yes/no question before an on-chain transaction and resolves true only on "y" or "yes".
 * Without an interactive terminal nobody can answer, so it resolves false without asking.
 */
export async function confirm(
  question: string,
  input: Readable & { isTTY?: boolean } = process.stdin,
  output: Writable = process.stdout,
): Promise<boolean> {
  if (!input.isTTY) {
    return false;
  }
  const prompt = createInterface({ input, output });
  try {
    return isYes(await prompt.question(`${question} [y/N] `));
  } finally {
    prompt.close();
  }
}
