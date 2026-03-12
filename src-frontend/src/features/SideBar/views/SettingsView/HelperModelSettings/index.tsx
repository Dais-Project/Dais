import { use } from "react";
import { useTranslation } from "react-i18next";
import { ModelSelectDialog } from "@/components/custom/dialog/resource-dialog/ModelSelectDialog";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Skeleton } from "@/components/ui/skeleton";

function HelperModelSettingsSuspense() {
  const { currentPromise: serverSettingsPromise, setPartial: setPartialServerSettings } = useServerSettingsStore();
  const serverSettings = use(serverSettingsPromise);

  const handleValueChange = (value: number) => {
    setPartialServerSettings({ flash_model: value });
  };

  return (
    <ModelSelectDialog value={serverSettings.flash_model} onChange={handleValueChange} />
  )
}

export function HelperModelSettings() {
  const { t } = useTranslation("sidebar");

  return (
    <div className="px-4 py-2">
      <AsyncBoundary
        skeleton={(
          <SettingItem title={t("settings.helper_model.flash_model.title")}>
            <Skeleton className="h-9 w-24" />
          </SettingItem>
        )}
      >
        <SettingItem title={t("settings.helper_model.flash_model.title")}>
          <HelperModelSettingsSuspense />
        </SettingItem>
      </AsyncBoundary>
    </div>
  );
}
