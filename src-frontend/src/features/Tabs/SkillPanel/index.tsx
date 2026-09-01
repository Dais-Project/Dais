import { useGetSkillSuspense } from "@/api/skill";
import { SkillEditForm } from "@/features/Tabs/SkillPanel/SkillEditForm";
import type { SkillTabMetadata } from "@/types/tab";
import { useTabPanelActions } from "../components/TabPanelActions";
import { TabPanelFrame } from "../components/TabPanelFrame";
import type { TabPanelProps } from "../index";
import { SkillCreateForm } from "./SkillCreateForm";

function SkillCreatePanel() {
  const { close } = useTabPanelActions();

  return <SkillCreateForm onConfirm={close} />;
}

function SkillEditPanel({ skillId }: { skillId: number }) {
  const { close } = useTabPanelActions();
  const { data: skill } = useGetSkillSuspense(skillId);

  return <SkillEditForm skill={skill} onConfirm={close} />;
}

export function SkillPanel({
  id,
  metadata,
}: TabPanelProps<SkillTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <TabPanelFrame tabId={id}>
        <SkillCreatePanel />
      </TabPanelFrame>
    );
  }

  return (
    <TabPanelFrame tabId={id}>
      <SkillEditPanel skillId={metadata.id} />
    </TabPanelFrame>
  );
}
