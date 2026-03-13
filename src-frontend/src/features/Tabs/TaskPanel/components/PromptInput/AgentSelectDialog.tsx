import { ChevronsUpDownIcon } from "lucide-react";
import { use, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FallbackProps } from "react-error-boundary";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
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
  const { t } = useTranslation(TABS_TASK_NAMESPACE);

  if (error instanceof NoCurrentWorkspaceError) {
    return (
      <Button variant="outline" className="justify-between" disabled>
        {t("prompt.agent.no_workspace")}
      </Button>
    );
  }
  return (
    <Button variant="outline" className="justify-between" disabled>
      {t("prompt.agent.workspace_load_failed")}
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
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
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
          {targetAgent?.name ?? t("prompt.agent.select")}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </SelectDialogTrigger>
      <SelectDialogContent className="p-0">
        <SelectDialogSearch placeholder={t("prompt.agent.search_placeholder")} />
        <SelectDialogList>
          <SelectDialogEmpty>{t("prompt.agent.empty")}</SelectDialogEmpty>
          <SelectDialogGroup>
            {agents.map((agent) => (
              <SelectDialogItem
                key={agent.id}
                value={agent.id}
                keywords={[agent.name]}
              >
                {agent.name}
              </SelectDialogItem>
            ))}
          </SelectDialogGroup>
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}
