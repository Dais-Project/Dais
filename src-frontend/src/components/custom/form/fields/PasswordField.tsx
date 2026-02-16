import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { PasswordInput } from "@/components/Password";
import type { FieldProps } from ".";

type PasswordFieldProps = FieldProps<typeof PasswordInput>;

export function PasswordField({
  fieldName = "password",
  fieldProps = { label: "密码" },
  controlProps,
}: PasswordFieldProps) {
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <PasswordInput
        {...register(fieldName, {
          required: "请输入密码",
          minLength: {
            value: 1,
            message: "密码不能为空",
          },
        })}
        {...controlProps}
      />
    </FieldItem>
  );
}
