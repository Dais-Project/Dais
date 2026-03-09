import { useTranslation } from "react-i18next";

export function PluginsView() {
  const { t } = useTranslation("sidebar");

  return <div>{t("plugins.placeholder")}</div>;
}
PluginsView.componentId = "plugins";
