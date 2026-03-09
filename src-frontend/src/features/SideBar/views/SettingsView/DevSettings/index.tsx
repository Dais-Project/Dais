import { useTranslation } from "react-i18next";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { openDevtools } from "@/lib/tauri";
import { useThrottleFn } from "ahooks";

export function DevSettings() {
  const { t } = useTranslation("sidebar");
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
