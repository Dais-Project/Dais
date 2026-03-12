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
import { useTranslation } from "react-i18next";

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
            <SelectDialogItem<number>
              key={tool.id}
              value={tool.id}
              keywords={[toolset.name, tool.name]}
            >
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
  const { t } = useTranslation("dialog");
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
          {t("resource.tool.trigger.select")}
        </Button>
      </SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder={t("resource.tool.search_placeholder")} />
        <SelectDialogList>
          <SelectDialogEmpty>{t("resource.tool.empty")}</SelectDialogEmpty>
          <AsyncBoundary skeleton={<SelectDialogSkeleton />}>
            <ToolQueryList onFetched={handleFetched} />
          </AsyncBoundary>
        </SelectDialogList>
        <SelectDialogFooter
          onConfirm={onChange}
          confirmText={t("resource.tool.confirm")}
          cancelText={t("resource.tool.cancel")}
        >
          <SelectDialogFooterAction onClick={handleSelectAll}>
            {t("resource.tool.select_all")}
          </SelectDialogFooterAction>
        </SelectDialogFooter>
      </SelectDialogContent>
    </SelectDialog>
  );
}
