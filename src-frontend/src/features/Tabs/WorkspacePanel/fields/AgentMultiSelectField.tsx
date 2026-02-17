import { useMemo } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useGetAgentsSuspenseInfinite } from "@/api/agent";
import type { AgentBrief, AgentRead } from "@/api/generated/schemas";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogFooter,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { TanstackSuspenseContainer } from "@/components/custom/TanstackSuspenseContainer";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
  WorkspaceCreateFormValues,
  WorkspaceEditFormValues,
} from "../form-types";

function AgentQueryList() {
  const query = useGetAgentsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });
  return (
    <InfiniteScroll
      query={query}
      selectItems={(page) => page.items}
      itemRender={(agent) => (
        <SelectDialogItem<number> key={agent.id} value={agent.id}>
          {agent.name}
        </SelectDialogItem>
      )}
    />
  );
}

function AgentSelectedList({
  selectedAgentIds,
}: {
  selectedAgentIds: number[];
}) {
  const usableAgents = useWorkspaceStore(
    (state) => state.currentWorkspace?.usable_agents
  );
  const { data } = useGetAgentsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });
  const usableAgentMap = useMemo(() => {
    const map = new Map<number, AgentRead>();
    for (const agent of usableAgents ?? []) {
      map.set(agent.id, agent);
    }
    return map;
  }, [usableAgents]);
  const fetchedAgentMap = useMemo(() => {
    if (!data) {
      return new Map<number, AgentBrief>();
    }
    const map = new Map<number, AgentBrief>();
    for (const agent of data.pages.flatMap((page) => page.items)) {
      map.set(agent.id, agent);
    }
    return map;
  }, [data]);

  const selectedAgents = useMemo(() => {
    const agents: AgentBrief[] = [];
    for (const id of selectedAgentIds) {
      const agent1 = usableAgentMap.get(id);
      if (agent1) {
        agents.push(agent1);
        continue;
      }
      const agent2 = fetchedAgentMap.get(id);
      if (agent2) {
        agents.push(agent2);
      }
    }
    return agents;
  }, [usableAgents, data]);
  return (
    <div className="mt-2 space-y-2">
      {selectedAgents.map((agent) => (
        <Item key={agent.id} variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>{agent.name}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}

export function AgentMultiSelectField() {
  const { control } = useFormContext<
    WorkspaceCreateFormValues | WorkspaceEditFormValues
  >();
  const {
    field: { value, onChange },
    fieldState,
  } = useController({
    name: "usable_agent_ids",
    control,
  });

  return (
    <div>
      <FieldItem label="可用的 Agent" fieldState={fieldState}>
        <SelectDialog<number> mode="multi" value={value}>
          <SelectDialogTrigger>
            <Button type="button" variant="outline">
              选择
            </Button>
          </SelectDialogTrigger>
          <SelectDialogContent>
            <SelectDialogSearch placeholder="搜索 Agent..." />
            <SelectDialogList>
              <SelectDialogEmpty>未找到匹配的 Agent</SelectDialogEmpty>
              <SelectDialogGroup>
                <TanstackSuspenseContainer errorDescription="无法加载 Agent 列表，请稍后重试。">
                  <AgentQueryList />
                </TanstackSuspenseContainer>
              </SelectDialogGroup>
            </SelectDialogList>
            <SelectDialogFooter
              onConfirm={onChange}
              confirmText="确定"
              cancelText="取消"
            />
          </SelectDialogContent>
        </SelectDialog>
      </FieldItem>

      <TanstackSuspenseContainer errorDescription="无法加载 Agent 列表，请稍后重试。">
        <AgentSelectedList selectedAgentIds={value} />
      </TanstackSuspenseContainer>
    </div>
  );
}
