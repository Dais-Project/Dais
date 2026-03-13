import { useThrottleFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { openDevtools } from "@/lib/tauri";

export function DevSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { run: throttledOpenDevtools } = useThrottleFn(openDevtools, { wait: 300 });

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("settings.dev.devtools.title")}>
        <Button type="button" variant="outline" onClick={throttledOpenDevtools}>
          {t("settings.dev.devtools.open_button")}
        </Button>
      </SettingItem>
    </div>
  );
}
