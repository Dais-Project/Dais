import { use } from "react";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { ModelSelectDialog } from "@/components/custom/dialog/resource-dialog/ModelSelectDialog";

export function HelperModelSettings() {
  const { currentPromise: serverSettingsPromise, setPartial: setPartialServerSettings } = useServerSettingsStore();
  const serverSettings = use(serverSettingsPromise);

  const handleValueChange = (value: number) => {
    setPartialServerSettings({ flash_model: value });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title="快速模型">
        <ModelSelectDialog value={serverSettings.flash_model} onChange={handleValueChange} />
      </SettingItem>
    </div>
  );
}
