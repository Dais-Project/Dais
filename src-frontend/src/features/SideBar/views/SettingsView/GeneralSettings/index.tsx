import { SettingItem } from "@/components/custom/item/SettingItem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfigStore } from "@/stores/config-store";
import type { AppTheme, Language } from "@/types/common";

export function GeneralSettings() {
  const { current: config, setPartial: setPartialConfig } = useConfigStore();

  const handleThemeChange = (value: string) => {
    setPartialConfig({ theme: value as AppTheme });
  };

  const handleLanguageChange = (value: string) => {
    setPartialConfig({ language: value as Language });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title="主题">
        <Select value={config.theme} onValueChange={handleThemeChange}>
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
        <Select value={config.language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh_CN">简体中文</SelectItem>
          </SelectContent>
        </Select>
      </SettingItem>
    </div>
  );
}
