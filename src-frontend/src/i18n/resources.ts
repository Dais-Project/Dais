import type { Resource } from "i18next";
import type { Language } from "@/types/common";
import enSideBar from "./locales/en/sidebar.json";
import zhCnSideBar from "./locales/zh_CN/sidebar.json";

export const DEFAULT_NAMESPACE = "common";
export const SIDEBAR_NAMESPACE = "sidebar";
export const FALLBACK_LANGUAGE: Language = "en";
export const SUPPORTED_LANGUAGES = ["en", "zh_CN"] as const satisfies readonly Language[];

type TranslationBundle = Record<string, string>;

const COMMON_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: {},
  zh_CN: {},
};

const SIDEBAR_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: enSideBar as TranslationBundle,
  zh_CN: zhCnSideBar as TranslationBundle,
};

export const resources: Resource = {
  en: {
    [DEFAULT_NAMESPACE]: COMMON_TRANSLATIONS.en,
    [SIDEBAR_NAMESPACE]: SIDEBAR_TRANSLATIONS.en,
  },
  zh_CN: {
    [DEFAULT_NAMESPACE]: COMMON_TRANSLATIONS.zh_CN,
    [SIDEBAR_NAMESPACE]: SIDEBAR_TRANSLATIONS.zh_CN,
  },
};
