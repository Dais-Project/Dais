import { useMemo } from "react";
import type { z } from "zod";

export function useToolArgument<T extends Record<string, unknown>>(
  rawArguments: string,
  schema?: z.ZodType<T>
): T | null {
  return useMemo(() => {
    try {
      const parsed = JSON.parse(rawArguments);
      if (!schema) {
        return parsed as T;
      }
      return schema.parse(parsed);
    } catch {
      return null;
    }
  }, [rawArguments, schema]);
}
