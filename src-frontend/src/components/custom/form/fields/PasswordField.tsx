import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { PasswordInput } from "@/components/Password";

type PasswordFieldProps = {
  fieldName?: string;
  label?: string;
  placeholder?: string;
};

export function PasswordField({
  fieldName = "password",
  label = "密码",
  placeholder = "请输入密码",
}: PasswordFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={fieldName}
      control={control}
      rules={{
        required: "请输入密码",
        minLength: {
          value: 1,
          message: "密码不能为空",
        },
      }}
      render={({ field, fieldState }) => (
        <FieldItem title={label} fieldState={fieldState}>
          <PasswordInput {...field} placeholder={placeholder} />
        </FieldItem>
      )}
    />
  );
}
