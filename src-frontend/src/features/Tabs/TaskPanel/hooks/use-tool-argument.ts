import { useMemo } from "react";
import type { z } from "zod";

export function useToolArgument<T extends Record<string, unknown>>(
  rawArguments: string,
  schema?: z.ZodType<T>
): T | null {
  return useMemo(() => {
    try {
      const parsed = JSON.parse(rawArguments);
      schema?.parse(parsed);
      return parsed as T;
    } catch {
      return null;
    }
  }, [rawArguments, schema]);
}
