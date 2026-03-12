import { useSyncExternalStore } from "react";

const mq = window.matchMedia("(prefers-color-scheme: dark)");
const subscribers = new Set<() => void>();

mq.addEventListener("change", () => subscribers.forEach((cb) => cb()));

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getSystemTheme(): "light" | "dark" {
  return mq.matches ? "dark" : "light";
}

export type ThemeSetting = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function useResolvedTheme(theme: ThemeSetting): ResolvedTheme {
  if (theme !== "system") {
    return theme;
  }
  const systemTheme = useSyncExternalStore(subscribe, getSystemTheme);
  return systemTheme;
}
