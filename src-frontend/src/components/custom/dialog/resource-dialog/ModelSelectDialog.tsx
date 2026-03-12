import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("dialog");
  const { data, isLoading } = useGetModelById(model_id);
  if (isLoading) {
    return <Button variant="outline" {...props} disabled>{t("resource.model.trigger.loading")}</Button>;
  }
  if (!data) {
    return <Button variant="outline" {...props}>{t("resource.model.trigger.deleted")}</Button>;
  }
  return <Button variant="outline" {...props}>{data.name}</Button>;
}

function ModelQueryList() {
  const { t } = useTranslation("dialog");
  const query = useGetProvidersSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const providers = useMemo(() => {
    return query.data.pages.flatMap((page) => page.items);
  }, [query.data.pages]);

  return (
    <>
      <SelectDialogEmpty>
        {providers.length === 0
          ? t("resource.model.empty.no_provider")
          : t("resource.model.empty.no_model")}
      </SelectDialogEmpty>
      <InfiniteScroll
        query={query}
        selectItems={(page) => page.items}
        itemRender={(provider, index) => (
          <div key={provider.id}>
            <SelectDialogGroup heading={provider.name}>
              {provider.models.map((model) => (
                <SelectDialogItem
                  key={model.id}
                  value={model.id}
                  keywords={[provider.name, model.name]}
                >
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
  const { t } = useTranslation("dialog");

  return (
    <SelectDialog<number> value={value ?? undefined} onValueChange={onSelect}>
      <SelectDialogTrigger>
        {value ? (
          <ModelSelectTrigger model_id={value} />
        ) : (
          <Button variant="outline">{t("resource.model.trigger.select")}</Button>
        )}
      </SelectDialogTrigger>

      <SelectDialogContent>
        <SelectDialogSearch placeholder={t("resource.model.search_placeholder")} />
        <SelectDialogList className="max-h-96">
          <AsyncBoundary skeleton={<SelectDialogSkeleton />}>
            <ModelQueryList />
          </AsyncBoundary>
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}
