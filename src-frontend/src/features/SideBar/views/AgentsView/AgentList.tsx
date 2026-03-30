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
import { useAsyncConfirm } from "@/hooks/use-async-confirm";
import { i18n } from "@/i18n";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { resolveIconName } from "@/lib/resolve-iconname";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";

function createAgentEditTab(agentId: number, agentName: string): Tab {
  return {
    type: "agent",
    title: i18n.t("agents.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: agentName }),
    icon: "bot",
    metadata: { mode: "edit", id: agentId },
  };
}

type OpenAgentEditTabParams = {
  agentId: number;
  agentName: string;
};

function openAgentEditTab({ agentId, agentName }: OpenAgentEditTabParams) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "agent" &&
      tab.metadata.mode === "edit" &&
      tab.metadata.id === agentId
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
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openAgentEditTab({
      agentId: agent.id,
      agentName: agent.name,
    });
  };
  return (
    <ActionableItem>
      <ActionableItemTrigger>
        <ActionableItemIcon seed={agent.name}>
          <DynamicIcon name={resolveIconName(agent.icon_name, "bot")} />
        </ActionableItemIcon>
        <ActionableItemInfo title={agent.name} description={agent.model?.name ?? t("agents.list.no_model")} />
      </ActionableItemTrigger>
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon />
          <span>{t("agents.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete(agent)}>
          <TrashIcon />
          <span>{t("agents.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function AgentList() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);

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
      }
    },
  });

  const asyncConfirm = useAsyncConfirm<AgentBrief>({
    async onConfirm(agent) {
      await deleteAgentMutation.mutateAsync({ agentId: agent.id });
      await invalidateAgentQueries(agent.id);

      removeTabs((tab) => (tab.type === "agent" &&
        tab.metadata.mode === "edit" &&
        tab.metadata.id === agent.id));

      toast.success(t("agents.toast.delete_success_title"), {
        description: t("agents.toast.delete_success_description"),
      });
    }
  });

  return (
    <>
      <ScrollArea className="flex-1 limit-width">
        <InfiniteScroll
          query={query}
          selectItems={(page) => page.items}
          itemRender={(agent) => (
            <AgentItem
              key={agent.id}
              agent={agent}
              onDelete={asyncConfirm.trigger}
            />
          )}
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
