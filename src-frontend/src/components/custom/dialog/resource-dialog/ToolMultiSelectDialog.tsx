import { useGetToolsetsSuspense } from "@/api/toolset";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogFooter,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogSkeleton,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { Button } from "@/components/ui/button";

type ToolMultiSelectDialogProps = {
  selectedToolIds: number[];
  onConfirm: (selectedToolIds: number[]) => void;
};

function ToolQueryList() {
  const { data: toolsets } = useGetToolsetsSuspense();

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

export function ToolMultiSelectDialog({
  selectedToolIds,
  onConfirm,
}: ToolMultiSelectDialogProps) {
  return (
    <SelectDialog<number> mode="multi" value={selectedToolIds}>
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
              <ToolQueryList />
            </AsyncBoundary>
          </SelectDialogGroup>
        </SelectDialogList>
        <SelectDialogFooter
          onConfirm={onConfirm}
          confirmText="确定"
          cancelText="取消"
        />
      </SelectDialogContent>
    </SelectDialog>
  );
}
