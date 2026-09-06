import { LogOutIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  resetAuthSessionQuery,
  useDeleteAuthSession,
} from "@/api/auth";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

export function BrowserLogoutSetting() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { mutate: logout, isPending } = useDeleteAuthSession({
    mutation: {
      onSuccess: () => resetAuthSessionQuery(),
      onError: () => {
        toast.error(t("settings.remote_access.logout.toast.error"));
      },
    },
  });

  return (
    <SettingItem title={t("settings.remote_access.logout.title")}>
      <Button
        type="button"
        variant="destructive"
        onClick={() => logout()}
        disabled={isPending}
      >
        <LogOutIcon />
        {t("settings.remote_access.logout.button")}
      </Button>
    </SettingItem>
  );
}
