import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";
import { BrowserAuthGate } from "@/features/BrowserAuth/BrowserAuthGate";
import { i18n, resolveLanguage } from "@/i18n";
import { applyTheme } from "@/lib/apply-theme";
import { useSettingsStore } from "@/stores/settings-store";
import App from "./App";
import queryClient from "./query-client";
import "./index.css";
import "./lib";

function Root() {
  const theme = useSettingsStore((state) => state.current.theme);
  const language = useSettingsStore((state) => state.current.language);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const nextLanguage = resolveLanguage(language);
    if (i18n.resolvedLanguage === nextLanguage) {
      return;
    }
    i18n.changeLanguage(nextLanguage);
  }, [language]);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserAuthGate>
          <App />
        </BrowserAuthGate>
        <Toaster />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const root = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(root).render(<Root />);
