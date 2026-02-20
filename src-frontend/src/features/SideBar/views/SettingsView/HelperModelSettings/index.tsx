import { use, useEffect, useMemo, useRef } from "react";
import type { LlmModelRead } from "@/api/generated/schemas";
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
import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useServerSettingsStore } from "@/stores/server-settings-store";

type ModelQueryListProps = {
  onModelsReady: (models: Map<number, LlmModelRead>) => void;
};

function ModelQueryList({ onModelsReady }: ModelQueryListProps) {
  const query = useGetProvidersSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const providers = useMemo(() => {
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data.pages]);

  const modelMap = useMemo(() => {
    const map = new Map<number, LlmModelRead>();
    for (const provider of providers) {
      for (const model of provider.models) {
        map.set(model.id, model);
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
        {providers.length === 0 ? "暂无供应商，请先添加 LLM 供应商以使用模型。" : "未找到模型"}
      </SelectDialogEmpty>
      <InfiniteScroll
        query={query}
        selectItems={(page) => page.items}
        itemRender={(provider, index) => (
          <div key={provider.id}>
            <SelectDialogGroup heading={provider.name}>
              {provider.models.map((model) => (
                <SelectDialogItem key={model.id} value={model.id}>
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

export function HelperModelSettings() {
  const { currentPromise: serverSettingsPromise, setPartial: setPartialServerSettings } = useServerSettingsStore();
  const serverSettings = use(serverSettingsPromise);

  const modelMapRef = useRef<Map<number, LlmModelRead>>(new Map());

  const selectedModel = useMemo(() => {
    if (serverSettings.flash_model === null) {
      return null;
    }
    return modelMapRef.current.get(serverSettings.flash_model);
  }, [serverSettings?.flash_model]);

  const handleValueChange = (value: number) => {
    setPartialServerSettings({ flash_model: value });
  };

  return (
    <div className="px-4 py-2">
      <SettingItem title="快速模型">
        <SelectDialog<number> value={serverSettings.flash_model ?? undefined} onValueChange={handleValueChange}>
          <SelectDialogTrigger>
            <Button variant="outline">{(serverSettings.flash_model && selectedModel?.name) ?? "选择模型"}</Button>
          </SelectDialogTrigger>

          <SelectDialogContent>
            <SelectDialogSearch placeholder="搜索模型..." />
            <SelectDialogList className="max-h-96">
              <AsyncBoundary skeleton={<SelectDialogSkeleton />} errorDescription="无法加载模型列表，请稍后重试。">
                <ModelQueryList
                  onModelsReady={(models) => {
                    modelMapRef.current = models;
                  }}
                />
              </AsyncBoundary>
            </SelectDialogList>
          </SelectDialogContent>
        </SelectDialog>
      </SettingItem>
    </div>
  );
}
