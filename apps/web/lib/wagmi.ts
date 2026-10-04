import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { chain } from "@/lib/chain";

export const wagmiConfig = getDefaultConfig({
  appName: "StylusForge",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "demo",
  chains: [chain],
  ssr: true,
});
