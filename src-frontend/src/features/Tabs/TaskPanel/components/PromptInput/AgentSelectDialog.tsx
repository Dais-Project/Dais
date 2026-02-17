import { ChevronsUpDownIcon } from "lucide-react";
import { use, useMemo } from "react";
import type { FallbackProps } from "react-error-boundary";
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

class NoCurrentWorkspaceError extends Error {
  constructor() {
    super("No current workspace");
    this.name = "NoCurrentWorkspaceError";
  }
}

export function AgentSelectErrorFallback({ error }: FallbackProps) {
  if (error instanceof NoCurrentWorkspaceError) {
    return (
      <Button variant="outline" className="justify-between">
        当前未打开工作区
      </Button>
    );
  }
  return (
    <Button variant="outline" className="justify-between">
      工作区加载失败
    </Button>
  );
}

type AgentSelectDialogProps = {
  agentId: number | null;
  onChange: (agentId: number) => void;
};

export function AgentSelectDialog({
  agentId,
  onChange,
}: AgentSelectDialogProps) {
  const currentWorkspacePromise = useWorkspaceStore(
    (state) => state.currentPromise
  );

  if (currentWorkspacePromise === null) {
    throw new NoCurrentWorkspaceError();
  }

  const currentWorkspace = use(currentWorkspacePromise);
  const agents = currentWorkspace?.usable_agents ?? [];
  const targetAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId) ?? null,
    [agents, agentId]
  );

  return (
    <SelectDialog<number> value={agentId ?? undefined} onValueChange={onChange}>
      <SelectDialogTrigger>
        <Button variant="outline" className="justify-between">
          {targetAgent?.name ?? "选择 Agent"}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </SelectDialogTrigger>
      <SelectDialogContent className="p-0">
        <SelectDialogSearch placeholder="Search agent..." />
        <SelectDialogList>
          <SelectDialogEmpty>No agent found.</SelectDialogEmpty>
          <SelectDialogGroup>
            {agents.map((agent) => (
              <SelectDialogItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectDialogItem>
            ))}
          </SelectDialogGroup>
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}
