import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";
import type { FieldProps } from ".";

export function NameField({
  fieldName = "name",
  fieldProps = { label: "名称" },
  controlProps: { placeholder = "请输入名称", ...controlProps } = {},
}: FieldProps<typeof Input>) {
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <Input
        {...register(fieldName, {
          required: "请输入名称",
          minLength: {
            value: 1,
            message: "名称不能为空",
          },
          maxLength: {
            value: 50,
            message: "名称长度不能超过 50 个字符",
          },
        })}
        {...controlProps}
        placeholder={placeholder}
      />
    </FieldItem>
  );
}
