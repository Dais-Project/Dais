import type { IconName } from "lucide-react/dynamic";
import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import type { AgentCreateFormValues } from "../form-types";
import { IconSelectDialog } from "../IconSelectDialog";

export function AgentIconField() {
  const { control } = useFormContext<AgentCreateFormValues>();

  return (
    <Controller
      name="icon_name"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem label="图标" fieldState={fieldState}>
          <IconSelectDialog
            value={field.value as IconName}
            onChange={field.onChange}
          />
        </FieldItem>
      )}
    />
  );
}
