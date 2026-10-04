import { certificateLesson, certificateMetadata, parseTokenId } from '@/lib/certificate/metadata';

/**
 * ERC-1155 metadata of a lesson certificate. The contract URI is `<origin>/api/metadata/{id}`;
 * both the decimal id and the 64-hex-digit {id} substitution are accepted.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = parseTokenId(id);
  const lesson = tokenId === null ? null : certificateLesson(tokenId);
  if (!lesson) {
    return Response.json({ error: `No certificate with id ${id}.` }, { status: 404 });
  }
  return Response.json(certificateMetadata(lesson, new URL(request.url).origin), {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
