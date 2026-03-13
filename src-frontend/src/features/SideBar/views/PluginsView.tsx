import { useTranslation } from "react-i18next";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

export function PluginsView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return <div>{t("plugins.placeholder")}</div>;
}
PluginsView.componentId = "plugins";
