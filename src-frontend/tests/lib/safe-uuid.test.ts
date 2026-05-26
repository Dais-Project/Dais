import { afterEach, describe, expect, test, vi } from "vitest";
import { safeUuid } from "@/lib/safe-uuid";

const originalCrypto = globalThis.crypto;

type CryptoStub = Pick<Crypto, "getRandomValues"> & {
  randomUUID?: Crypto["randomUUID"];
};

function setCryptoStub(crypto: CryptoStub) {
  Object.defineProperty(globalThis, "crypto", {
    value: crypto,
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: originalCrypto,
    configurable: true,
  });
});

describe("safeUuid", () => {
  test("uses crypto.randomUUID when available", () => {
    const randomUUID = vi.fn(() => "generated-by-randomUUID");
    const getRandomValues = vi.fn((array: Uint8Array) => array);

    setCryptoStub({
      randomUUID,
      getRandomValues,
    });

    expect(safeUuid()).toBe("generated-by-randomUUID");
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  test("falls back to crypto.getRandomValues when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array[0] = 0;
      return array;
    });

    setCryptoStub({
      getRandomValues,
    });

    const uuid = safeUuid();

    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getRandomValues).toHaveBeenCalled();

    for (const [array] of getRandomValues.mock.calls) {
      expect(array).toBeInstanceOf(Uint8Array);
      expect(array).toHaveLength(1);
    }
  });
});
