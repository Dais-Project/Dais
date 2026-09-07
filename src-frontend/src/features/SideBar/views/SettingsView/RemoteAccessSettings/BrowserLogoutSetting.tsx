import { LogOutIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  resetAuthSessionQuery,
  useDeleteAuthSession,
} from "@/api/auth";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { SIDEBAR_SETTINGS_NAMESPACE } from "@/i18n/resources";

export function BrowserLogoutSetting() {
  const { t } = useTranslation(SIDEBAR_SETTINGS_NAMESPACE);
  const { mutate: logout, isPending } = useDeleteAuthSession({
    mutation: {
      onSuccess: () => resetAuthSessionQuery(),
      onError: () => {
        toast.error(t("remote_access.logout.toast.error"));
      },
    },
  });

  return (
    <SettingItem title={t("remote_access.logout.title")}>
      <Button
        type="button"
        variant="destructive"
        onClick={() => logout()}
        disabled={isPending}
      >
        <LogOutIcon />
        {t("remote_access.logout.button")}
      </Button>
    </SettingItem>
  );
}
