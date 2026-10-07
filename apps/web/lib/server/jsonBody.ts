/** The outcome of reading a JSON request body: the parsed value, or why it was refused. */
export type JsonBody = { ok: true; value: unknown } | { ok: false; reason: 'too-large' | 'invalid' };

/**
 * Reads and parses a JSON request body of at most `maxBytes`, without buffering more than that.
 * A declared content-length over the limit is refused before anything is read; a body without
 * one (chunked) or with a wrong one is counted while it streams and dropped as soon as it goes
 * over. A malformed content-length or body is `invalid`.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBody> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    if (!/^\d+$/.test(declared.trim())) {
      return { ok: false, reason: 'invalid' };
    }
    if (Number(declared) > maxBytes) {
      return { ok: false, reason: 'too-large' };
    }
  }
  if (!request.body) {
    return { ok: false, reason: 'invalid' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: 'too-large' };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
