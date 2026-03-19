import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { Language } from "@/types/common";
import {
  resources,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "./resources";

export function resolveLanguage(language: string): Language {
  if (SUPPORTED_LANGUAGES.includes(language as Language)) {
    return language as Language;
  }
  return FALLBACK_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources,
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  initImmediate: false,
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
