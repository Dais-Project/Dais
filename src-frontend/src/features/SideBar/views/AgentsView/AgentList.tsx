import { useQueryClient } from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import React from "react";
import { toast } from "sonner";
import {
  getGetAgentsQueryKey,
  useDeleteAgent,
  useGetAgentsSuspense,
} from "@/api/agent";
import type { AgentRead } from "@/api/generated/schemas";
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
import type { IconName } from "@/features/Tabs/AgentPanel/IconSelectDialog";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { AgentTabMetadata, Tab } from "@/types/tab";

function createAgentEditTab(agentId: number, agentName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "agent",
    title: `编辑：${agentName}`,
    icon: "bot",
    metadata: { mode: "edit", id: agentId },
  };
}

type OpenAgentEditTabParams = {
  tabs: Tab[];
  agentId: number;
  agentName: string;
  addTab: (tab: Tab) => void;
  setActiveTab: (tabId: string) => void;
};

function openAgentEditTab({
  tabs,
  agentId,
  agentName,
  addTab,
  setActiveTab,
}: OpenAgentEditTabParams) {
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "agent" &&
      tab.metadata.mode === "edit" &&
      (tab.metadata as AgentTabMetadata & { mode: "edit" }).id === agentId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createAgentEditTab(agentId, agentName);
    addTab(newTab);
  }
}

type AgentItemProps = {
  agent: AgentRead;
  onDelete: (agent: AgentRead) => void;
};

function AgentItem({ agent, onDelete }: AgentItemProps) {
  const { tabs, addTab, setActiveTab } = useTabsStore();
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openAgentEditTab({
      tabs,
      agentId: agent.id,
      agentName: agent.name,
      addTab,
      setActiveTab,
    });
  };
  return (
    <ActionableItem>
      <ActionableItemTrigger>
        <ActionableItemIcon seed={agent.name}>
          <DynamicIcon name={agent.icon_name as IconName} />
        </ActionableItemIcon>
        {/* <AgentAvatar name={agent.name} iconName={agent.icon_name} size={18} /> */}
        <ActionableItemInfo
          title={agent.name}
          description={agent.model ? agent.model.name : "未关联模型"}
        />
      </ActionableItemTrigger>
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon className="mr-2 size-4" />
          <span>编辑 Agent</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem
          className="text-destructive hover:text-destructive!"
          onClick={() => onDelete(agent)}
        >
          <TrashIcon className="mr-2 size-4 text-destructive" />
          <span>删除 Agent</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

const MemoizedAgentItem = React.memo(
  AgentItem,
  (prev, next) =>
    prev.agent.id === next.agent.id &&
    prev.agent.name === next.agent.name &&
    prev.agent.icon_name === next.agent.icon_name &&
    prev.agent.model?.name === next.agent.model?.name
);

export function AgentList() {
  const queryClient = useQueryClient();
  const { tabs, removeTab } = useTabsStore();
  const asyncConfirm = useAsyncConfirm<AgentRead>({
    onConfirm: async (agent) => {
      await deleteAgentMutation.mutateAsync({ agentId: agent.id });
      queryClient.invalidateQueries({ queryKey: getGetAgentsQueryKey() });

      const tabsToRemove = tabs.filter(
        (tab) =>
          tab.type === "agent" &&
          tab.metadata.mode === "edit" &&
          tab.metadata.id === agent.id
      );

      for (const tab of tabsToRemove) {
        removeTab(tab.id);
      }

      toast.success("删除成功", {
        description: "已成功删除 Agent。",
      });
    },
    onError: (error: Error) => {
      toast.error("删除失败", {
        description: error.message || "删除 Agent 时发生错误，请稍后重试。",
      });
    },
  });

  const { data } = useGetAgentsSuspense();

  const deleteAgentMutation = useDeleteAgent();

  return (
    <>
      <ScrollArea className="flex-1">
        {data?.items.map((agent) => (
          <MemoizedAgentItem
            key={agent.id}
            agent={agent}
            onDelete={asyncConfirm.trigger}
          />
        ))}
      </ScrollArea>
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={`确定要删除 Agent "${asyncConfirm.pendingData?.name}" 吗？此操作无法撤销。`}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
