import type { Resource } from "i18next";
import type { Language } from "@/types/common";
import enBrowserAuth from "./locales/en/browser-auth.json";
import enComponentsAiElements from "./locales/en/components/ai-elements.json";
import enComponentsCustom from "./locales/en/components/custom.json";
import enComponentsStreamdown from "./locales/en/components/streamdown.json";
import enComponentsUi from "./locales/en/components/ui.json";
import enDialog from "./locales/en/dialog.json";
import enError from "./locales/en/error.json";
import enForm from "./locales/en/form.json";
import enSidebarAgent from "./locales/en/sidebar/agent.json";
import enSidebar from "./locales/en/sidebar/index.json";
import enSidebarSchedule from "./locales/en/sidebar/schedule.json";
import enSidebarSettings from "./locales/en/sidebar/settings.json";
import enSidebarSkill from "./locales/en/sidebar/skill.json";
import enSidebarTask from "./locales/en/sidebar/task.json";
import enSidebarToolset from "./locales/en/sidebar/toolset.json";
import enSidebarWorkspace from "./locales/en/sidebar/workspace.json";
import enTabsAgent from "./locales/en/tabs/agent.json";
import enTabs from "./locales/en/tabs/index.json";
import enTabsProvider from "./locales/en/tabs/provider.json";
import enTabsSchedule from "./locales/en/tabs/schedule.json";
import enTabsSkill from "./locales/en/tabs/skill.json";
import enTabsTask from "./locales/en/tabs/task.json";
import enTabsToolset from "./locales/en/tabs/toolset.json";
import enTabsWorkspace from "./locales/en/tabs/workspace.json";
import zhCnBrowserAuth from "./locales/zh_CN/browser-auth.json";
import zhCnComponentsAiElements from "./locales/zh_CN/components/ai-elements.json";
import zhCnComponentsCustom from "./locales/zh_CN/components/custom.json";
import zhCnComponentsStreamdown from "./locales/zh_CN/components/streamdown.json";
import zhCnComponentsUi from "./locales/zh_CN/components/ui.json";
import zhCnDialog from "./locales/zh_CN/dialog.json";
import zhCnError from "./locales/zh_CN/error.json";
import zhCnForm from "./locales/zh_CN/form.json";
import zhCnSidebarAgent from "./locales/zh_CN/sidebar/agent.json";
import zhCnSidebar from "./locales/zh_CN/sidebar/index.json";
import zhCnSidebarSchedule from "./locales/zh_CN/sidebar/schedule.json";
import zhCnSidebarSettings from "./locales/zh_CN/sidebar/settings.json";
import zhCnSidebarSkill from "./locales/zh_CN/sidebar/skill.json";
import zhCnSidebarTask from "./locales/zh_CN/sidebar/task.json";
import zhCnSidebarToolset from "./locales/zh_CN/sidebar/toolset.json";
import zhCnSidebarWorkspace from "./locales/zh_CN/sidebar/workspace.json";
import zhCnTabsAgent from "./locales/zh_CN/tabs/agent.json";
import zhCnTabs from "./locales/zh_CN/tabs/index.json";
import zhCnTabsProvider from "./locales/zh_CN/tabs/provider.json";
import zhCnTabsSchedule from "./locales/zh_CN/tabs/schedule.json";
import zhCnTabsSkill from "./locales/zh_CN/tabs/skill.json";
import zhCnTabsTask from "./locales/zh_CN/tabs/task.json";
import zhCnTabsToolset from "./locales/zh_CN/tabs/toolset.json";
import zhCnTabsWorkspace from "./locales/zh_CN/tabs/workspace.json";

