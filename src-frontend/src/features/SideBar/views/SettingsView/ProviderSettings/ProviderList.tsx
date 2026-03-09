import { PencilIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ProviderBrief } from "@/api/generated/schemas";
import { invalidateProviderQueries, useDeleteProvider, useGetProvidersBriefSuspense } from "@/api/provider";
import { ConfirmDeleteDialog } from "@/components/custom/dialog/ConfirmDeteteDialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { i18n } from "@/i18n";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { ProviderTabMetadata, Tab } from "@/types/tab";
import { ProviderBadge } from "./ProviderBadge";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

function createProviderEditTab(providerId: number, providerName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "provider",
    title: i18n.t("settings.providers.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: providerName }),
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
  const { t } = useTranslation("sidebar");

  const handleEditClick = () => {
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
          <span className="text-muted-foreground text-sm">
            {t("settings.providers.list.model_count_with_count", { count: provider.model_count })}
          </span>
        </ItemDescription>
      </ItemContent>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleEditClick}
          title={t("settings.providers.list.edit_provider_title")}
        >
          <PencilIcon className="size-4" />
        </Button>
        <ConfirmDeleteDialog
          description={t("settings.providers.dialog.delete_description_with_name", {
            name: provider.name,
          })}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title={t("settings.providers.list.delete_provider_title")}
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
  const { t } = useTranslation("sidebar");
  const { data } = useGetProvidersBriefSuspense();

  const deleteProviderMutation = useDeleteProvider({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateProviderQueries(variables.providerId);
        removeProviderTab(variables.providerId);

        toast.success(t("settings.providers.toast.delete_success_title"), {
          description: t("settings.providers.toast.delete_success_description"),
        });
      },
      onError(error: Error) {
        toast.error(t("settings.providers.toast.delete_error_title"), {
          description: error.message || t("settings.providers.toast.delete_error_description"),
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
          <EmptyTitle>{t("settings.providers.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("settings.providers.empty.description")}</EmptyDescription>
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
