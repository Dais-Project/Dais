import { useTranslation } from "react-i18next";
import { ShortcutRecorder } from "@/components/custom/ShortcutRecorder";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { useSettingsStore } from "@/stores/settings-store";

export function ShortcutSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const shortcuts = useSettingsStore((store) => store.current.shortcuts);
  const setPartial = useSettingsStore((store) => store.setPartial);

  const handleToggleSidebarShortcutChange = (keys: string[]) => {
    setPartial({
      shortcuts: {
        ...shortcuts,
        toggle_sidebar: keys,
      },
    });
  };

  const handleCloseTabShortcutChange = (keys: string[]) => {
    setPartial({
      shortcuts: {
        ...shortcuts,
        close_tab: keys,
      },
    });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem
        title={t("settings.shortcuts.toggle_sidebar.title")}
        align="start"
      >
        <ShortcutRecorder
          value={shortcuts.toggle_sidebar}
          onChange={handleToggleSidebarShortcutChange}
        />
      </SettingItem>

      <SettingItem
        title={t("settings.shortcuts.close_tab.title")}
        align="start"
      >
        <ShortcutRecorder
          value={shortcuts.close_tab}
          onChange={handleCloseTabShortcutChange}
        />
      </SettingItem>
    </div>
  );
}
