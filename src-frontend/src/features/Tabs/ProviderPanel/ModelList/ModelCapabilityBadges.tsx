import type { LlmModelCapability } from "@/api/generated/schemas";
import { Badge } from "@/components/ui/badge";

type ModelCapabilityBadgesProps = {
  capability: LlmModelCapability;
};

type CapabilityConfig = {
  key: keyof LlmModelCapability;
  label: string;
};

const CAPABILITY_CONFIGS: CapabilityConfig[] = [
  { key: "vision", label: "视觉" },
  { key: "reasoning", label: "推理" },
  { key: "tool_use", label: "工具使用" },
];

export function ModelCapabilityBadges({
  capability,
}: ModelCapabilityBadgesProps) {
  const activeBadges = CAPABILITY_CONFIGS.filter(
    (config) => capability[config.key]
  );

  if (activeBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1">
      {activeBadges.map((config) => (
        <Badge key={config.key} variant="secondary">
          {config.label}
        </Badge>
      ))}
    </div>
  );
}
