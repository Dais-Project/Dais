import {
  type RegisterOptions,
  useController,
  useFormContext,
} from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Vditor } from "@/components/custom/Vditor";
import type { FieldProps } from ".";

function createRichTextRules(
  label: string,
  required: boolean,
  minLength: number,
  maxLength: number | undefined
) {
  const rules: RegisterOptions = {};
  if (required) {
    rules.required = `请输入${label}`;
  }
  if (minLength !== undefined) {
    rules.minLength = {
      value: minLength,
      message: `${label}不能少于 ${minLength} 个字符`,
    };
  }
  if (maxLength !== undefined) {
    rules.maxLength = {
      value: maxLength,
      message: `${label}不能超过 ${maxLength} 个字符`,
    };
  }
  return rules;
}

type RichTextFieldProps = FieldProps<
  Omit<React.ComponentProps<typeof Vditor>, "initialValue" | "onChange">,
  {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  }
>;

export function RichTextField({
  fieldName,
  required = false,
  minLength = 1,
  maxLength,
  controlProps,
  fieldProps = { label: "内容" },
}: RichTextFieldProps) {
  const { control, getFieldState } = useFormContext();
  const { field } = useController({
    name: fieldName,
    control,
    rules: createRichTextRules(fieldProps.label as string, required, minLength, maxLength),
  });
  return (
    <FieldItem
      fieldState={getFieldState(fieldName)}
      orientation="vertical"
      {...fieldProps}
    >
      <Vditor
        initialValue={field.value}
        onChange={field.onChange}
        {...controlProps}
      />
    </FieldItem>
  );
}
