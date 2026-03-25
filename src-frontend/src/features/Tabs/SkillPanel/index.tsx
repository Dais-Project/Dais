import { useGetSkillSuspense } from "@/api/skill";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkillEditForm } from "@/features/Tabs/SkillPanel/SkillEditForm";
import { useTabsStore } from "@/stores/tabs-store";
import type { SkillTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";
import { TabPanelFrame } from "../TabPanelFrame";
import { SkillCreateForm } from "./SkillCreateForm";

function SkillCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.remove);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <SkillCreateForm onConfirm={handleComplete} />;
}

function SkillEditPanel({
  tabId,
  skillId,
}: {
  tabId: string;
  skillId: number;
}) {
  const removeTab = useTabsStore((state) => state.remove);
  const { data: skill } = useGetSkillSuspense(skillId);
  const handleComplete = () => removeTab(tabId);

  return <SkillEditForm skill={skill} onConfirm={handleComplete} />;
}

export function SkillPanel({
  tabId,
  metadata,
}: TabPanelProps<SkillTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <SkillCreatePanel tabId={tabId} />
      </ScrollArea>
    );
  }

  return (
    <TabPanelFrame>
      <SkillEditPanel tabId={tabId} skillId={metadata.id} />
    </TabPanelFrame>
  );
}
