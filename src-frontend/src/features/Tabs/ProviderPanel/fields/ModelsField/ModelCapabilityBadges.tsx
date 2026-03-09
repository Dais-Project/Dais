import { useTranslation } from "react-i18next";
import type { LlmModelCapability } from "@/api/generated/schemas";
import { Badge } from "@/components/ui/badge";

type ModelCapabilityBadgesProps = {
  capability: LlmModelCapability;
};

type CapabilityConfig = {
  key: keyof LlmModelCapability;
  labelKey: string;
};

const CAPABILITY_CONFIGS: CapabilityConfig[] = [
  { key: "vision", labelKey: "models.capability.vision" },
  { key: "reasoning", labelKey: "models.capability.reasoning" },
  { key: "tool_use", labelKey: "models.capability.tool_use" },
];

export function ModelCapabilityBadges({
  capability,
}: ModelCapabilityBadgesProps) {
  const { t } = useTranslation("tabs-provider");
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
          {t(config.labelKey)}
        </Badge>
      ))}
    </div>
  );
}
