import 'server-only';

import { isHex, type LocalAccount } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * The account that signs claim vouchers, from CLAIM_SIGNER_PRIVATE_KEY, or null when the key is
 * missing or malformed. `server-only` makes any import from a Client Component fail the build,
 * so the key never reaches the browser.
 */
export function getClaimSigner(): LocalAccount | null {
  const key = process.env.CLAIM_SIGNER_PRIVATE_KEY;
  if (!key || !isHex(key) || key.length !== 66) {
    return null;
  }
  return privateKeyToAccount(key);
}
