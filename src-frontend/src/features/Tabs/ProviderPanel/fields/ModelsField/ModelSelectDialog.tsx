import { useEffect, useState } from "react";
import type { FetchModelsParams, LlmProviders } from "@/api/generated/schemas";
import { useFetchModelsSuspense } from "@/api/llm";
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

type ModelQueryListProps = {
  enabled: boolean;
  provider: FetchModelsParams;
};

function ModelQueryList({ enabled, provider }: ModelQueryListProps) {
  const { data, refetch } = useFetchModelsSuspense(provider);

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [enabled]);

  return (
    <>
      <SelectDialogEmpty>未找到模型</SelectDialogEmpty>
      {data?.models?.map((model) => (
        <SelectDialogItem key={model} value={model}>
          {model}
        </SelectDialogItem>
      ))}
    </>
  );
}

type ModelSelectDialogProps = {
  children: React.ReactNode;
  provider: {
    type: LlmProviders;
    base_url: string;
    api_key: string;
  };
  existingModelNames: string[];
  onConfirm: (selectedModelNames: string[]) => void;
};

export function ModelSelectDialog({
  children,
  provider,
  existingModelNames,
  onConfirm,
}: ModelSelectDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <SelectDialog<string>
      mode="multi"
      value={existingModelNames}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectDialogTrigger>{children}</SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder="搜索模型..." />
        <SelectDialogList>
          <SelectDialogGroup>
            <AsyncBoundary
              skeleton={<SelectDialogSkeleton />}
              errorDescription="无法加载模型列表，请稍后重试。"
            >
              <ModelQueryList enabled={open} provider={provider} />
            </AsyncBoundary>
          </SelectDialogGroup>
        </SelectDialogList>
        <SelectDialogFooter
          onConfirm={onConfirm}
          confirmText="确认"
          cancelText="取消"
        />
      </SelectDialogContent>
    </SelectDialog>
  );
}
