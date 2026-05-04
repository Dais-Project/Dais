import { useTranslation } from "react-i18next";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  StringifiableSelect,
  StringifiableSelectContent,
  StringifiableSelectItem,
  StringifiableSelectTrigger,
  StringifiableSelectValue,
} from "@/components/ui/stringifiable-select";
import { Switch } from "@/components/ui/switch";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { AppTheme, Language } from "@/types/common";
import type { RetentionOption } from "@/api/generated/schemas";
import { useAutostartSetting } from "./use-autostart-setting";

const AUTO_DELETE_OPTIONS: Array<{
  value: RetentionOption;
  labelKey: string;
}> = [
    { value: "disabled", labelKey: "settings.general.auto_delete.options.disabled" },
    { value: 7, labelKey: "settings.general.auto_delete.options.days_7" },
    { value: 14, labelKey: "settings.general.auto_delete.options.days_14" },
    { value: 30, labelKey: "settings.general.auto_delete.options.days_30" },
    { value: 60, labelKey: "settings.general.auto_delete.options.days_60" },
    { value: 180, labelKey: "settings.general.auto_delete.options.days_180" },
    { value: 360, labelKey: "settings.general.auto_delete.options.days_360" },
  ];

function getAutoDeleteSelections() {
  return Object.fromEntries(
    AUTO_DELETE_OPTIONS.map((option) => [option.labelKey, option.value])
  ) as Record<string, RetentionOption>;
}

export function GeneralSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { current: settings, setPartial: setPartialConfig } = useSettingsStore();
  const {
    current: serverSettings,
    isLoading: isServerSettingsLoading,
    setPartial: setPartialServerConfig,
  } = useServerSettingsStore();
  const { autostartEnabled, autostartLoading, handleAutostartChange, isTauri } = useAutostartSetting();

  const handleThemeChange = (value: string) => {
    setPartialConfig({ theme: value as AppTheme });
  };

  const handleLanguageChange = (value: string) => {
    setPartialConfig({ language: value as Language });
  };

  const handleModelReplyLanguageChange = (value: string) => {
    setPartialServerConfig({ reply_language: value });
  };

  const handleTaskRetentionDaysChange = (value: RetentionOption) => {
    setPartialServerConfig({ task_retention_days: value });
  };

  const handleScheduleRunRecordRetentionDaysChange = (value: RetentionOption) => {
    setPartialServerConfig({ schedule_run_record_retention_days: value });
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

      <SettingItem title={t("settings.general.auto_delete.task.title")}>
        <StringifiableSelect
          selections={getAutoDeleteSelections()}
          value={serverSettings?.task_retention_days}
          onValueChange={handleTaskRetentionDaysChange}
          disabled={isServerSettingsLoading}
        >
          <StringifiableSelectTrigger className="w-32">
            <StringifiableSelectValue placeholder={t("settings.general.auto_delete.placeholder")} />
          </StringifiableSelectTrigger>
          <StringifiableSelectContent>
            {AUTO_DELETE_OPTIONS.map((option) => (
              <StringifiableSelectItem key={option.value.toString()} value={option.value}>
                {t(option.labelKey)}
              </StringifiableSelectItem>
            ))}
          </StringifiableSelectContent>
        </StringifiableSelect>
      </SettingItem>

      <SettingItem title={t("settings.general.auto_delete.schedule_run_record.title")}>
        <StringifiableSelect
          selections={getAutoDeleteSelections()}
          value={serverSettings?.schedule_run_record_retention_days}
          onValueChange={handleScheduleRunRecordRetentionDaysChange}
          disabled={isServerSettingsLoading}
        >
          <StringifiableSelectTrigger className="w-32">
            <StringifiableSelectValue placeholder={t("settings.general.auto_delete.placeholder")} />
          </StringifiableSelectTrigger>
          <StringifiableSelectContent>
            {AUTO_DELETE_OPTIONS.map((option) => (
              <StringifiableSelectItem key={option.value.toString()} value={option.value}>
                {t(option.labelKey)}
              </StringifiableSelectItem>
            ))}
          </StringifiableSelectContent>
        </StringifiableSelect>
      </SettingItem>

      {isTauri && (
        <SettingItem title={t("settings.general.autostart.title")}>
          <Switch
            checked={autostartEnabled}
            onCheckedChange={handleAutostartChange}
            disabled={autostartLoading}
          />
        </SettingItem>
      )}
    </div>
  );
}
