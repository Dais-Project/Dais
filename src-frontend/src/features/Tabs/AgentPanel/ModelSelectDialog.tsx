import { Loader2Icon } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { LlmModelRead } from "@/api/generated/schemas";
import { useGetProvidersSuspenseInfinite } from "@/api/provider";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogSeparator,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import { Button } from "@/components/ui/button";

type ModelSelectDialogProps = {
  selectedModel: LlmModelRead | null;
  onSelect: (model: LlmModelRead) => void;
};

type ModelSelectDialogItemsProps = {
  onModelsReady: (models: Map<string, LlmModelRead>) => void;
};

function ModelSelectDialogItems({
  onModelsReady,
}: ModelSelectDialogItemsProps) {
  const query = useGetProvidersSuspenseInfinite();

  const providers = useMemo(() => {
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data.pages]);

  const modelMap = useMemo(() => {
    const map = new Map<string, LlmModelRead>();
    for (const provider of providers) {
      for (const model of provider.models) {
        map.set(model.id.toString(), model);
      }
    }
    return map;
  }, [providers]);

  useEffect(() => {
    onModelsReady(modelMap);
  }, [modelMap, onModelsReady]);

  return (
    <>
      <SelectDialogEmpty>
        {providers.length === 0
          ? "暂无供应商，请先添加 LLM 供应商以使用模型。"
          : "未找到模型"}
      </SelectDialogEmpty>
      {providers.length > 0 && (
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
      )}
    </>
  );
}

function ModelSelectDialogLoading() {
  return (
    <div className="flex items-center px-2 py-6 text-muted-foreground text-sm">
      <Loader2Icon className="mr-2 size-4 animate-spin" />
      正在加载模型列表...
    </div>
  );
}

export function ModelSelectDialog({
  selectedModel,
  onSelect,
}: ModelSelectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modelMapRef = useRef<Map<string, LlmModelRead>>(new Map());

  const handleValueChange = (value: string) => {
    const model = modelMapRef.current.get(value);
    if (model) {
      onSelect(model);
    }
  };

  return (
    <SelectDialog<string>
      value={selectedModel?.id.toString()}
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectDialogTrigger>
        <Button variant="outline">
          {selectedModel ? selectedModel.name : "选择模型"}
        </Button>
      </SelectDialogTrigger>

      <SelectDialogContent>
        <SelectDialogSearch placeholder="搜索模型..." />
        <SelectDialogList className="max-h-96">
          {isOpen ? (
            <Suspense fallback={<ModelSelectDialogLoading />}>
              <ModelSelectDialogItems
                onModelsReady={(models) => {
                  modelMapRef.current = models;
                }}
              />
            </Suspense>
          ) : null}
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}
