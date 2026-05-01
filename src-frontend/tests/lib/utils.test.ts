import { describe, expect, test } from "vitest";
import { z } from "zod";
import { tryParseSchema } from "@/lib/utils";

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
