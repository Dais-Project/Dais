type ThemeSetting = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting === "system") {
    return getSystemTheme();
  }
  return setting;
}
