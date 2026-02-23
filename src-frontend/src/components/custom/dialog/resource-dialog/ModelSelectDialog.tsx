import { useMemo } from "react";
import { useGetModelById } from "@/api/llm-model";
import { useGetProvidersSuspenseInfinite } from "@/api/provider";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogSeparator,
  SelectDialogSkeleton,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import { Button } from "@/components/ui/button";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";

type ModelSelectTriggerProps = {
  model_id: number;
} & React.ComponentProps<typeof Button>;

function ModelSelectTrigger({ model_id, ...props }: ModelSelectTriggerProps) {
  const { data, isLoading } = useGetModelById(model_id);
  if (isLoading) {
    return <Button variant="outline" {...props} disabled>加载中...</Button>;
  }
  if (!data) {
    return <Button variant="outline" {...props}>模型已被删除</Button>;
  }
  return <Button variant="outline" {...props}>{data.name}</Button>;
}

function ModelQueryList() {
  const query = useGetProvidersSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const providers = useMemo(() => {
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data.pages]);

  return (
    <>
      <SelectDialogEmpty>
        {providers.length === 0 ? "暂无供应商，请先添加 LLM 供应商以使用模型。" : "未找到模型"}
      </SelectDialogEmpty>
      <InfiniteScroll
        query={query}
        selectItems={(page) => page.items}
        itemRender={(provider, index) => (
          <div key={provider.id}>
            <SelectDialogGroup heading={provider.name}>
              {provider.models.map((model) => (
                <SelectDialogItem key={model.id} value={model.id.toString()}>
                  {model.name}
                </SelectDialogItem>
              ))}
            </SelectDialogGroup>
            {index < providers.length - 1 && <SelectDialogSeparator />}
          </div>
        )}
      />
    </>
  );
}

type ModelSelectDialogProps = {
  /** the selected model id */
  value: number | null;
  onChange: (model_id: number) => void;
};

export function ModelSelectDialog({ value, onChange: onSelect }: ModelSelectDialogProps) {
  return (
    <SelectDialog<number> value={value ?? undefined} onValueChange={onSelect}>
      <SelectDialogTrigger>
        {value ? <ModelSelectTrigger model_id={value} /> : <Button variant="outline">选择模型</Button>}
      </SelectDialogTrigger>

      <SelectDialogContent>
        <SelectDialogSearch placeholder="搜索模型..." />
        <SelectDialogList className="max-h-96">
          <AsyncBoundary skeleton={<SelectDialogSkeleton />} errorDescription="无法加载模型列表，请稍后重试。">
            <ModelQueryList />
          </AsyncBoundary>
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}
