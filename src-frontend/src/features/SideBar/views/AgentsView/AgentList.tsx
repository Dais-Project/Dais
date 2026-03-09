import { PencilIcon, TrashIcon } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateAgentQueries, useDeleteAgent, useGetAgentsSuspenseInfinite } from "@/api/agent";
import type { AgentBrief } from "@/api/generated/schemas";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import {
  ActionableItem,
  ActionableItemIcon,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "@/components/custom/item/ActionableItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import type { IconName } from "@/features/Tabs/AgentPanel/IconSelectDialog";
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { AgentTabMetadata, Tab } from "@/types/tab";

function createAgentEditTab(agentId: number, agentName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "agent",
    title: i18n.t("agents.tab.edit_title_with_name", { ns: "sidebar", name: agentName }),
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

function openAgentEditTab({ tabs, agentId, agentName, addTab, setActiveTab }: OpenAgentEditTabParams) {
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
  agent: AgentBrief;
  onDelete: (agent: AgentBrief) => void;
};

function AgentItem({ agent, onDelete }: AgentItemProps) {
  const { t } = useTranslation("sidebar");
  const tabs = useTabsStore((state) => state.tabs);
  const addTab = useTabsStore((state) => state.add);
  const setActiveTab = useTabsStore((state) => state.setActive);

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
        <ActionableItemInfo title={agent.name} description={agent.model?.name ?? t("agents.list.no_model")} />
      </ActionableItemTrigger>
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon className="mr-2 size-4" />
          <span>{t("agents.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem className="text-destructive hover:text-destructive!" onClick={() => onDelete(agent)}>
          <TrashIcon className="mr-2 size-4 text-destructive" />
          <span>{t("agents.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function AgentList() {
  const { t } = useTranslation("sidebar");
  const removePattern = useTabsStore((state) => state.removePattern);

  const asyncConfirm = useAsyncConfirm<AgentBrief>({
    async onConfirm(agent) {
      await deleteAgentMutation.mutateAsync({ agentId: agent.id });
      await invalidateAgentQueries(agent.id);

      removePattern((tab) => tab.type === "agent" && tab.metadata.mode === "edit" && tab.metadata.id === agent.id);

      toast.success(t("agents.toast.delete_success_title"), {
        description: t("agents.toast.delete_success_description"),
      });
    },
    onError(error: Error) {
      toast.error(t("agents.toast.delete_error_title"), {
        description: error.message || t("agents.toast.delete_error_description"),
      });
    },
  });

  const query = useGetAgentsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const deleteAgentMutation = useDeleteAgent({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateAgentQueries(variables.agentId);
        toast.success(t("agents.toast.delete_success_title"), {
          description: t("agents.toast.delete_success_description"),
        });
      },
      onError(error: Error) {
        toast.error(t("agents.toast.delete_error_title"), {
          description: error.message || t("agents.toast.delete_error_description"),
        });
      },
    },
  });

  return (
    <>
      <ScrollArea className="flex-1">
        <InfiniteScroll
          query={query}
          selectItems={(page) => page.items}
          itemRender={(agent) => <AgentItem key={agent.id} agent={agent} onDelete={asyncConfirm.trigger} />}
        />
      </ScrollArea>
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={t("agents.dialog.delete_description_with_name", {
          name: asyncConfirm.pendingData?.name ?? "",
        })}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
