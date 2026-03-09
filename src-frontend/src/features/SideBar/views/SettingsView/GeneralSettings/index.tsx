import { useTranslation } from "react-i18next";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { AppTheme, Language } from "@/types/common";

export function GeneralSettings() {
  const { t } = useTranslation("sidebar");
  const { current: settings, setPartial: setPartialConfig } = useSettingsStore();
  const {
    current: serverSettings,
    isLoading: isServerSettingsLoading,
    setPartial: setPartialServerConfig,
  } = useServerSettingsStore();

  const handleThemeChange = (value: string) => {
    setPartialConfig({ theme: value as AppTheme });
  };

  const handleLanguageChange = (value: string) => {
    setPartialConfig({ language: value as Language });
  };

  const handleModelReplyLanguageChange = (value: string) => {
    setPartialServerConfig({ reply_language: value });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("settings.general.theme.title")}>
        <Select value={settings.theme} onValueChange={handleThemeChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("settings.general.theme.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{t("settings.general.theme.system")}</SelectItem>
            <SelectItem value="light">{t("settings.general.theme.light")}</SelectItem>
            <SelectItem value="dark">{t("settings.general.theme.dark")}</SelectItem>
          </SelectContent>
        </Select>
      </SettingItem>

      <SettingItem title={t("settings.general.language.title")}>
        <Select value={settings.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("settings.general.language.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh_CN">简体中文</SelectItem>
          </SelectContent>
        </Select>
      </SettingItem>

      <SettingItem title={t("settings.general.reply_language.title")}>
        <Select
          value={serverSettings?.reply_language}
          onValueChange={handleModelReplyLanguageChange}
          disabled={isServerSettingsLoading}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("settings.general.reply_language.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="简体中文">简体中文</SelectItem>
          </SelectContent>
        </Select>
      </SettingItem>
    </div>
  );
}
