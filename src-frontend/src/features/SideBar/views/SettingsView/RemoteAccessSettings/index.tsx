import { useEffect, useState } from "react";
import { useDebounceFn } from "ahooks";
import { useTranslation } from "react-i18next";
import type { AppSettings } from "@/api/generated/schemas";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useServerSettingsStore } from "@/stores/server-settings-store";

function isValidRemoteAccessPort(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

export function RemoteAccessSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { current: serverSettings, setPartial: setPartialServerSettings } =
    useServerSettingsStore();
  const [localSettings, setLocalSettings] = useState(serverSettings);
  const [localRemoteAccessPort, setLocalRemoteAccessPort] = useState(
    serverSettings?.remote_access_port.toString() ?? "",
  );
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setLocalSettings(serverSettings);
    setLocalRemoteAccessPort(
      serverSettings?.remote_access_port.toString() ?? "",
    );
  }, [serverSettings]);

  const { run: handleUpdateSettings } = useDebounceFn(
    (update: Partial<AppSettings>) => {
      const updatePromise = setPartialServerSettings(update);
      if (updatePromise === null) {
        return;
      }
      setDisabled(true);
      updatePromise.finally(() => setDisabled(false));
    },
    { wait: 1000 },
  );

  const handleValueChange = (update: Partial<AppSettings>) => {
    setLocalSettings((prev) => {
      if (prev === null) {
        return null;
      }
      return { ...prev, ...update };
    });
    handleUpdateSettings(update);
  };

  const handleRemoteAccessPortChange = (value: string) => {
    setLocalRemoteAccessPort(value);
    const remoteAccessPort = Number(value);
    if (!isValidRemoteAccessPort(remoteAccessPort)) {
      return;
    }
    handleValueChange({ remote_access_port: remoteAccessPort });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("settings.remote_access.enabled.title")}>
        {localSettings === null ? (
          <Skeleton className="h-4.5 w-8" />
        ) : (
          <Switch
            checked={localSettings.remote_access}
            onCheckedChange={(checked) =>
              handleValueChange({ remote_access: checked })
            }
            disabled={disabled}
          />
        )}
      </SettingItem>

      <SettingItem title={t("settings.remote_access.port.title")}>
        {localSettings === null ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <Input
            type="number"
            value={localRemoteAccessPort}
            min={1}
            max={65535}
            step={1}
            onChange={(e) => handleRemoteAccessPortChange(e.target.value)}
            disabled={disabled || !localSettings.remote_access}
          />
        )}
      </SettingItem>
    </div>
  );
}
