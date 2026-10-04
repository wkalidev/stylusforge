import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { chain } from "@/lib/chain";

/**
 * WalletConnect Cloud project id. Production builds fail without it instead of silently
 * shipping the shared "demo" id; development falls back to it with a warning.
 */
function resolveProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID;
  if (projectId) {
    return projectId;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_WALLETCONNECT_ID is required in production (see apps/web/.env.example)");
  }
  console.warn("NEXT_PUBLIC_WALLETCONNECT_ID is not set: using the WalletConnect demo id (development only)");
  return "demo";
}

export const wagmiConfig = getDefaultConfig({
  appName: "StylusForge",
  // Shown by WalletConnect wallets (injected wallets read the page's icon links). An absolute URL
  // on the current origin, like the app URL RainbowKit derives; none during server rendering.
  appIcon: typeof window !== "undefined" ? `${window.location.origin}/icons/icon-192.png` : undefined,
  projectId: resolveProjectId(),
  chains: [chain],
  ssr: true,
});
