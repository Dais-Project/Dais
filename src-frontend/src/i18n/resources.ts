import type { Resource } from "i18next";
import type { Language } from "@/types/common";
import enSideBar from "./locales/en/sidebar.json";
import enTabs from "./locales/en/tabs.json";
import enTabsAgent from "./locales/en/tabs-agent.json";
import enTabsProvider from "./locales/en/tabs-provider.json";
import enTabsToolset from "./locales/en/tabs-toolset.json";
import enTabsWorkspace from "./locales/en/tabs-workspace.json";
import zhCnSideBar from "./locales/zh_CN/sidebar.json";
import zhCnTabs from "./locales/zh_CN/tabs.json";
import zhCnTabsAgent from "./locales/zh_CN/tabs-agent.json";
import zhCnTabsProvider from "./locales/zh_CN/tabs-provider.json";
import zhCnTabsToolset from "./locales/zh_CN/tabs-toolset.json";
import zhCnTabsWorkspace from "./locales/zh_CN/tabs-workspace.json";

export const DEFAULT_NAMESPACE = "common";
export const SIDEBAR_NAMESPACE = "sidebar";
export const TABS_NAMESPACE = "tabs";
export const TABS_AGENT_NAMESPACE = "tabs-agent";
export const TABS_PROVIDER_NAMESPACE = "tabs-provider";
export const TABS_TOOLSET_NAMESPACE = "tabs-toolset";
export const TABS_WORKSPACE_NAMESPACE = "tabs-workspace";
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

const TABS_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: enTabs as TranslationBundle,
  zh_CN: zhCnTabs as TranslationBundle,
};

const TABS_AGENT_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: enTabsAgent as TranslationBundle,
  zh_CN: zhCnTabsAgent as TranslationBundle,
};

const TABS_PROVIDER_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: enTabsProvider as TranslationBundle,
  zh_CN: zhCnTabsProvider as TranslationBundle,
};

const TABS_TOOLSET_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: enTabsToolset as TranslationBundle,
  zh_CN: zhCnTabsToolset as TranslationBundle,
};

const TABS_WORKSPACE_TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: enTabsWorkspace as TranslationBundle,
  zh_CN: zhCnTabsWorkspace as TranslationBundle,
};

export const namespaces = [
  DEFAULT_NAMESPACE,
  SIDEBAR_NAMESPACE,
  TABS_NAMESPACE,
  TABS_AGENT_NAMESPACE,
  TABS_PROVIDER_NAMESPACE,
  TABS_TOOLSET_NAMESPACE,
  TABS_WORKSPACE_NAMESPACE,
];

export const resources: Resource = {
  en: {
    [DEFAULT_NAMESPACE]: COMMON_TRANSLATIONS.en,
    [SIDEBAR_NAMESPACE]: SIDEBAR_TRANSLATIONS.en,
    [TABS_NAMESPACE]: TABS_TRANSLATIONS.en,
    [TABS_AGENT_NAMESPACE]: TABS_AGENT_TRANSLATIONS.en,
    [TABS_PROVIDER_NAMESPACE]: TABS_PROVIDER_TRANSLATIONS.en,
    [TABS_TOOLSET_NAMESPACE]: TABS_TOOLSET_TRANSLATIONS.en,
    [TABS_WORKSPACE_NAMESPACE]: TABS_WORKSPACE_TRANSLATIONS.en,
  },
  zh_CN: {
    [DEFAULT_NAMESPACE]: COMMON_TRANSLATIONS.zh_CN,
    [SIDEBAR_NAMESPACE]: SIDEBAR_TRANSLATIONS.zh_CN,
    [TABS_NAMESPACE]: TABS_TRANSLATIONS.zh_CN,
    [TABS_AGENT_NAMESPACE]: TABS_AGENT_TRANSLATIONS.zh_CN,
    [TABS_PROVIDER_NAMESPACE]: TABS_PROVIDER_TRANSLATIONS.zh_CN,
    [TABS_TOOLSET_NAMESPACE]: TABS_TOOLSET_TRANSLATIONS.zh_CN,
    [TABS_WORKSPACE_NAMESPACE]: TABS_WORKSPACE_TRANSLATIONS.zh_CN,
  },
};
