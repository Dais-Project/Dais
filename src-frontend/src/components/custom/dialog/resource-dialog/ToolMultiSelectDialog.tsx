import { ToolsetRead } from "@/api/generated/schemas";
import { useGetToolsetsSuspense } from "@/api/toolset";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogFooter,
  SelectDialogFooterAction,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogSkeleton,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

function ToolQueryList({ onFetched }: { onFetched: (toolsets: ToolsetRead[]) => void }) {
  const { data: toolsets } = useGetToolsetsSuspense();

  useEffect(() => {
    onFetched(toolsets);
  }, [toolsets]);

  return (
    <>
      {toolsets.map((toolset) => (
        <SelectDialogGroup key={toolset.id} heading={toolset.name}>
          {toolset.tools.map((tool) => (
            <SelectDialogItem<number> key={tool.id} value={tool.id}>
              {tool.name}
            </SelectDialogItem>
          ))}
        </SelectDialogGroup>
      ))}
    </>
  );
}

type ToolMultiSelectDialogProps = {
  value: number[];
  onChange: (selectedToolIds: number[]) => void;
};

export function ToolMultiSelectDialog({ value, onChange }: ToolMultiSelectDialogProps) {
  const allToolIdsRef = useRef<number[]>([]);

  const handleFetched = (toolsets: ToolsetRead[]) => {
    const allToolIds = toolsets.flatMap((toolset) => toolset.tools.map((tool) => tool.id));
    allToolIdsRef.current = allToolIds;
  };

  const handleSelectAll = () => {
    onChange(allToolIdsRef.current);
  };

  return (
    <SelectDialog<number> mode="multi" value={value}>
      <SelectDialogTrigger>
        <Button type="button" variant="outline">
          选择
        </Button>
      </SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder="搜索工具..." />
        <SelectDialogList>
          <SelectDialogEmpty>未找到匹配的工具</SelectDialogEmpty>
          <SelectDialogGroup>
            <AsyncBoundary
              skeleton={<SelectDialogSkeleton />}
              errorDescription="无法加载工具列表，请稍后重试。"
            >
              <ToolQueryList onFetched={handleFetched} />
            </AsyncBoundary>
          </SelectDialogGroup>
        </SelectDialogList>
        <SelectDialogFooter
          onConfirm={onChange}
          confirmText="确定"
          cancelText="取消"
        >
          <SelectDialogFooterAction onClick={handleSelectAll}>
            全选
          </SelectDialogFooterAction>
        </SelectDialogFooter>
      </SelectDialogContent>
    </SelectDialog>
  );
}
