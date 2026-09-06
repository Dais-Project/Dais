import { use } from "react";
import { useTranslation } from "react-i18next";
import { BackendReadyPromise } from "@/api";
import { useGetAuthSessionSuspense } from "@/api/auth";
import { FetchError } from "@/api/orval-mutator/custom-fetch";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import { BROWSER_AUTH_NAMESPACE } from "@/i18n/resources";
import { isTauri } from "@/lib/tauri";
import { useServerSettingsStore } from "@/stores/server-settings-store";
import { LayoutSkeleton } from "../Layouts";
import { BrowserLoginView } from "./BrowserLoginView";

function BrowserAuthGateContent({ children }: BrowserAuthGateProps) {
  use(BackendReadyPromise);

  useGetAuthSessionSuspense({
    query: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  return children;
}

type BrowserAuthGateProps = {
  children: React.ReactNode;
};

export function BrowserAuthGate({ children }: BrowserAuthGateProps) {
  const { t } = useTranslation(BROWSER_AUTH_NAMESPACE);
  const reloadServerSettings = useServerSettingsStore((s) => s.reload);

  if (isTauri) return children;

  return (
    <AsyncBoundary
      skeleton={<LayoutSkeleton />}
      errorRender={({ error, resetErrorBoundary }) => {
        const isUnauthenticated =
          error instanceof FetchError && error.statusCode === 401 && error.errorCode === "UNAUTHENTICATED";

        if (isUnauthenticated) {
          return (
            <div className="h-screen flex items-center justify-center bg-muted/30">
              <BrowserLoginView onAuthenticated={() => {
                reloadServerSettings();
                resetErrorBoundary();
              }} />
            </div>
          );
        }

        return (
          <main className="h-screen flex items-center justify-center bg-muted/30">
            <FailedToLoad
              title={t("session_check.error.title")}
              description={t("session_check.error.description")}
              retry={resetErrorBoundary}
            />
          </main>
        );
      }}
    >
      <BrowserAuthGateContent>{children}</BrowserAuthGateContent>
    </AsyncBoundary>
  );
}
