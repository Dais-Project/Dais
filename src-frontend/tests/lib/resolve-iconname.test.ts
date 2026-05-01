import { describe, expect, test } from "vitest";
import { resolveIconName } from "@/lib/resolve-iconname";

describe("resolveIconName", () => {
  test("returns the provided icon name when it exists", () => {
    expect(resolveIconName("bot", "house")).toBe("bot");
  });

  test("returns fallback when icon name is invalid", () => {
    expect(resolveIconName("not-a-real-icon", "house")).toBe("house");
  });

  test("returns fallback when icon name is nullish", () => {
    expect(resolveIconName(null, "house")).toBe("house");
    expect(resolveIconName(undefined, "house")).toBe("house");
  });
});
