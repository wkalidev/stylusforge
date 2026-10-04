/**
 * "0xf39F…2266": the `0x` prefix and the first and last `chars` hex digits of an address, for
 * places too narrow for the full 42 characters (the header wallet button).
 */
export function shortAddress(address: string, chars: number): string {
  if (address.length <= 2 + chars * 2 + 1) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}
