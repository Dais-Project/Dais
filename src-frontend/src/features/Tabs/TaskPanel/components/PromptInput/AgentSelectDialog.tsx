import { ChevronsUpDownIcon, Loader2Icon } from "lucide-react";
import { useMemo } from "react";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace-store";

type AgentSelectDialogProps = {
  agentId: number | null;
  onChange: (agentId: number) => void;
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
    <SelectDialog
      value={agentId?.toString()}
      onValueChange={(value) => onChange(Number(value))}
    >
      <SelectDialogTrigger>
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
      </SelectDialogTrigger>
      <SelectDialogContent className="p-0">
        <SelectDialogSearch placeholder="Search agent..." />
        <SelectDialogList>
          <SelectDialogEmpty>No agent found.</SelectDialogEmpty>
          <SelectDialogGroup>
            {agents.map((agent) => (
              <SelectDialogItem key={agent.id} value={agent.id.toString()}>
                {agent.name}
              </SelectDialogItem>
            ))}
          </SelectDialogGroup>
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}
