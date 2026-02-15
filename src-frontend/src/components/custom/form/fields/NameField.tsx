import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Input } from "@/components/ui/input";

type NameFieldProps = {
  fieldName: string;
  label?: string;
};

export function NameField({
  fieldName = "name",
  label = "名称",
}: NameFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fieldState = {
    error: errors[fieldName],
    invalid: !!errors[fieldName],
  };

  return (
    <FieldItem title={label} fieldState={fieldState}>
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
        placeholder="请输入名称"
      />
    </FieldItem>
  );
}
