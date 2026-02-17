import { useEffect, useState } from "react";
import type { ProviderCreate } from "@/api/generated/schemas";
import { useFetchModelsSuspense } from "@/api/llm";
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
import { TanstackSuspenseContainer } from "@/components/custom/TanstackSuspenseContainer";

type ModelQueryListProps = {
  enabled: boolean;
  provider: ProviderCreate;
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
  provider: ProviderCreate;
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
          <SelectDialogEmpty>未找到模型</SelectDialogEmpty>
          <SelectDialogGroup>
            <TanstackSuspenseContainer
              fallback={<SelectDialogSkeleton />}
              errorDescription="无法加载模型列表，请稍后重试。"
            >
              <ModelQueryList enabled={open} provider={provider} />
            </TanstackSuspenseContainer>
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
