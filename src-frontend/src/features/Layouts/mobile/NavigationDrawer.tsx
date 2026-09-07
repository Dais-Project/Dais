import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/animated-tabs";
import { DrawerContainer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { NavigationListSkeleton } from "./components/NavigationListSkeleton";
import { NavigationDrawerProvider } from "./NavigationDrawerContext";
import { OpenedTaskTabs } from "./OpenedTaskTabs";
import { WorkspaceSelectDrawer } from "./WorkspaceSelectDrawer";
import { WorkspaceTasks } from "./WorkspaceTasks";

function NavigationViews() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <Tabs defaultValue="opened-tasks" className="min-h-0 flex-1 gap-0">
      <TabsList className="h-auto w-full shrink-0 rounded-none border-b bg-transparent pb-1 pt-[calc(env(safe-area-inset-top)_+_0.25rem)]">
        <TabsTrigger value="opened-tasks" className="min-h-8 cursor-pointer rounded-none">
          {t("mobile.opened")}
        </TabsTrigger>
        <TabsTrigger value="workspace-tasks" className="min-h-8 cursor-pointer rounded-none">
          {t("mobile.workspace_tasks")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="opened-tasks" className="min-h-0">
        <OpenedTaskTabs />
      </TabsContent>
      <TabsContent value="workspace-tasks" className="min-h-0">
        <AsyncBoundary skeleton={<NavigationListSkeleton />}>
          <WorkspaceTasks />
        </AsyncBoundary>
      </TabsContent>
    </Tabs>
  );
}

export function NavigationDrawer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <NavigationDrawerProvider onClose={onClose}>
      <DrawerContent className="border-none w-[min(88vw,360px)]! max-w-[360px]!">
        <DrawerContainer className="flex h-full flex-col overflow-hidden [&_[data-slot=drawer-overlay]]:bg-black/70">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t("mobile.navigation")}</DrawerTitle>
          </DrawerHeader>
          <NavigationViews />
          <WorkspaceSelectDrawer />
        </DrawerContainer>
      </DrawerContent>
    </NavigationDrawerProvider>
  );
}
