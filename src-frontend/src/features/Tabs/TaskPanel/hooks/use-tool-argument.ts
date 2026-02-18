import { useEffect, useState } from "react";
import type { z } from "zod";

export function useToolArgument<T extends Record<string, unknown>>(
  rawArguments: string,
  schema?: z.ZodType<T>
): T | null {
  const [toolArguments, setToolArguments] = useState<T | null>(null);
  useEffect(() => {
    try {
      const parsedArguments = JSON.parse(rawArguments);
      schema?.parse(parsedArguments);
      setToolArguments(parsedArguments as T);
    } catch {
      setToolArguments(null);
      console.warn("Failed to parse tool arguments:", rawArguments);
    }
  }, [rawArguments]);
  return toolArguments;
}
