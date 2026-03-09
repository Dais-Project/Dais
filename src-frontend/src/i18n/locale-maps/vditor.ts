import type { Language } from "@/types/common";

/// <reference types="vditor" />
type VditorSupportedLanguage = keyof II18n;

export const VDITOR_LOCALE_MAP: Record<Language, VditorSupportedLanguage> = {
  en: "en_US",
  zh_CN: "zh_CN",
};
