import { ChevronsUpDownIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useGetWorkspaceSuspense } from "@/api/workspace";

type AgentSelectDialogProps = {
  agentId: number | null;
  workspaceId: number;
  onChange: (agentId: number) => void;
};

export function AgentSelectDialog({
  agentId,
  workspaceId,
  onChange,
}: AgentSelectDialogProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { data: workspace } = useGetWorkspaceSuspense(workspaceId);
  const agents = workspace.usable_agents;
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
