import { ChevronsUpDownIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";
import { SingleSelectDialog } from "@/components/custom/dialog/SingleSelectDialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace-store";

type AgentSelectDialogProps = {
  agentId: number | null;
  onChange: (agentId: number | null) => void;
};

export function AgentSelectDialog({
  agentId,
  onChange,
}: AgentSelectDialogProps) {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const isCurrentWorkspaceLoading = useWorkspaceStore(
    (state) => state.isLoading
  );
  const agents = currentWorkspace?.usable_agents ?? [];
  const targetAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId) ?? null,
    [agents, agentId]
  );

  let buttonText = "Select agent";
  if (isCurrentWorkspaceLoading) {
    buttonText = "Loading...";
  } else if (agentId) {
    buttonText = targetAgent?.name ?? "";
  }

  return (
    <SingleSelectDialog
      isSelected={(agent) => agent.id === agentId}
      selections={agents}
      getValue={(agent) => agent.id.toString()}
      onSelect={(agent) => onChange(agent.id)}
      placeholder="Search agent..."
      emptyText="No agent found."
    >
      <Button
        variant="outline"
        role="combobox"
        className="justify-between"
        disabled={isCurrentWorkspaceLoading}
      >
        {buttonText}
        {isCurrentWorkspaceLoading ? (
          <Loader2Icon className="ml-2 size-4 shrink-0 animate-spin" />
        ) : (
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        )}
      </Button>
    </SingleSelectDialog>
  );
}
