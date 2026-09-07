import { useThrottleFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { SIDEBAR_SETTINGS_NAMESPACE } from "@/i18n/resources";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { openDevtools } from "@/lib/tauri";

export function DevSettings() {
  const { t } = useTranslation(SIDEBAR_SETTINGS_NAMESPACE);
  const { run: throttledOpenDevtools } = useThrottleFn(openDevtools, { wait: 300 });

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("dev.devtools.title")}>
        <Button type="button" variant="outline" onClick={throttledOpenDevtools}>
          {t("dev.devtools.open_button")}
        </Button>
      </SettingItem>
    </div>
  );
}
