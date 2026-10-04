import { existsSync, readFileSync } from "node:fs";

import { type Abi, type AbiParameter, toFunctionSelector, toEventSelector } from "viem";
import { formatAbiItem } from "viem/utils";
import { describe, expect, it } from "vitest";

import { stylusForgeNftAbi } from "./contract";

const ARTIFACT = new URL(
  "../../../contracts/artifacts/contracts/StylusForgeNFT.sol/StylusForgeNFT.json",
  import.meta.url,
);

/** Identity of an ABI item: its canonical signature plus, for functions, its outputs and mutability. */
function identity(item: Abi[number]): string {
  if (item.type === "function") {
    const outputs = item.outputs.map((output: AbiParameter) => output.type).join(",");
    return `${toFunctionSelector(formatAbiItem(item))} ${item.stateMutability} (${outputs})`;
  }
  if (item.type === "event") {
    const indexed = item.inputs.map((input) => (input.indexed ? "i" : "-")).join("");
    return `${toEventSelector(formatAbiItem(item))} ${indexed}`;
  }
  return formatAbiItem(item);
}

// The artifact exists once the contracts are compiled (the root `pnpm test` runs them first).
describe.skipIf(!existsSync(ARTIFACT))("stylusForgeNftAbi", () => {
  it("matches the compiled StylusForgeNFT contract", () => {
    const compiled: Abi = JSON.parse(readFileSync(ARTIFACT, "utf8")).abi;
    const comparable = compiled.filter((item) => ["function", "event", "error"].includes(item.type));
    const compiledIds = new Set(comparable.map(identity));
    for (const item of stylusForgeNftAbi) {
      expect(compiledIds, formatAbiItem(item)).toContain(identity(item));
    }
  });
});
