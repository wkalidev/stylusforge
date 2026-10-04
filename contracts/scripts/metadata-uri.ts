/**
 * The ERC-1155 metadata URI served by the web app: `<origin>/api/metadata/{id}`. Clients replace
 * `{id}` with the token id. The base must be an https origin (http is accepted for localhost).
 */
export function metadataUri(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`METADATA_BASE_URL is not a URL: ${baseUrl}`);
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(`METADATA_BASE_URL must use https (http only for localhost): ${baseUrl}`);
  }
  if (url.search || url.hash) {
    throw new Error(`METADATA_BASE_URL must not have a query or fragment: ${baseUrl}`);
  }
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}/api/metadata/{id}`;
}
