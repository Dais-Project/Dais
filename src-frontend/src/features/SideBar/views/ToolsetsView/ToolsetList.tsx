import { PencilIcon, TrashIcon } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { McpToolsetStatus, ToolsetBrief } from "@/api/generated/schemas";
import {
  invalidateToolsetQueries,
  useDeleteToolset,
  useGetToolsetsBriefSuspense,
} from "@/api/toolset";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { tabIdFactory } from "@/lib/tab";
import { cn } from "@/lib/utils";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab, ToolsetTabMetadata } from "@/types/tab";
import { ToolsetIcon } from "./ToolsetIcon";

function getStatusColor(status: McpToolsetStatus): string {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "connecting":
      return "bg-yellow-500";
    case "disconnected":
      return "bg-slate-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
}

function createToolsetEditTab(toolsetId: number, toolsetName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "toolset",
    title: i18n.t("toolsets.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: toolsetName }),
    icon: "wrench",
    metadata: { mode: "edit", id: toolsetId },
  };
}

type OpenToolsetEditTabParams = {
  tabs: Tab[];
  toolsetId: number;
  toolsetName: string;
  addTab: (tab: Tab) => void;
  setActiveTab: (tabId: string) => void;
};

function openToolsetEditTab({
  tabs,
  toolsetId,
  toolsetName,
  addTab,
  setActiveTab,
}: OpenToolsetEditTabParams) {
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "toolset" &&
      tab.metadata.mode === "edit" &&
      (tab.metadata as ToolsetTabMetadata & { mode: "edit" }).id === toolsetId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createToolsetEditTab(toolsetId, toolsetName);
    addTab(newTab);
  }
}

type ToolsetItemProps = {
  toolset: ToolsetBrief;
  onDelete: (toolset: ToolsetBrief) => void;
};

function ToolsetItem({ toolset, onDelete }: ToolsetItemProps) {
  const { t } = useTranslation("sidebar");
  const tabs = useTabsStore((state) => state.tabs);
  const addTab = useTabsStore((state) => state.add);
  const setActiveTab = useTabsStore((state) => state.setActive);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openToolsetEditTab({
      tabs,
      toolsetId: toolset.id,
      toolsetName: toolset.name,
      addTab,
      setActiveTab,
    });
  };
  return (
    <ActionableItem>
      <ActionableItemTrigger>
        <ActionableItemIcon>
          <ToolsetIcon type={toolset.type} />
        </ActionableItemIcon>
        <ActionableItemInfo
          titleRender={
            <>
              {toolset.name}
              {
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "inline-block size-2 rounded-full",
                          getStatusColor(toolset.status)
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t(`toolsets.status.${toolset.status}`)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              }
            </>
          }
        />
      </ActionableItemTrigger>
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon className="mr-2 size-4" />
          <span>{t("toolsets.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem
          className="text-destructive hover:text-destructive!"
          onClick={() => onDelete(toolset)}
        >
          <TrashIcon className="mr-2 size-4 text-destructive" />
          <span>{t("toolsets.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function ToolsetList() {
  const { t } = useTranslation("sidebar");
  const removeTabsPattern = useTabsStore((state) => state.removePattern);

  const deleteToolsetMutation = useDeleteToolset();
  const asyncConfirm = useAsyncConfirm<ToolsetBrief>({
    async onConfirm(toolset) {
      await deleteToolsetMutation.mutateAsync({ toolsetId: toolset.id });
      await invalidateToolsetQueries(toolset.id);

      removeTabsPattern(
        (tab) =>
          tab.type === "toolset" &&
          tab.metadata.mode === "edit" &&
          tab.metadata.id === toolset.id
      );

      toast.success(t("toolsets.toast.delete_success_title"), {
        description: t("toolsets.toast.delete_success_description"),
      });
    },
    onError(error: Error) {
      toast.error(t("toolsets.toast.delete_error_title"), {
        description: error.message || t("toolsets.toast.delete_error_description"),
      });
    },
  });

  const { data: toolsets } = useGetToolsetsBriefSuspense({
    query: {
      // TODO: replace refetch polling with sse
      refetchInterval: 3000,
    },
  });

  return (
    <>
      <ScrollArea className="flex-1">
        {toolsets.map((toolset) => (
          <ToolsetItem
            key={toolset.id}
            toolset={toolset}
            onDelete={asyncConfirm.trigger}
          />
        ))}
      </ScrollArea>
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={t("toolsets.dialog.delete_description_with_name", {
          name: asyncConfirm.pendingData?.name ?? "",
        })}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
