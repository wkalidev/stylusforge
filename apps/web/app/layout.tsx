import type { Metadata } from "next";
import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Providers } from "@/components/Wallet/Providers";
import "./globals.css";

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StylusForge — Learn Arbitrum Stylus in Rust",
  description: "The first interactive IDE to learn Arbitrum Stylus smart contracts in Rust. Write, deploy and certify on-chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${bigShoulders.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <SiteHeader actions={<HeaderControls />} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
