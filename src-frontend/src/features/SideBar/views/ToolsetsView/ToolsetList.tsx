import { useQueryClient } from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import type { McpToolsetStatus, ToolsetBrief } from "@/api/generated/schemas";
import {
  getGetToolsetsBriefQueryKey,
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

// TODO: replace this function with I18N
function getStatusText(status: McpToolsetStatus): string {
  switch (status) {
    case "connected":
      return "已连接";
    case "connecting":
      return "连接中";
    case "disconnected":
      return "已断开";
    case "error":
      return "错误";
    default:
      return "未知状态";
  }
}

function createToolsetEditTab(toolsetId: number, toolsetName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "toolset",
    title: `编辑：${toolsetName}`,
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
                          getStatusColor(toolset.status ?? "connected")
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getStatusText(toolset.status ?? "connected")}</p>
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
          <span>编辑 Toolset</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem
          className="text-destructive hover:text-destructive!"
          onClick={() => onDelete(toolset)}
        >
          <TrashIcon className="mr-2 size-4 text-destructive" />
          <span>删除 Toolset</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function ToolsetList() {
  const queryClient = useQueryClient();
  const removeTabsPattern = useTabsStore((state) => state.removePattern);

  const deleteToolsetMutation = useDeleteToolset();
  const asyncConfirm = useAsyncConfirm<ToolsetBrief>({
    onConfirm: async (toolset) => {
      await deleteToolsetMutation.mutateAsync({ toolsetId: toolset.id });
      queryClient.invalidateQueries({
        queryKey: getGetToolsetsBriefQueryKey(),
      });

      removeTabsPattern(
        (tab) =>
          tab.type === "toolset" &&
          tab.metadata.mode === "edit" &&
          tab.metadata.id === toolset.id
      );

      toast.success("删除成功", {
        description: "已成功删除 Toolset。",
      });
    },
    onError: (error: Error) => {
      toast.error("删除失败", {
        description: error.message || "删除 Toolset 时发生错误，请稍后重试。",
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
        description={`确定要删除 Toolset "${asyncConfirm.pendingData?.name}" 吗？此操作无法撤销。`}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
