import type { z } from "zod";

export { cn } from "cn";

export function tryParseSchema<T>(schema: z.ZodType<T>, data: string | unknown, throwIfInvalid = false): T | null {
  try {
    if (typeof data === "string") {
      return schema.parse(JSON.parse(data));
    }
    return schema.parse(data);
  } catch (error) {
    if (throwIfInvalid) {
      throw error;
    }
    return null;
  }
}
