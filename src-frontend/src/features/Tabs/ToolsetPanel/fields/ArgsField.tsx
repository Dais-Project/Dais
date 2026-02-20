import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";

export function ArgsField() {
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem
      label="参数"
      description="每行一个参数"
      fieldState={getFieldState("params.args")}
      orientation="vertical"
      align="start"
    >
      <Textarea
        {...register("params.args")}
        placeholder="例如:&#10;--version&#10;--help"
        rows={4}
      />
    </FieldItem>
  );
}
