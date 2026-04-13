import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { getAutostartEnabled, isTauri, setAutostartEnabled } from "@/lib/tauri";

export function useAutostartSetting() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [autostartEnabled, setAutostartState] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(isTauri);

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    setAutostartLoading(true);
    getAutostartEnabled()
      .then((enabled) => setAutostartState(enabled))
      .catch((e) => {
        console.error("Failed to load autostart state: ", e);
        toast.error(t("settings.general.autostart.toast.load_error"));
      })
      .finally(() => setAutostartLoading(false));
  }, [t]);

  const handleAutostartChange = async (checked: boolean) => {
    setAutostartLoading(true);
    try {
      await setAutostartEnabled(checked);
      setAutostartState(checked);
    } catch {
      toast.error(t("settings.general.autostart.toast.update_error"));
    } finally {
      setAutostartLoading(false);
    }
  };

  return {
    autostartEnabled,
    autostartLoading,
    handleAutostartChange,
    isTauri,
  };
}
