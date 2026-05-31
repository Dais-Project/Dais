import { useTranslation } from "react-i18next";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { LinkItem } from "@/components/custom/item/LinkItem";

export function AboutSettings() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const version = import.meta.env.VITE_APP_VERSION;

  return (
    <div className="px-4 py-2">
      <SettingItem title={t("settings.about.version.title")}>
        <span className="text-sm text-muted-foreground">{version}</span>
      </SettingItem>

      <SettingItem title={t("settings.about.author.title")}>
        <LinkItem href="https://github.com/BHznJNs">BHznJNs</LinkItem>
      </SettingItem>
    </div>
  );
}
