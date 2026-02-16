import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";

export function ArgsField() {
  const { control } = useFormContext();

  return (
    <Controller
      name="params.args"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem
          label="参数"
          description="每行一个参数"
          fieldState={fieldState}
          orientation="vertical"
          align="start"
        >
          <Textarea
            {...field}
            placeholder="例如:&#10;--version&#10;--help"
            rows={4}
          />
        </FieldItem>
      )}
    />
  );
}
