import { SettingItem } from "@/components/custom/item/SettingItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { AppTheme, Language } from "@/types/common";

export function GeneralSettings() {
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
      <SettingItem title="主题">
        <Select value={settings.theme} onValueChange={handleThemeChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择主题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">跟随系统</SelectItem>
            <SelectItem value="light">浅色</SelectItem>
            <SelectItem value="dark">深色</SelectItem>
          </SelectContent>
        </Select>
      </SettingItem>

      <SettingItem title="语言">
        <Select value={settings.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh_CN">简体中文</SelectItem>
          </SelectContent>
        </Select>
      </SettingItem>

      <SettingItem title="模型回复语言">
        <Select
          value={serverSettings?.reply_language}
          onValueChange={handleModelReplyLanguageChange}
          disabled={isServerSettingsLoading}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择语言" />
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
