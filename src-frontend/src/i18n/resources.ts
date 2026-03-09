import type { Resource } from "i18next";
import type { Language } from "@/types/common";

export const DEFAULT_NAMESPACE = "common";
export const FALLBACK_LANGUAGE: Language = "en";
export const SUPPORTED_LANGUAGES = ["en", "zh_CN"] as const satisfies readonly Language[];

type TranslationBundle = Record<string, string>;

const COMMON_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: {},
  zh_CN: {},
};

export const resources: Resource = {
  en: {
    [DEFAULT_NAMESPACE]: COMMON_TRANSLATIONS.en,
  },
  zh_CN: {
    [DEFAULT_NAMESPACE]: COMMON_TRANSLATIONS.zh_CN,
  },
};
