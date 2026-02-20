import {
  Controller,
  type RegisterOptions,
  useFormContext,
} from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";
import type { FieldProps } from ".";

type RichTextFieldProps = FieldProps<
  typeof MinimalTiptapEditor,
  {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    editorClassName?: string;
  }
>;

export function RichTextField({
  fieldName,
  required = false,
  minLength = 1,
  maxLength,
  fieldProps = { label: "内容" },
  controlProps = { editorClassName: "min-h-[8em]" },
}: RichTextFieldProps) {
  const { control } = useFormContext();

  const rules: RegisterOptions = {};
  if (required) {
    rules.required = `请输入${fieldProps.label}`;
  }
  if (minLength !== undefined) {
    rules.minLength = {
      value: minLength,
      message: `${fieldProps.label}不能少于 ${minLength} 个字符`,
    };
  }
  if (maxLength !== undefined) {
    rules.maxLength = {
      value: maxLength,
      message: `${fieldProps.label}不能超过 ${maxLength} 个字符`,
    };
  }

  return (
    <Controller
      name={fieldName}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldItem
          fieldState={fieldState}
          orientation="vertical"
          {...fieldProps}
        >
          <MinimalTiptapEditor {...field} className="mt-2" {...controlProps} />
        </FieldItem>
      )}
    />
  );
}
