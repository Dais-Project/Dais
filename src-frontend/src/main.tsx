import { QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import { API_BASE } from "./api";
import SseDispatcher from "./lib/sse-dispatcher";
import queryClient from "./query-client";
import "./index.css";
import "./lib";

SseDispatcher.connect(new URL("api/events", API_BASE));

const root = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>,
);
