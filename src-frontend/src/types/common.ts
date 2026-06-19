export type AppTheme = "system" | "light" | "dark";
export type Language = "en" | "zh_CN";
export type ShortcutSettings = {
  toggle_sidebar: string[];
  close_tab: string[];
};
export type AppSettings = {
  theme: AppTheme;
  language: Language;
  shortcuts: ShortcutSettings;
};
