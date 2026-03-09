import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("tabs-provider");
  const { data, refetch } = useFetchModelsSuspense(provider);

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [enabled, refetch]);

  return (
    <>
      <SelectDialogEmpty>{t("models.select.empty")}</SelectDialogEmpty>
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
  const { t } = useTranslation("tabs-provider");
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
        <SelectDialogSearch placeholder={t("models.select.search_placeholder")} />
        <SelectDialogList>
          <SelectDialogGroup>
            <AsyncBoundary
              skeleton={<SelectDialogSkeleton />}
              errorDescription={t("models.select.error_load")}
            >
              <ModelQueryList enabled={open} provider={provider} />
            </AsyncBoundary>
          </SelectDialogGroup>
        </SelectDialogList>
        <SelectDialogFooter
          onConfirm={onConfirm}
          confirmText={t("models.select.confirm")}
          cancelText={t("models.select.cancel")}
        />
      </SelectDialogContent>
    </SelectDialog>
  );
}
