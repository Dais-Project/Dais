import { useGetToolsetSuspense } from "@/api/toolset";
import { ToolsetEditForm } from "@/features/Tabs/ToolsetPanel/ToolsetEditForm";
import type { ToolsetTabMetadata } from "@/types/tab";
import { useTabPanelActions } from "../components/TabPanelActions";
import { TabPanelFrame } from "../components/TabPanelFrame";
import type { TabPanelProps } from "../index";
import { ToolsetCreateForm } from "./ToolsetCreateForm";

function ToolsetCreatePanel() {
  const { close } = useTabPanelActions();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ToolsetCreateForm onConfirm={close} />
    </div>
  );
}

function ToolsetEditPanel({ toolsetId }: { toolsetId: number }) {
  const { close } = useTabPanelActions();
  const { data: toolset } = useGetToolsetSuspense(toolsetId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ToolsetEditForm toolset={toolset} onConfirm={close} />
    </div>
  );
}

export function ToolsetPanel({
  id,
  metadata,
}: TabPanelProps<ToolsetTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <TabPanelFrame tabId={id}>
        <ToolsetCreatePanel />
      </TabPanelFrame>
    );
  }

  return (
    <TabPanelFrame tabId={id}>
      <ToolsetEditPanel toolsetId={metadata.id} />
    </TabPanelFrame>
  );
}
