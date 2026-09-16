import { useGetWorkspaceSuspense } from "@/api/workspace";
import type { WorkspaceTabMetadata } from "@/types/tab";
import { useTabPanelActions } from "../components/TabPanelActions";
import { TabPanelFrame } from "../components/TabPanelFrame";
import type { TabPanelProps } from "../index";
import { WorkspaceCreateForm } from "./WorkspaceCreateForm";
import { WorkspaceEditForm } from "./WorkspaceEditForm";
import { WorkspaceNotesEditForm } from "./WorkspaceNotesEditForm";

function WorkspaceCreatePanel() {
  const { close } = useTabPanelActions();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <WorkspaceCreateForm onConfirm={close} />
    </div>
  );
}

function WorkspaceEditPanel({ workspaceId }: { workspaceId: number }) {
  const { close } = useTabPanelActions();
  const { data: workspace } = useGetWorkspaceSuspense(workspaceId);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <WorkspaceEditForm workspace={workspace} onConfirm={close} />
    </div>
  );
}

function WorkspaceNotesEditPanel({ workspaceId }: { workspaceId: number }) {
  const { close } = useTabPanelActions();
  const { data: workspace } = useGetWorkspaceSuspense(workspaceId, {
    query: {
      staleTime: 0,
      gcTime: 0,
    },
  });

  return <WorkspaceNotesEditForm workspace={workspace} onConfirm={close} />;
}

export function WorkspacePanel({
  id,
  metadata,
}: TabPanelProps<WorkspaceTabMetadata>) {
  switch (metadata.mode) {
    case "create":
      return (
        <TabPanelFrame tabId={id}>
          <WorkspaceCreatePanel />
        </TabPanelFrame>
      );
    case "edit":
      return (
        <TabPanelFrame tabId={id}>
          <WorkspaceEditPanel workspaceId={metadata.id} />
        </TabPanelFrame>
      );
    case "edit-notes":
      return (
        <TabPanelFrame tabId={id}>
          <WorkspaceNotesEditPanel workspaceId={metadata.id} />
        </TabPanelFrame>
      );
  }
}