export const FORM_NAMESPACE = "form";
export const BROWSER_AUTH_NAMESPACE = "browser-auth";
export const DIALOG_NAMESPACE = "dialog";
export const SIDEBAR_NAMESPACE = "sidebar/index";
export const SIDEBAR_AGENT_NAMESPACE = "sidebar/agent";
export const SIDEBAR_SCHEDULE_NAMESPACE = "sidebar/schedule";
export const SIDEBAR_SETTINGS_NAMESPACE = "sidebar/settings";
export const SIDEBAR_SKILL_NAMESPACE = "sidebar/skill";
export const SIDEBAR_TASK_NAMESPACE = "sidebar/task";
export const SIDEBAR_TOOLSET_NAMESPACE = "sidebar/toolset";
export const SIDEBAR_WORKSPACE_NAMESPACE = "sidebar/workspace";
export const TABS_NAMESPACE = "tabs/index";
export const TABS_AGENT_NAMESPACE = "tabs/agent";
export const TABS_PROVIDER_NAMESPACE = "tabs/provider";
export const TABS_SKILL_NAMESPACE = "tabs/skill";
export const TABS_TOOLSET_NAMESPACE = "tabs/toolset";
export const TABS_WORKSPACE_NAMESPACE = "tabs/workspace";
export const TABS_SCHEDULE_NAMESPACE = "tabs/schedule";
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
    [BROWSER_AUTH_NAMESPACE]: enBrowserAuth,
    [FORM_NAMESPACE]: enForm,
    [DIALOG_NAMESPACE]: enDialog,
    [SIDEBAR_NAMESPACE]: enSidebar,
    [SIDEBAR_AGENT_NAMESPACE]: enSidebarAgent,
    [SIDEBAR_SCHEDULE_NAMESPACE]: enSidebarSchedule,
    [SIDEBAR_SETTINGS_NAMESPACE]: enSidebarSettings,
    [SIDEBAR_SKILL_NAMESPACE]: enSidebarSkill,
    [SIDEBAR_TASK_NAMESPACE]: enSidebarTask,
    [SIDEBAR_TOOLSET_NAMESPACE]: enSidebarToolset,
    [SIDEBAR_WORKSPACE_NAMESPACE]: enSidebarWorkspace,
    [TABS_NAMESPACE]: enTabs,
    [TABS_AGENT_NAMESPACE]: enTabsAgent,
    [TABS_PROVIDER_NAMESPACE]: enTabsProvider,
    [TABS_SKILL_NAMESPACE]: enTabsSkill,
    [TABS_TOOLSET_NAMESPACE]: enTabsToolset,
    [TABS_WORKSPACE_NAMESPACE]: enTabsWorkspace,
    [TABS_SCHEDULE_NAMESPACE]: enTabsSchedule,
    [TABS_TASK_NAMESPACE]: enTabsTask,
    [COMPONENTS_UI_NAMESPACE]: enComponentsUi,
    [COMPONENTS_AI_ELEMENTS_NAMESPACE]: enComponentsAiElements,
    [COMPONENTS_STREAMDOWN_NAMESPACE]: enComponentsStreamdown,
    [COMPONENTS_CUSTOM_NAMESPACE]: enComponentsCustom,
    [ERROR_NAMESPACE]: enError,
  },
  zh_CN: {
    [BROWSER_AUTH_NAMESPACE]: zhCnBrowserAuth,
    [FORM_NAMESPACE]: zhCnForm,
    [DIALOG_NAMESPACE]: zhCnDialog,
    [SIDEBAR_NAMESPACE]: zhCnSidebar,
    [SIDEBAR_AGENT_NAMESPACE]: zhCnSidebarAgent,
    [SIDEBAR_SCHEDULE_NAMESPACE]: zhCnSidebarSchedule,
    [SIDEBAR_SETTINGS_NAMESPACE]: zhCnSidebarSettings,
    [SIDEBAR_SKILL_NAMESPACE]: zhCnSidebarSkill,
    [SIDEBAR_TASK_NAMESPACE]: zhCnSidebarTask,
    [SIDEBAR_TOOLSET_NAMESPACE]: zhCnSidebarToolset,
    [SIDEBAR_WORKSPACE_NAMESPACE]: zhCnSidebarWorkspace,
    [TABS_NAMESPACE]: zhCnTabs,
    [TABS_AGENT_NAMESPACE]: zhCnTabsAgent,
    [TABS_PROVIDER_NAMESPACE]: zhCnTabsProvider,
    [TABS_SKILL_NAMESPACE]: zhCnTabsSkill,
    [TABS_TOOLSET_NAMESPACE]: zhCnTabsToolset,
    [TABS_WORKSPACE_NAMESPACE]: zhCnTabsWorkspace,
    [TABS_SCHEDULE_NAMESPACE]: zhCnTabsSchedule,
    [TABS_TASK_NAMESPACE]: zhCnTabsTask,
    [COMPONENTS_UI_NAMESPACE]: zhCnComponentsUi,
    [COMPONENTS_AI_ELEMENTS_NAMESPACE]: zhCnComponentsAiElements,
    [COMPONENTS_STREAMDOWN_NAMESPACE]: zhCnComponentsStreamdown,
    [COMPONENTS_CUSTOM_NAMESPACE]: zhCnComponentsCustom,
    [ERROR_NAMESPACE]: zhCnError,
  },
};
