import { certificateLesson, parseTokenId } from '@/lib/certificate/metadata';
import { certificateSvg } from '@/lib/certificate/svg';
import { chain } from '@/lib/chain';

/** The SVG image of a lesson certificate, referenced by its metadata. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = parseTokenId(id);
  const lesson = tokenId === null ? null : certificateLesson(tokenId);
  if (!lesson) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(certificateSvg(lesson, chain.name), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
