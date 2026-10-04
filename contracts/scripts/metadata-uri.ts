/**
 * The ERC-1155 metadata URI served by the web app: `<domain>/api/metadata/{id}`. Clients replace
 * `{id}` with the token id.
 *
 * The base is the web app's domain only, such as `https://stylusforge.example`: an https origin
 * (http is accepted for localhost) with no path, no trailing slash and no `{id}`, since the route is
 * appended here. A full metadata URL used to be appended to again, which stored
 * `.../api/metadata/%7Bid%7D/api/metadata/{id}` on-chain.
 */
export function metadataUri(baseUrl: string): string {
  const domainOnly = (problem: string) =>
    new Error(
      `METADATA_BASE_URL must be the web app's domain only, like https://stylusforge.example: ${problem} (got "${baseUrl}"). ` +
        "The script adds /api/metadata/{id} itself.",
    );

  if (/\{id\}|%7Bid%7D/i.test(baseUrl)) {
    throw domainOnly("remove the {id} placeholder and the route");
  }
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
    throw domainOnly("remove the query or fragment");
  }
  if (url.username || url.password) {
    throw domainOnly("remove the credentials");
  }
  // new URL() gives "/" for both "https://a.example" and "https://a.example/": check the raw value.
  if (url.pathname !== "/") {
    throw domainOnly(`remove the path ${url.pathname}`);
  }
  if (baseUrl.endsWith("/")) {
    throw domainOnly("remove the trailing slash");
  }
  return `${url.origin}/api/metadata/{id}`;
}
