import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShortcutRecorder } from "@/components/custom/ShortcutRecorder";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

export function ShortcutSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [toggleSidebarShortcut, setToggleSidebarShortcut] = useState<string[]>([
    "ctrl",
    "b",
  ]);
  const [closeTabShortcut, setCloseTabShortcut] = useState<string[]>([
    "ctrl",
    "w",
  ]);

  return (
    <div className="px-4 py-2">
      <SettingItem
        title={t("settings.shortcuts.toggle_sidebar.title")}
        align="start"
      >
        <ShortcutRecorder
          value={toggleSidebarShortcut}
          onChange={setToggleSidebarShortcut}
        />
      </SettingItem>

      <SettingItem
        title={t("settings.shortcuts.close_tab.title")}
        align="start"
      >
        <ShortcutRecorder
          value={closeTabShortcut}
          onChange={setCloseTabShortcut}
        />
      </SettingItem>
    </div>
  );
}
