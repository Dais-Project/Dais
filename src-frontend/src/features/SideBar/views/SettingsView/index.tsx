import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SideBarHeader } from "../../components/SideBarHeader";
import { GeneralSettings } from "./GeneralSettings";
import { HelperModelSettings } from "./HelperModelSettings";
import { ProviderSettings } from "./ProviderSettings";

export function SettingsView() {
  const settingItems = [
    {
      id: "general",
      title: "通用",
      content: <GeneralSettings />,
    },
    {
      id: "providers",
      title: "模型服务",
      content: <ProviderSettings />,
    },
    {
      id: "helper-model",
      title: "助手模型",
      content: <HelperModelSettings />,
    },
  ];

  const tabsTriggerClasses = cn(
    "!text-foreground !bg-transparent !border-transparent",
    "flex-0 cursor-pointer justify-start rounded-none border-0 border-r-2 border-l-2 px-3 py-1 opacity-40 transition-all first-of-type:pt-2 hover:opacity-100",
    "data-[state=active]:!border-l-primary data-[state=active]:opacity-100 data-[state=active]:shadow-none"
  );
  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="设置" />
      <Tabs defaultValue={settingItems[0].id} className="flex min-h-0 w-full flex-1 flex-row gap-0">
        <TabsList className="flex h-full flex-col items-stretch gap-2 rounded-none border-r bg-transparent p-0">
          {settingItems.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className={tabsTriggerClasses}>
              {item.title}
            </TabsTrigger>
          ))}
          <div className="flex-1" />
        </TabsList>

        <ScrollArea className="max-h-full flex-1">
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
