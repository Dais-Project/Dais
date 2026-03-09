import type { Resource, ResourceLanguage } from "i18next";
import type { Language } from "@/types/common";
import enDialog from "./locales/en/dialog.json";
import enForm from "./locales/en/form.json";
import enSideBar from "./locales/en/sidebar.json";
import enTabs from "./locales/en/tabs.json";
import enTabsAgent from "./locales/en/tabs-agent.json";
import enTabsProvider from "./locales/en/tabs-provider.json";
import enTabsTask from "./locales/en/tabs-task.json";
import enTabsToolset from "./locales/en/tabs-toolset.json";
import enTabsWorkspace from "./locales/en/tabs-workspace.json";
import zhCnDialog from "./locales/zh_CN/dialog.json";
import zhCnForm from "./locales/zh_CN/form.json";
import zhCnSideBar from "./locales/zh_CN/sidebar.json";
import zhCnTabs from "./locales/zh_CN/tabs.json";
import zhCnTabsAgent from "./locales/zh_CN/tabs-agent.json";
import zhCnTabsProvider from "./locales/zh_CN/tabs-provider.json";
import zhCnTabsTask from "./locales/zh_CN/tabs-task.json";
import zhCnTabsToolset from "./locales/zh_CN/tabs-toolset.json";
import zhCnTabsWorkspace from "./locales/zh_CN/tabs-workspace.json";

export const DEFAULT_NAMESPACE = "common";
export const SIDEBAR_NAMESPACE = "sidebar";
export const TABS_NAMESPACE = "tabs";
export const TABS_AGENT_NAMESPACE = "tabs-agent";
export const TABS_PROVIDER_NAMESPACE = "tabs-provider";
export const TABS_TOOLSET_NAMESPACE = "tabs-toolset";
export const TABS_WORKSPACE_NAMESPACE = "tabs-workspace";
export const TABS_TASK_NAMESPACE = "tabs-task";
export const FORM_NAMESPACE = "form";
export const DIALOG_NAMESPACE = "dialog";
export const FALLBACK_LANGUAGE: Language = "en";
export const SUPPORTED_LANGUAGES = ["en", "zh_CN"] as const satisfies readonly Language[];


const SIDEBAR_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enSideBar,
  zh_CN: zhCnSideBar,
};

const TABS_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enTabs,
  zh_CN: zhCnTabs,
};

const TABS_AGENT_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enTabsAgent,
  zh_CN: zhCnTabsAgent,
};

const TABS_PROVIDER_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enTabsProvider,
  zh_CN: zhCnTabsProvider,
};

const TABS_TOOLSET_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enTabsToolset,
  zh_CN: zhCnTabsToolset,
};

const TABS_WORKSPACE_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enTabsWorkspace,
  zh_CN: zhCnTabsWorkspace,
};

const TABS_TASK_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enTabsTask,
  zh_CN: zhCnTabsTask,
};

const FORM_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enForm,
  zh_CN: zhCnForm,
};

const DIALOG_TRANSLATIONS: Record<Language, ResourceLanguage> = {
  en: enDialog,
  zh_CN: zhCnDialog,
};

export const namespaces = [
  DEFAULT_NAMESPACE,
  SIDEBAR_NAMESPACE,
  TABS_NAMESPACE,
  TABS_AGENT_NAMESPACE,
  TABS_PROVIDER_NAMESPACE,
  TABS_TOOLSET_NAMESPACE,
  TABS_WORKSPACE_NAMESPACE,
  TABS_TASK_NAMESPACE,
  FORM_NAMESPACE,
  DIALOG_NAMESPACE,
];

export const resources: Resource = {
  en: {
    [SIDEBAR_NAMESPACE]: SIDEBAR_TRANSLATIONS.en,
    [TABS_NAMESPACE]: TABS_TRANSLATIONS.en,
    [TABS_AGENT_NAMESPACE]: TABS_AGENT_TRANSLATIONS.en,
    [TABS_PROVIDER_NAMESPACE]: TABS_PROVIDER_TRANSLATIONS.en,
    [TABS_TOOLSET_NAMESPACE]: TABS_TOOLSET_TRANSLATIONS.en,
    [TABS_WORKSPACE_NAMESPACE]: TABS_WORKSPACE_TRANSLATIONS.en,
    [TABS_TASK_NAMESPACE]: TABS_TASK_TRANSLATIONS.en,
    [FORM_NAMESPACE]: FORM_TRANSLATIONS.en,
    [DIALOG_NAMESPACE]: DIALOG_TRANSLATIONS.en,
  },
  zh_CN: {
    [SIDEBAR_NAMESPACE]: SIDEBAR_TRANSLATIONS.zh_CN,
    [TABS_NAMESPACE]: TABS_TRANSLATIONS.zh_CN,
    [TABS_AGENT_NAMESPACE]: TABS_AGENT_TRANSLATIONS.zh_CN,
    [TABS_PROVIDER_NAMESPACE]: TABS_PROVIDER_TRANSLATIONS.zh_CN,
    [TABS_TOOLSET_NAMESPACE]: TABS_TOOLSET_TRANSLATIONS.zh_CN,
    [TABS_WORKSPACE_NAMESPACE]: TABS_WORKSPACE_TRANSLATIONS.zh_CN,
    [TABS_TASK_NAMESPACE]: TABS_TASK_TRANSLATIONS.zh_CN,
    [FORM_NAMESPACE]: FORM_TRANSLATIONS.zh_CN,
    [DIALOG_NAMESPACE]: DIALOG_TRANSLATIONS.zh_CN,
  },
};
