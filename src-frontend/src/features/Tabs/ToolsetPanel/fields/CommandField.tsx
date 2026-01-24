import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { ToolsetCreateFormValues } from "../form-types";

export function CommandField() {
  const { control } = useFormContext<ToolsetCreateFormValues>();

  return (
    <Controller
      name="params.command"
      control={control}
      rules={{ required: "请输入命令" }}
      render={({ field, fieldState }) => (
        <FieldItem title="命令" fieldState={fieldState} align="start">
          <Input {...field} placeholder="uvx, npx, etc." />
        </FieldItem>
      )}
    />
  );
}
