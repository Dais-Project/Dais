import { useTranslation } from "react-i18next";
import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { ModelSelectDialog } from "@/components/custom/dialog/resource-dialog/ModelSelectDialog";
import type { AgentCreateFormValues } from "../form-types";

export function AgentModelField() {
  const { t } = useTranslation("tabs-agent");
  const { control } = useFormContext<AgentCreateFormValues>();

  return (
    <Controller
      name="model_id"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem label={t("form.model.label")} fieldState={fieldState}>
          <ModelSelectDialog
            value={field.value}
            onChange={field.onChange}
          />
        </FieldItem>
      )}
    />
  );
}
