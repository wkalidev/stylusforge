import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * RainbowKit draws wallet QR codes with cuer, which asks qr for a grid with `border: 0`. qr 0.6+
 * throws "invalid border=0" there, a runtime-only failure that typecheck and build miss, so the
 * cuer>qr override in pnpm-workspace.yaml pins a compatible qr. Load the exact cuer RainbowKit
 * resolves, not a copy of our own.
 */
type QrCodeModule = {
  create(value: string, options?: { errorCorrection?: string }): { edgeLength: number; grid: boolean[][] };
};

async function loadRainbowKitQrCode(): Promise<QrCodeModule> {
  const rainbowKit = createRequire(import.meta.url).resolve("@rainbow-me/rainbowkit");
  const qrCode = createRequire(rainbowKit).resolve("cuer/QrCode");
  return import(pathToFileURL(qrCode).href);
}

const WALLETCONNECT_URI =
  "wc:7f6e504bfad60b485450578e05678ed3e8e8c4751d3c6160be17160d63ec90f9@2?relay-protocol=irn&symKey=587d5484ce2a2a6ee3ba1962fdd7e8588e06200c46823bd18fbd67def96ad303";

describe("RainbowKit wallet QR code", () => {
  it("encodes a WalletConnect URI", async () => {
    const { create } = await loadRainbowKitQrCode();
    const qr = create(WALLETCONNECT_URI, { errorCorrection: "medium" });

    expect(qr.grid).toHaveLength(qr.edgeLength);
    expect(qr.grid.every((row) => row.length === qr.edgeLength)).toBe(true);
  });

  it("returns the grid without a quiet-zone border, as cuer draws it", async () => {
    const { create } = await loadRainbowKitQrCode();
    const { edgeLength } = create(WALLETCONNECT_URI, { errorCorrection: "medium" });

    // QR symbols are 21 + 4k modules wide; any border would break that.
    expect(edgeLength % 4).toBe(1);
  });
});
