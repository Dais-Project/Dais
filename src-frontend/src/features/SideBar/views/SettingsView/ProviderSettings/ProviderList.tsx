import { useQueryClient } from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { getGetProvidersBriefQueryKey } from "@/api/generated/endpoints/provider/provider";
import type { ProviderBrief } from "@/api/generated/schemas";
import { useDeleteProvider, useGetProvidersBriefSuspense } from "@/api/provider";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { ProviderTabMetadata, Tab } from "@/types/tab";
import { ProviderBadge } from "./ProviderBadge";

function createProviderEditTab(providerId: number, providerName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "provider",
    title: `编辑：${providerName}`,
    icon: "plug",
    metadata: { mode: "edit", id: providerId },
  };
}

function openProviderEditTab(providerId: number, providerName: string) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "provider" &&
      tab.metadata.mode === "edit" &&
      (tab.metadata as ProviderTabMetadata & { mode: "edit" }).id === providerId
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createProviderEditTab(providerId, providerName);
    addTab(newTab);
  }
}

function removeProviderTab(providerId: number) {
  const { removePattern } = useTabsStore.getState();
  removePattern((tab) => tab.type === "provider" && tab.metadata.mode === "edit" && tab.metadata.id === providerId);
}

type ProviderItemProps = {
  provider: ProviderBrief;
  onEdit: (provider: ProviderBrief) => void;
  onDelete: (provider: ProviderBrief) => void;
  isDeleting: boolean;
};

function ProviderItem({ provider, onEdit, onDelete, isDeleting }: ProviderItemProps) {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(provider);
  };

  const handleDeleteConfirm = () => {
    onDelete(provider);
  };

  return (
    <Item variant="outline" size="sm" className="flex flex-nowrap rounded-none border-t-0 border-r-0 border-l-0">
      <ItemContent>
        <ItemTitle>
          {provider.name}
          <ProviderBadge type={provider.type} />
        </ItemTitle>
        <ItemDescription className="space-x-1">
          <span className="text-muted-foreground text-sm">{provider.model_count} 个模型</span>
        </ItemDescription>
      </ItemContent>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" onClick={handleEditClick} title="编辑服务提供商">
          <PencilIcon className="size-4" />
        </Button>
        <ConfirmDeleteDialog
          description={`确定要删除服务提供商 "${provider.name}" 吗？此操作无法撤销。`}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="删除服务提供商"
            disabled={isDeleting}
            onClick={(e) => e.stopPropagation()}
          >
            <TrashIcon className="size-4" />
          </Button>
        </ConfirmDeleteDialog>
      </div>
    </Item>
  );
}

export function ProviderList() {
  const queryClient = useQueryClient();
  const { data } = useGetProvidersBriefSuspense();

  const deleteProviderMutation = useDeleteProvider({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getGetProvidersBriefQueryKey() });
        removeProviderTab(variables.providerId);

        toast.success("删除成功", {
          description: "已成功删除服务提供商。",
        });
      },
      onError: (error: Error) => {
        toast.error("删除失败", {
          description: error.message || "删除服务提供商时发生错误，请稍后重试。",
        });
      },
    },
  });

  const handleEdit = (provider: ProviderBrief) => {
    openProviderEditTab(provider.id, provider.name);
  };

  const handleDelete = (provider: ProviderBrief) => {
    deleteProviderMutation.mutate({ providerId: provider.id });
  };

  if (data.length === 0) {
    return (
      <Empty>
        <EmptyContent>
          <EmptyTitle>暂无模型服务</EmptyTitle>
          <EmptyDescription>还没有配置任何服务提供商。</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex-1 space-y-2">
      {data.map((provider) => (
        <ProviderItem
          key={provider.id}
          provider={provider}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={deleteProviderMutation.isPending}
        />
      ))}
    </div>
  );
}
