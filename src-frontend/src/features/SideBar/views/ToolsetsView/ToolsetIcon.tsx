import { CpuIcon, GlobeIcon, TerminalIcon, ToolCaseIcon } from "lucide-react";
import type { ToolsetType } from "@/types/toolset";

type ToolsetIconProps = {
  type: ToolsetType;
  className?: string;
};

export function ToolsetIcon({ type, className }: ToolsetIconProps) {
  switch (type) {
    case "built_in":
      return <CpuIcon className={className} />;
    case "mcp_local":
      return <TerminalIcon className={className} />;
    case "mcp_remote":
      return <GlobeIcon className={className} />;
    default:
      return <ToolCaseIcon className={className} />;
  }
}
