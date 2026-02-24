type UseToolNameResult = {
  toolName: string;
  toolsetName: string | undefined;
};

export function useToolName(name: string): UseToolNameResult {
  const originalToolName = name;
  const hasToolsetName = originalToolName.includes("__");
  if (!hasToolsetName) {
    return { toolName: originalToolName, toolsetName: undefined };
  }
  const splited = originalToolName.split("__");
  return { toolsetName: splited[0], toolName: splited[1] };
}
