import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import type { AgentCreateFormValues } from "../form-types";
import { ModelSelectDialog } from "@/components/custom/dialog/resource-dialog/ModelSelectDialog";

export function AgentModelField() {
  const { control } = useFormContext<AgentCreateFormValues>();

  return (
    <Controller
      name="model_id"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem label="关联模型" fieldState={fieldState}>
          <ModelSelectDialog
            value={field.value}
            onChange={field.onChange}
          />
        </FieldItem>
      )}
    />
  );
}
