import { describe, expect, it } from "vitest";

import { shortAddress } from "./address";

const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("shortAddress", () => {
  it("keeps the prefix and the first and last digits", () => {
    expect(shortAddress(ADDRESS, 4)).toBe("0xf39F…2266");
    expect(shortAddress(ADDRESS, 2)).toBe("0xf3…66");
  });

  it("leaves a value that would not get shorter unchanged", () => {
    expect(shortAddress("0x1234", 2)).toBe("0x1234");
    expect(shortAddress("0x12345", 2)).toBe("0x12345");
  });
});
