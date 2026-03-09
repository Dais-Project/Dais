import { use } from "react";
import { useTranslation } from "react-i18next";
import { ModelSelectDialog } from "@/components/custom/dialog/resource-dialog/ModelSelectDialog";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { useServerSettingsStore } from "@/stores/server-settings-store";

export function HelperModelSettings() {
  const { t } = useTranslation("sidebar");
  const { currentPromise: serverSettingsPromise, setPartial: setPartialServerSettings } = useServerSettingsStore();
  const serverSettings = use(serverSettingsPromise);

  const handleValueChange = (value: number) => {
    setPartialServerSettings({ flash_model: value });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("settings.helper_model.flash_model.title")}>
        <ModelSelectDialog value={serverSettings.flash_model} onChange={handleValueChange} />
      </SettingItem>
    </div>
  );
}
