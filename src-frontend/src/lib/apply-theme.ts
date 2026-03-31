import type { AppTheme } from "@/types/common";

export function applyTheme(theme: AppTheme): (() => void) | undefined {
  function applyThemeInner() {
    document.body.classList.add("theme-switching");
    document.body.classList.remove("dark", "light");
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else if (theme === "light") {
      document.body.classList.add("light");
    } else {
      const darkModeMediaQuery = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );
      document.body.classList.add(
        darkModeMediaQuery.matches ? "dark" : "light"
      );
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("theme-switching");
      });
    });
  }

  applyThemeInner();

  if (theme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemeInner();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }
}
