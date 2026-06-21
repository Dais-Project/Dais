import { PencilIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { McpToolsetStatus, ToolsetType, type ToolsetBrief } from "@/api/generated/schemas";
import {
  invalidateToolsetQueries,
  useDeleteToolset,
  useGetToolsetsBriefSuspense,
  useReconnectMcpToolset,
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
import { SIDEBAR_QUERY_GC_TIME } from "@/constants/query-options";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { getErrorMessage } from "@/i18n/error-message";
import { ToolsetIcon } from "./ToolsetIcon";


function getStatusColor(status: McpToolsetStatus): string {
  switch (status) {
    case "connected": return "bg-success";
    case "connecting": return "bg-warning";
    case "disconnected": return "bg-slate-500";
    case "error": return "bg-destructive";
    default: return "bg-slate-500";
  }
}

function createToolsetEditTab(toolsetId: number, toolsetName: string): Tab {
  return {
    type: "toolset",
    title: i18n.t("toolsets.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: toolsetName }),
    icon: "wrench",
    metadata: { mode: "edit", id: toolsetId },
  };
}

type OpenToolsetEditTabParams = {
  toolsetId: number;
  toolsetName: string;
};

function openToolsetEditTab({
  toolsetId,
  toolsetName,
}: OpenToolsetEditTabParams) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "toolset" &&
      tab.metadata.mode === "edit" &&
      tab.metadata.id === toolsetId
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
  onReconnect?: (toolset: ToolsetBrief) => void;
  onDelete?: (toolset: ToolsetBrief) => void;
};

function ToolsetItem({ toolset, onReconnect, onDelete }: ToolsetItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const isMcpToolset = toolset.type === ToolsetType.mcp_local || toolset.type === ToolsetType.mcp_remote;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openToolsetEditTab({
      toolsetId: toolset.id,
      toolsetName: toolset.name,
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
            <div className="space-x-2">
              <span>{toolset.name}</span>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "inline-block size-2 rounded-full",
                        getStatusColor(toolset.status)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{
                      toolset.error_code
                        ? getErrorMessage(toolset.error_code)
                        : t(`toolsets.status.${toolset.status}`)
                    }</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        />
      </ActionableItemTrigger>
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon />
          <span>{t("toolsets.menu.edit")}</span>
        </ActionableItemMenuItem>
        {isMcpToolset && (
          <ActionableItemMenuItem onClick={() => onReconnect?.(toolset)}>
            <RefreshCwIcon />
            <span>{t("toolsets.menu.reconnect")}</span>
          </ActionableItemMenuItem>
        )}
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete?.(toolset)}>
          <TrashIcon />
          <span>{t("toolsets.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function ToolsetList() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);

  const reconnectMcpToolsetMutation = useReconnectMcpToolset({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateToolsetQueries(variables.toolsetId);
        toast.success(t("toolsets.toast.reconnection_success_title"), {
          description: t("toolsets.toast.reconnect_success_description"),
        });
      },
    },
  });

  const deleteToolsetMutation = useDeleteToolset();
  const asyncConfirm = useAsyncConfirm<ToolsetBrief>({
    async onConfirm(toolset) {
      await deleteToolsetMutation.mutateAsync({ toolsetId: toolset.id });
      await invalidateToolsetQueries(toolset.id);

      removeTabs((tab) => (tab.type === "toolset" &&
        tab.metadata.mode === "edit" &&
        tab.metadata.id === toolset.id));

      toast.success(t("toolsets.toast.delete_success_title"), {
        description: t("toolsets.toast.delete_success_description"),
      });
    }
  });

  const { data: toolsets } = useGetToolsetsBriefSuspense({
    query: { refetchInterval: 3000, gcTime: SIDEBAR_QUERY_GC_TIME },
  });

  const handleReconnectMcpToolset = async (toolset: ToolsetBrief) => {
    await reconnectMcpToolsetMutation.mutateAsync({ toolsetId: toolset.id });
  };

  return (
    <>
      <ScrollArea className="limit-width flex-1 h-full">
        {toolsets.map((toolset) => (
          <ToolsetItem
            key={toolset.id}
            toolset={toolset}
            onReconnect={handleReconnectMcpToolset}
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
