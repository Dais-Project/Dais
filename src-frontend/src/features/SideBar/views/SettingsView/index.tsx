import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "./GeneralSettings";
import { ProviderSettings } from "./ProviderSettings";
import { HelperModelSettings } from "./HelperModelSettings";
import { AgentSettings } from "./AgentSettings";
import { RemoteAccessSettings } from "./RemoteAccessSettings";
import { ShortcutSettings } from "./ShortcutSettings";
import { DevSettings } from "./DevSettings";
import { AboutSettings } from "./AboutSettings";
import { SideBarHeader } from "../../components/SideBarHeader";

type SettingItem = {
  id: string;
  titleKey: string;
  content: React.ReactNode;
};

const settingItems: SettingItem[] = [
  {
    id: "general",
    titleKey: "settings.tabs.general",
    content: <GeneralSettings />,
  },
  {
    id: "providers",
    titleKey: "settings.tabs.providers",
    content: <ProviderSettings />,
  },
  {
    id: "helper-model",
    titleKey: "settings.tabs.helper_model",
    content: <HelperModelSettings />,
  },
  {
    id: "agents",
    titleKey: "settings.tabs.agents",
    content: <AgentSettings />,
  },
  {
    id: "remote-access",
    titleKey: "settings.tabs.remote_access",
    content: <RemoteAccessSettings />,
  },
  {
    id: "shortcuts",
    titleKey: "settings.tabs.shortcuts",
    content: <ShortcutSettings />,
  },
  {
    id: "dev",
    titleKey: "settings.tabs.dev",
    content: <DevSettings />,
  },
  {
    id: "about",
    titleKey: "settings.tabs.about",
    content: <AboutSettings />,
  },
];

export function SettingsView() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  const tabsTriggerClasses = cn(
    "!text-foreground !bg-transparent !border-transparent",
    "flex-0 cursor-pointer justify-start rounded-none border-0 border-r-2 border-l-2 px-3 py-1 opacity-40 transition-all first-of-type:pt-2 hover:opacity-100",
    "data-[state=active]:!border-l-primary data-[state=active]:opacity-100 data-[state=active]:shadow-none"
  );
  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title={t("settings.header.title")} />
      <Tabs defaultValue={settingItems[0].id} className="flex min-h-0 w-full flex-1 flex-row gap-0">
        <TabsList className="flex h-full flex-col items-stretch gap-2 rounded-none border-r bg-transparent p-0">
          {settingItems.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className={tabsTriggerClasses}>
              {t(item.titleKey)}
            </TabsTrigger>
          ))}
          <div className="flex-1" />
        </TabsList>

        <ScrollArea className="limit-width max-h-full flex-1">
          {settingItems.map((item) => (
            <TabsContent key={item.id} value={item.id}>
              {item.content}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
SettingsView.componentId = "settings";
