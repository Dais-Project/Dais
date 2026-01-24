import {
  Controller,
  type RegisterOptions,
  useFormContext,
} from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";

type RichTextFieldProps = {
  fieldName: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  editorClassName?: string;
};

export function RichTextField({
  fieldName,
  label,
  required = false,
  minLength = 1,
  maxLength,
  className,
  editorClassName = "min-h-[8em]",
}: RichTextFieldProps) {
  const { control } = useFormContext();

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

  return (
    <Controller
      name={fieldName}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldItem
          title={label}
          fieldState={fieldState}
          className={className}
          orientation="vertical"
        >
          <MinimalTiptapEditor
            {...field}
            className="mt-2"
            editorClassName={editorClassName}
          />
        </FieldItem>
      )}
    />
  );
}
