import { useGetSkillSuspense } from "@/api/skill";
import { SkillEditForm } from "@/features/Tabs/SkillPanel/SkillEditForm";
import type { SkillTabMetadata } from "@/types/tab";
import { useTabPanelActions } from "../components/TabPanelActions";
import { TabPanelFrame } from "../components/TabPanelFrame";
import type { TabPanelProps } from "../index";
import { SkillCreateForm } from "./SkillCreateForm";

function SkillCreatePanel() {
  const { close } = useTabPanelActions();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <SkillCreateForm onConfirm={close} />
    </div>
  );
}

function SkillEditPanel({ skillId }: { skillId: number }) {
  const { close } = useTabPanelActions();
  const { data: skill } = useGetSkillSuspense(skillId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <SkillEditForm skill={skill} onConfirm={close} />
    </div>
  );
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
