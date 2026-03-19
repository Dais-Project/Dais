import { QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import { i18n } from "./i18n";
import queryClient from "./query-client";
import "./index.css";
import "./lib";

const root = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(root).render(
  <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </I18nextProvider>,
);
