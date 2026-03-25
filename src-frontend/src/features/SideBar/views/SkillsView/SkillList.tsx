import { PencilIcon, ScrollTextIcon, TrashIcon } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateSkillQueries, useDeleteSkill, useGetSkillsSuspenseInfinite } from "@/api/skill";
import type { SkillBrief } from "@/api/generated/schemas";
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
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab, SkillTabMetadata } from "@/types/tab";

function createSkillEditTab(skillId: number, skillName: string): Tab {
  return {
    id: tabIdFactory(),
    type: "skill",
    title: i18n.t("skills.tab.edit_title_with_name", { ns: SIDEBAR_NAMESPACE, name: skillName }),
    icon: "scroll-text",
    metadata: { mode: "edit", id: skillId },
  };
}

function openSkillEditTab(skillId: number, skillName: string) {
  const { tabs, add: addTab, setActive: setActiveTab } = useTabsStore.getState();
  const existingTab = tabs.find(
    (tab) =>
      tab.type === "skill" &&
      tab.metadata.mode === "edit" &&
      (tab.metadata as SkillTabMetadata & { mode: "edit" }).id === skillId,
  );

  if (existingTab) {
    setActiveTab(existingTab.id);
  } else {
    const newTab = createSkillEditTab(skillId, skillName);
    addTab(newTab);
  }
}

type SkillItemProps = {
  skill: SkillBrief;
  onDelete: (skill: SkillBrief) => void;
};

function SkillItem({ skill, onDelete }: SkillItemProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openSkillEditTab(skill.id, skill.name);
  };

  return (
    <ActionableItem>
      <ActionableItemTrigger>
        <ActionableItemIcon seed={skill.name}>
          <ScrollTextIcon />
        </ActionableItemIcon>
        <ActionableItemInfo
          title={skill.name}
          description={skill.description || t("skills.list.no_description")}
        />
      </ActionableItemTrigger>
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={handleEdit}>
          <PencilIcon />
          <span>{t("skills.menu.edit")}</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem variant="destructive" onClick={() => onDelete(skill)}>
          <TrashIcon />
          <span>{t("skills.menu.delete")}</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}

export function SkillList() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const removeTabs = useTabsStore((state) => state.remove);

  const query = useGetSkillsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const deleteSkillMutation = useDeleteSkill({
    mutation: {
      async onSuccess(_, variables) {
        await invalidateSkillQueries(variables.skillId);
        toast.success(t("skills.toast.delete_success_title"), {
          description: t("skills.toast.delete_success_description"),
        });
      },
    },
  });

  const asyncConfirm = useAsyncConfirm<SkillBrief>({
    async onConfirm(skill) {
      await deleteSkillMutation.mutateAsync({ skillId: skill.id });
      await invalidateSkillQueries(skill.id);

      removeTabs((tab) => (
        tab.type === "skill" &&
        tab.metadata.mode === "edit" &&
        tab.metadata.id === skill.id
      ));

      toast.success(t("skills.toast.delete_success_title"), {
        description: t("skills.toast.delete_success_description"),
      });
    },
  });

  return (
    <>
      <ScrollArea className="flex-1">
        <InfiniteScroll
          query={query}
          selectItems={(page) => page.items}
          itemRender={(skill) => (
            <SkillItem
              key={skill.id}
              skill={skill}
              onDelete={asyncConfirm.trigger}
            />
          )}
        />
      </ScrollArea>
      <ConfirmDeleteDialog
        open={asyncConfirm.isOpen}
        description={t("skills.dialog.delete_description_with_name", {
          name: asyncConfirm.pendingData?.name ?? "",
        })}
        onConfirm={asyncConfirm.confirm}
        onCancel={asyncConfirm.cancel}
        isDeleting={asyncConfirm.isPending}
      />
    </>
  );
}
