import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useFormContext } from "react-hook-form";
import {
  useGetAgentsInfinite,
  useGetAgentsSuspenseInfinite,
} from "@/api/agent";
import type { AgentBrief } from "@/api/generated/schemas";
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
import { FailedToLoad } from "@/components/custom/FailedToLoad";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import type { FieldProps } from "../../../../components/custom/form/fields";

function AgentList() {
  const query = useGetAgentsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });
  return (
    <InfiniteScroll
      query={query}
      selectItems={(page) => page.items}
      itemRender={(agent) => (
        <SelectDialogItem key={agent.id} value={agent.id.toString()}>
          {agent.name}
        </SelectDialogItem>
      )}
    />
  );
}

type AgentMultiSelectFieldProps = FieldProps<
  typeof Button,
  {
    initialAgents?: AgentBrief[];
  }
>;

export function AgentMultiSelectField({
  fieldName = "usable_agent_ids",
  fieldProps = { label: "可用 Agent" },
  initialAgents = [],
}: AgentMultiSelectFieldProps) {
  const { getFieldState, register, setValue } = useFormContext();
  const [selectedAgents, setSelectedAgents] =
    useState<AgentBrief[]>(initialAgents);

  const { data: allAgents, isLoading } = useGetAgentsInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const agents: AgentBrief[] =
    allAgents?.pages.flatMap((page) => page.items) ?? [];

  const selectedIdValues = useMemo(
    () => selectedAgents.map((agent) => agent.id.toString()),
    [selectedAgents]
  );

  useEffect(() => {
    register(fieldName);
  }, [fieldName, register]);

  useEffect(() => {
    setSelectedAgents(initialAgents);
    setValue(
      fieldName,
      initialAgents.map((agent) => agent.id),
      {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      }
    );
  }, [fieldName, initialAgents, setValue]);

  function handleConfirm(selectedIds: string[]) {
    const selectedSet = new Set(selectedIds);
    const nextSelectedAgents = agents.filter((agent) =>
      selectedSet.has(agent.id.toString())
    );

    setSelectedAgents(nextSelectedAgents);
    setValue(
      fieldName,
      nextSelectedAgents.map((agent) => agent.id),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    );
  }

  return (
    <div>
      <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
        <SelectDialog mode="multi" value={selectedIdValues}>
          <SelectDialogTrigger>
            <Button type="button" variant="outline" disabled={isLoading}>
              {isLoading && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              {isLoading ? "加载中..." : "选择"}
            </Button>
          </SelectDialogTrigger>
          <SelectDialogContent>
            <SelectDialogSearch placeholder="搜索 Agent..." />
            <SelectDialogList>
              <SelectDialogEmpty>未找到匹配的 Agent</SelectDialogEmpty>
              <SelectDialogGroup>
                <QueryErrorResetBoundary>
                  {({ reset }) => (
                    <ErrorBoundary
                      onReset={reset}
                      fallbackRender={({ resetErrorBoundary }) => (
                        <FailedToLoad
                          refetch={resetErrorBoundary}
                          description="无法加载 Agent 列表，请稍后重试。"
                        />
                      )}
                    >
                      <Suspense>
                        <AgentList />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                </QueryErrorResetBoundary>
              </SelectDialogGroup>
            </SelectDialogList>
            <SelectDialogFooter
              onConfirm={handleConfirm}
              confirmText="确定"
              cancelText="取消"
            />
          </SelectDialogContent>
        </SelectDialog>
      </FieldItem>

      <div className="mt-2 space-y-2">
        {selectedAgents.map((agent) => (
          <Item key={agent.id} variant="outline" size="sm">
            <ItemContent>
              <ItemTitle>{agent.name}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </div>
    </div>
  );
}
