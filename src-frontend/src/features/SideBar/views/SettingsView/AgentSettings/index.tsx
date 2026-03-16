import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounceFn } from "ahooks";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { AppSettings } from "@/api/generated/schemas";

export function AgentSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { current: serverSettings, setPartial: setPartialServerSettings } = useServerSettingsStore();
  const [localSettings, setLocalSettings] = useState(serverSettings);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setLocalSettings(serverSettings);
  }, [serverSettings]);

  const { run: handleUpdateSettings } = useDebounceFn((update: Partial<AppSettings>) => {
    const updatePromise = setPartialServerSettings(update);
    if (updatePromise === null) {
      return;
    }
    setDisabled(true);
    updatePromise.finally(() => setDisabled(false));
  }, { wait: 300 });

  const handleValueChange = (update: Partial<AppSettings>) => {
    setLocalSettings((prev) => {
      if (prev === null) {
        return null;
      }
      return { ...prev, ...update };
    });
    handleUpdateSettings(update);
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("settings.agents.smart_approve.title")}>
        {localSettings === null ? (
          <Skeleton className="h-4.5 w-8" />
        ) : (
          <Switch
            checked={localSettings.smart_approve}
            onCheckedChange={(checked) => handleValueChange({ smart_approve: checked })}
            disabled={disabled}
          />
        )}
      </SettingItem>

      <SettingItem title={t("settings.agents.smart_approve_threshold.title")}>
        {localSettings === null ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <Input
            type="number"
            value={localSettings.smart_approve_threshold}
            min={0}
            max={100}
            step={10}
            onChange={(e) => handleValueChange({ smart_approve_threshold: Number(e.target.value) })}
            disabled={disabled}
          />
        )}
      </SettingItem>
    </div>
  );
}
