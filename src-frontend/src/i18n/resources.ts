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
import enError from "./locales/en/error.json";
import enComponentsCustom from "./locales/en/components-custom.json";
import zhCnDialog from "./locales/zh_CN/dialog.json";
import zhCnForm from "./locales/zh_CN/form.json";
import zhCnSideBar from "./locales/zh_CN/sidebar.json";
import zhCnTabs from "./locales/zh_CN/tabs.json";
import zhCnTabsAgent from "./locales/zh_CN/tabs-agent.json";
import zhCnTabsProvider from "./locales/zh_CN/tabs-provider.json";
import zhCnTabsTask from "./locales/zh_CN/tabs-task.json";
import zhCnTabsToolset from "./locales/zh_CN/tabs-toolset.json";
import zhCnTabsWorkspace from "./locales/zh_CN/tabs-workspace.json";
import zhCnError from "./locales/zh_CN/error.json";
import zhCnComponentsCustom from "./locales/zh_CN/components-custom.json";

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
export const ERROR_NAMESPACE = "error";
export const COMPONENTS_CUSTOM_NAMESPACE = "components-custom";
export const FALLBACK_LANGUAGE: Language = "en";
export const SUPPORTED_LANGUAGES = ["en", "zh_CN"] as const satisfies readonly Language[];

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
  ERROR_NAMESPACE,
];

export const resources: Resource = {
  en: {
    [SIDEBAR_NAMESPACE]: enSideBar,
    [TABS_NAMESPACE]: enTabs,
    [TABS_AGENT_NAMESPACE]: enTabsAgent,
    [TABS_PROVIDER_NAMESPACE]: enTabsProvider,
    [TABS_TOOLSET_NAMESPACE]: enTabsToolset,
    [TABS_WORKSPACE_NAMESPACE]: enTabsWorkspace,
    [TABS_TASK_NAMESPACE]: enTabsTask,
    [FORM_NAMESPACE]: enForm,
    [DIALOG_NAMESPACE]: enDialog,
    [COMPONENTS_CUSTOM_NAMESPACE]: enComponentsCustom,
    [ERROR_NAMESPACE]: enError,
  },
  zh_CN: {
    [SIDEBAR_NAMESPACE]: zhCnSideBar,
    [TABS_NAMESPACE]: zhCnTabs,
    [TABS_AGENT_NAMESPACE]: zhCnTabsAgent,
    [TABS_PROVIDER_NAMESPACE]: zhCnTabsProvider,
    [TABS_TOOLSET_NAMESPACE]: zhCnTabsToolset,
    [TABS_WORKSPACE_NAMESPACE]: zhCnTabsWorkspace,
    [TABS_TASK_NAMESPACE]: zhCnTabsTask,
    [FORM_NAMESPACE]: zhCnForm,
    [DIALOG_NAMESPACE]: zhCnDialog,
    [COMPONENTS_CUSTOM_NAMESPACE]: zhCnComponentsCustom,
    [ERROR_NAMESPACE]: zhCnError,
  },
};
