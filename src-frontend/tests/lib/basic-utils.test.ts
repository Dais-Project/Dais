import { describe, expect, test } from "vitest";
import { z } from "zod";
import { activityVisible } from "@/lib/activity-visible";
import { getFileExtension } from "@/lib/path";
import { resolveIconName } from "@/lib/resolve-iconname";
import { tryParseSchema } from "@/lib/utils";

describe("getFileExtension", () => {
  test("returns the extension for a simple file name", () => {
    expect(getFileExtension("index.ts")).toBe("ts");
  });

  test("returns the last extension for nested paths", () => {
    expect(getFileExtension("src/lib/archive.tar.gz")).toBe("gz");
  });

  test("supports Windows path separators", () => {
    expect(getFileExtension("C:\\work\\file.txt")).toBe("txt");
  });

  test("returns null when there is no extension", () => {
    expect(getFileExtension("README")).toBeNull();
  });

  test("returns null for hidden files without a basename", () => {
    expect(getFileExtension(".gitignore")).toBeNull();
  });

  test("returns an empty string when the file name ends with a dot", () => {
    expect(getFileExtension("file.")).toBe("");
  });
});

describe("activityVisible", () => {
  test("returns hidden for false", () => {
    expect(activityVisible(false)).toBe("hidden");
  });

  test("returns hidden for null", () => {
    expect(activityVisible(null)).toBe("hidden");
  });

  test("returns hidden for undefined", () => {
    expect(activityVisible(undefined)).toBe("hidden");
  });

  test("returns visible for truthy values", () => {
    expect(activityVisible(true)).toBe("visible");
  });

  test("returns visible for other falsy values", () => {
    expect(activityVisible(0)).toBe("visible");
    expect(activityVisible("")).toBe("visible");
  });
});

describe("tryParseSchema", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().nonnegative(),
  });

  test("parses valid object input", () => {
    expect(tryParseSchema(schema, { name: "Ada", age: 18 })).toEqual({
      name: "Ada",
      age: 18,
    });
  });

  test("parses valid JSON string input", () => {
    expect(tryParseSchema(schema, '{"name":"Ada","age":18}')).toEqual({
      name: "Ada",
      age: 18,
    });
  });

  test("returns null for invalid JSON strings", () => {
    expect(tryParseSchema(schema, "{invalid json}")).toBeNull();
  });

  test("returns null when schema validation fails", () => {
    expect(tryParseSchema(schema, { name: "Ada", age: -1 })).toBeNull();
  });

  test("throws when throwIfInvalid is true", () => {
    expect(() => {
      tryParseSchema(schema, { name: "Ada", age: -1 }, true);
    }).toThrow();
  });
});

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
