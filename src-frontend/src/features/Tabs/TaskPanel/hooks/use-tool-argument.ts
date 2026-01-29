import { useEffect, useState } from "react";

export function useToolArgument<T extends Record<string, unknown>>(
  rawArguments: string
): T | null {
  const [toolArguments, setToolArguments] = useState<T | null>(null);
  useEffect(() => {
    try {
      const parsedArguments = JSON.parse(rawArguments);
      setToolArguments(parsedArguments as T);
    } catch {
      setToolArguments(null);
      console.error("Failed to parse tool arguments", rawArguments);
    }
  }, [rawArguments]);
  return toolArguments;
}
