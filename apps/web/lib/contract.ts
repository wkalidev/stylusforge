import { getAddress, isAddress, parseAbi, type Address } from 'viem';

/**
 * The parts of the StylusForgeNFT ABI the web app uses, as human-readable signatures.
 * lib/contract.test.ts checks every entry against the compiled contract.
 */
export const stylusForgeNftAbi = parseAbi([
  'function claim(uint256 lessonId, uint256 deadline, bytes signature)',
  'function completed(address student, uint256 lessonId) view returns (bool)',
  'function getCompletedLessons(address student) view returns (uint256[] lessonIds, bool[] done)',
  'function getTotalXP(address student) view returns (uint256 total)',
  'function lessons(uint256 lessonId) view returns (string name, uint256 xp, bool exists)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'event LessonCompleted(address indexed student, uint256 indexed lessonId)',
  'error InvalidLesson(uint256 lessonId)',
  'error AlreadyCompleted(address student, uint256 lessonId)',
  'error InvalidSignature()',
  'error ClaimExpired(uint256 deadline)',
]);

/**
 * Address of StylusForgeNFT on the selected chain, or null when NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
 * is missing or invalid (claiming and on-chain progress are then disabled).
 */
export const nftContractAddress: Address | null = (() => {
  const value = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
  return value && isAddress(value) ? getAddress(value) : null;
})();
