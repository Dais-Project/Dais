import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
