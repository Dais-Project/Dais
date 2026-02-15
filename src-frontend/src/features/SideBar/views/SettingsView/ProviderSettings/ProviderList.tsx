import { useQueryClient } from "@tanstack/react-query";
import { PencilIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { LlmProviders, type ProviderRead } from "@/api/generated/schemas";
import {
  getGetProvidersQueryKey,
  useDeleteProvider,
  useGetProvidersSuspense,
} from "@/api/provider";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { PROVIDER_TYPE_LABELS } from "@/constants/provider";
import { tabIdFactory } from "@/lib/tab";
import { cn } from "@/lib/utils";
import { useTabsStore } from "@/stores/tabs-store";
import type { ProviderTabMetadata, Tab } from "@/types/tab";

const PROVIDER_TYPE_COLORS: Partial<Record<LlmProviders, string>> = {
  [LlmProviders.openai]:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  [LlmProviders.anthropic]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [LlmProviders.gemini]:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

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
  const { tabs, addTab, setActiveTab } = useTabsStore.getState();
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
  const { tabs, removeTab } = useTabsStore.getState();
  const tabsToRemove = tabs.filter(
    (tab) =>
      tab.type === "provider" &&
      tab.metadata.mode === "edit" &&
      tab.metadata.id === providerId
  );

  for (const tab of tabsToRemove) {
    removeTab(tab.id);
  }
}

type ProviderItemProps = {
  provider: ProviderRead;
};

function ProviderItem({ provider }: ProviderItemProps) {
  const queryClient = useQueryClient();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openProviderEditTab(provider.id, provider.name);
  };

  const deleteProviderMutation = useDeleteProvider({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProvidersQueryKey() });
        removeProviderTab(provider.id);

        toast.success("删除成功", {
          description: "已成功删除服务提供商。",
        });
      },
      onError: (error: Error) => {
        toast.error("删除失败", {
          description:
            error.message || "删除服务提供商时发生错误，请稍后重试。",
        });
      },
    },
  });

  const handleDeleteConfirm = () => {
    deleteProviderMutation.mutate({ providerId: provider.id });
  };

  return (
    <Item
      variant="outline"
      size="sm"
      className="flex flex-nowrap rounded-none border-t-0 border-r-0 border-l-0"
    >
      <ItemContent>
        <ItemTitle>
          {provider.name}
          <Badge
            className={cn(
              PROVIDER_TYPE_COLORS[provider.type],
              "px-1.5 text-[0.6rem]"
            )}
          >
            {PROVIDER_TYPE_LABELS[provider.type]}
          </Badge>
        </ItemTitle>
        <ItemDescription className="space-x-1">
          <span className="text-muted-foreground text-sm">
            {provider.models.length} 个模型
          </span>
        </ItemDescription>
      </ItemContent>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleEdit}
          title="编辑服务提供商"
        >
          <PencilIcon className="size-4" />
        </Button>
        <ConfirmDeleteDialog
          description={`确定要删除服务提供商 "${provider.name}" 吗？此操作无法撤销。`}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteProviderMutation.isPending}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="删除服务提供商"
            disabled={deleteProviderMutation.isPending}
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
  const { data: providers = [] } = useGetProvidersSuspense({
    query: {
      queryKey: getGetProvidersQueryKey(),
    },
  });

  if (providers.length === 0) {
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
      {providers.map((provider) => (
        <ProviderItem key={provider.id} provider={provider} />
      ))}
    </div>
  );
}
