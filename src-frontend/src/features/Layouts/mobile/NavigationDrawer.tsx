import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Button } from "@/components/ui/button";
import {
  DrawerContainer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import { NavigationDrawerProvider } from "./NavigationDrawerContext";
import { OpenedTaskTabs } from "./OpenedTaskTabs";
import { WorkspaceSelectDrawer } from "./WorkspaceSelectDrawer";
import { WorkspaceTasks } from "./WorkspaceTasks";
import { NavigationListSkeleton } from "./components/NavigationListSkeleton";

type NavigationView = "opened-tasks" | "workspace-tasks";

function NavigationViews() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [view, setView] = useState<NavigationView>("opened-tasks");

  return (
    <>
      <div className="flex items-center justify-center border-b pt-[env(safe-area-inset-top)]">
        <Button
          variant="ghost"
          onClick={() => setView("opened-tasks")}
          className={cn(
            "flex-1 min-h-10 rounded-none",
            view === "opened-tasks" && "bg-accent text-accent-foreground",
          )}
        >
          {t("mobile.opened")}
        </Button>
        <Separator orientation="vertical" />
        <Button
          variant="ghost"
          onClick={() => setView("workspace-tasks")}
          className={cn(
            "flex-1 min-h-10 rounded-none",
            view === "workspace-tasks" && "bg-accent text-accent-foreground",
          )}
        >
          {t("mobile.workspace_tasks")}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {view === "opened-tasks" ? (
          <OpenedTaskTabs />
        ) : (
          <AsyncBoundary skeleton={<NavigationListSkeleton />}>
            <WorkspaceTasks />
          </AsyncBoundary>
        )}
      </div>
    </>
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
