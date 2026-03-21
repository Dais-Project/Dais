import type { Resource } from "i18next";
import type { Language } from "@/types/common";
import enDialog from "./locales/en/dialog.json";
import enForm from "./locales/en/form.json";
import enSideBar from "./locales/en/sidebar.json";
import enTabs from "./locales/en/tabs/index.json";
import enTabsAgent from "./locales/en/tabs/agent.json";
import enTabsProvider from "./locales/en/tabs/provider.json";
import enTabsTask from "./locales/en/tabs/task.json";
import enTabsToolset from "./locales/en/tabs/toolset.json";
import enTabsWorkspace from "./locales/en/tabs/workspace.json";
import enError from "./locales/en/error.json";
import enComponentsUi from "./locales/en/components/ui.json";
import enComponentsAiElements from "./locales/en/components/ai-elements.json";
import enComponentsStreamdown from "./locales/en/components/streamdown.json";
import enComponentsCustom from "./locales/en/components/custom.json";
import zhCnDialog from "./locales/zh_CN/dialog.json";
import zhCnForm from "./locales/zh_CN/form.json";
import zhCnSideBar from "./locales/zh_CN/sidebar.json";
import zhCnTabs from "./locales/zh_CN/tabs/index.json";
import zhCnTabsAgent from "./locales/zh_CN/tabs/agent.json";
import zhCnTabsProvider from "./locales/zh_CN/tabs/provider.json";
import zhCnTabsTask from "./locales/zh_CN/tabs/task.json";
import zhCnTabsToolset from "./locales/zh_CN/tabs/toolset.json";
import zhCnTabsWorkspace from "./locales/zh_CN/tabs/workspace.json";
import zhCnError from "./locales/zh_CN/error.json";
import zhCnComponentsUi from "./locales/zh_CN/components/ui.json";
import zhCnComponentsAiElements from "./locales/zh_CN/components/ai-elements.json";
import zhCnComponentsStreamdown from "./locales/zh_CN/components/streamdown.json";
import zhCnComponentsCustom from "./locales/zh_CN/components/custom.json";

export const FORM_NAMESPACE = "form";
export const DIALOG_NAMESPACE = "dialog";
export const SIDEBAR_NAMESPACE = "sidebar";
export const TABS_NAMESPACE = "tabs/index";
export const TABS_AGENT_NAMESPACE = "tabs/agent";
export const TABS_PROVIDER_NAMESPACE = "tabs/provider";
export const TABS_TOOLSET_NAMESPACE = "tabs/toolset";
export const TABS_WORKSPACE_NAMESPACE = "tabs/workspace";
export const TABS_TASK_NAMESPACE = "tabs/task";
export const COMPONENTS_AI_ELEMENTS_NAMESPACE = "components/ai-elements";
export const COMPONENTS_CUSTOM_NAMESPACE = "components/custom";
export const COMPONENTS_STREAMDOWN_NAMESPACE = "components/streamdown";
export const COMPONENTS_UI_NAMESPACE = "components/ui";
export const ERROR_NAMESPACE = "error";

export const FALLBACK_LANGUAGE: Language = "en";
export const SUPPORTED_LANGUAGES = ["en", "zh_CN"] as const satisfies readonly Language[];

export const resources: Resource = {
  en: {
    [FORM_NAMESPACE]: enForm,
    [DIALOG_NAMESPACE]: enDialog,
    [TABS_NAMESPACE]: enTabs,
    [SIDEBAR_NAMESPACE]: enSideBar,
    [TABS_AGENT_NAMESPACE]: enTabsAgent,
    [TABS_PROVIDER_NAMESPACE]: enTabsProvider,
    [TABS_TOOLSET_NAMESPACE]: enTabsToolset,
    [TABS_WORKSPACE_NAMESPACE]: enTabsWorkspace,
    [TABS_TASK_NAMESPACE]: enTabsTask,
    [COMPONENTS_UI_NAMESPACE]: enComponentsUi,
    [COMPONENTS_AI_ELEMENTS_NAMESPACE]: enComponentsAiElements,
    [COMPONENTS_STREAMDOWN_NAMESPACE]: enComponentsStreamdown,
    [COMPONENTS_CUSTOM_NAMESPACE]: enComponentsCustom,
    [ERROR_NAMESPACE]: enError,
  },
  zh_CN: {
    [FORM_NAMESPACE]: zhCnForm,
    [DIALOG_NAMESPACE]: zhCnDialog,
    [SIDEBAR_NAMESPACE]: zhCnSideBar,
    [TABS_NAMESPACE]: zhCnTabs,
    [TABS_AGENT_NAMESPACE]: zhCnTabsAgent,
    [TABS_PROVIDER_NAMESPACE]: zhCnTabsProvider,
    [TABS_TOOLSET_NAMESPACE]: zhCnTabsToolset,
    [TABS_WORKSPACE_NAMESPACE]: zhCnTabsWorkspace,
    [TABS_TASK_NAMESPACE]: zhCnTabsTask,
    [COMPONENTS_UI_NAMESPACE]: zhCnComponentsUi,
    [COMPONENTS_AI_ELEMENTS_NAMESPACE]: zhCnComponentsAiElements,
    [COMPONENTS_STREAMDOWN_NAMESPACE]: zhCnComponentsStreamdown,
    [COMPONENTS_CUSTOM_NAMESPACE]: zhCnComponentsCustom,
    [ERROR_NAMESPACE]: zhCnError,
  },
};
