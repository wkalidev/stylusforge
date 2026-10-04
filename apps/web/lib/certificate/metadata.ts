import { LESSONS, type Lesson } from '@/lib/curriculum/lessons';

/**
 * Parses a token id from a metadata URL. ERC-1155 clients replace `{id}` with the id as 64
 * lowercase hex digits; the decimal form is accepted too. Returns null for anything else.
 */
export function parseTokenId(raw: string): number | null {
  let id: bigint;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    id = BigInt(`0x${raw}`);
  } else if (/^[0-9]{1,15}$/.test(raw)) {
    id = BigInt(raw);
  } else {
    return null;
  }
  return id > 0n && id <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(id) : null;
}

/** The available lesson a certificate token id stands for, or null. */
export function certificateLesson(tokenId: number): Extract<Lesson, { available: true }> | null {
  const lesson = LESSONS.find((candidate) => candidate.id === tokenId);
  return lesson?.available ? lesson : null;
}

export interface CertificateMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: { trait_type: string; value: string | number; display_type?: 'number' }[];
}

/** ERC-1155 metadata JSON of a lesson certificate; URLs are absolute, based on `origin`. */
export function certificateMetadata(lesson: Lesson, origin: string): CertificateMetadata {
  return {
    name: `StylusForge certificate: ${lesson.title}`,
    description:
      `Awarded for completing the StylusForge lesson "${lesson.title}", an exercise in writing ` +
      'Arbitrum Stylus smart contracts in Rust. Soul-bound: it cannot be transferred.',
    image: `${origin}/api/metadata/${lesson.id}/image`,
    external_url: `${origin}/learn/${lesson.slug}`,
    attributes: [
      { trait_type: 'Lesson', value: lesson.id, display_type: 'number' },
      { trait_type: 'XP', value: lesson.xp, display_type: 'number' },
      { trait_type: 'Difficulty', value: lesson.difficulty },
      { trait_type: 'Transferable', value: 'No' },
    ],
  };
}
