import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";

type NameFieldProps = {
  fieldName: string;
  label?: string;
};

export function NameField({ fieldName = "name", label }: NameFieldProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={fieldName}
      control={control}
      rules={{
        required: "请输入名称",
        minLength: {
          value: 1,
          message: "名称不能为空",
        },
        maxLength: {
          value: 50,
          message: "名称长度不能超过 50 个字符",
        },
      }}
      render={({ field, fieldState }) => (
        <FieldItem title={label ?? "名称"} fieldState={fieldState}>
          <Input {...field} placeholder="请输入名称" />
        </FieldItem>
      )}
    />
  );
}
