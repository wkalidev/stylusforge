import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "StylusForge",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "demo",
  chains: [arbitrumSepolia],
  ssr: true,
});
