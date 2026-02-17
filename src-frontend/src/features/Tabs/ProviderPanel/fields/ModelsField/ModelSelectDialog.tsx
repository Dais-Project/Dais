import type { ProviderCreate } from "@/api/generated/schemas";
import { useFetchModels } from "@/api/llm";
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
  const { data, isLoading, refetch } = useFetchModels(provider, {
    query: { enabled: false },
  });

  return (
    <SelectDialog<string>
      mode="multi"
      value={existingModelNames}
      onOpenChange={(open) => {
        open && refetch();
      }}
    >
      <SelectDialogTrigger>{children}</SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder="搜索模型..." />
        <SelectDialogList>
          <SelectDialogEmpty>
            {isLoading ? "加载中..." : "未找到模型"}
          </SelectDialogEmpty>
          <SelectDialogGroup>
            {data?.models?.map((model) => (
              <SelectDialogItem key={model} value={model}>
                {model}
              </SelectDialogItem>
            ))}
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
