import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCreateLoginCode } from "@/api/auth";
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { RotateCcwIcon } from "lucide-react";

type LoginCodeState = {
  code: string;
  expiresAt: number;
} | null;

function useBrowserLoginCode() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [loginCode, setLoginCode] = useState<LoginCodeState>(null);
  const [expired, setExpired] = useState(false);
  const { mutate: generateLoginCode, isPending } = useCreateLoginCode({
    mutation: {
      onSuccess: (result) => {
        setLoginCode({ code: result.code, expiresAt: result.expires_at });
        setExpired(result.expires_at <= Math.floor(Date.now() / 1000));
      },
      onError: () => {
        toast.error(
          t("settings.remote_access.login_code.toast.generate_error"),
        );
      },
    },
  });

  useEffect(() => {
    if (loginCode === null) return;

    const expiresInMilliseconds =
      loginCode.expiresAt * 1000 - Date.now();
    if (expiresInMilliseconds <= 0) {
      setExpired(true);
      return;
    }

    const timer = window.setTimeout(
      () => setExpired(true),
      expiresInMilliseconds,
    );
    return () => window.clearTimeout(timer);
  }, [loginCode]);

  return {
    code: loginCode?.code ?? null,
    expired,
    generateLoginCode,
    isPending,
  };
}

type BrowserLoginCodeSettingContentProps = {
  code: string | null;
  expired: boolean;
};

function BrowserLoginCodeSettingContent({
  code,
  expired,
}: BrowserLoginCodeSettingContentProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  if (code === null) return null;
  return (
    <div className="text-right">
      <div className="font-mono font-semibold text-lg tracking-[0.3em]">
        {code}
      </div>
      {expired && (
        <div className="text-muted-foreground text-xs">
          {t("settings.remote_access.login_code.expired")}
        </div>
      )}
    </div>
  );
}

export function BrowserLoginCodeSetting() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const { code, expired, generateLoginCode, isPending } =
    useBrowserLoginCode();

  return (
    <SettingItem
      title={t("settings.remote_access.login_code.title")}
      contentClassName="gap-3"
    >
      <BrowserLoginCodeSettingContent code={code} expired={expired} />
      <Button
        type="button"
        variant="outline"
        onClick={() => generateLoginCode()}
        disabled={isPending}
      >
        {code === null
          ? t("settings.remote_access.login_code.generate_button")
          : <RotateCcwIcon />}
      </Button>
    </SettingItem>
  );
}
