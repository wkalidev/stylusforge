"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

/** RainbowKit in the forge palette: molten accent on blackened steel. */
const forgeTheme = (() => {
  const theme = darkTheme({
    accentColor: "#ff7a1a",
    accentColorForeground: "#0c0f13",
    borderRadius: "small",
    overlayBlur: "small",
  });
  theme.colors.modalBackground = "#12161c";
  theme.colors.modalBorder = "#2b333f";
  theme.colors.connectButtonBackground = "#181d25";
  theme.colors.connectButtonInnerBackground = "#1f252e";
  theme.colors.generalBorder = "#2b333f";
  theme.colors.profileForeground = "#12161c";
  theme.fonts.body = "var(--font-geist-sans), system-ui, sans-serif";
  return theme;
})();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={forgeTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
