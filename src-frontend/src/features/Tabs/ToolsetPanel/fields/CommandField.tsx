import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { ToolsetCreateFormValues } from "../form-types";

export function CommandField() {
  const { register, getFieldState } = useFormContext<ToolsetCreateFormValues>();

  return (
    <FieldItem
      label="命令"
      fieldState={getFieldState("params.command")}
      align="start"
    >
      <Input {...register("params.command", { required: "请输入命令" })} />
    </FieldItem>
  );
}
