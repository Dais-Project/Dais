import { open } from "@tauri-apps/plugin-dialog";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldProps } from ".";

type DirectoryFieldProps = FieldProps<
  typeof Input,
  {
    required?: boolean;
    chooseButtonText?: string;
    chooseDirectoryErrorMessage?: string;
  }
>;

export function DirectoryField({
  fieldName = "directory",
  required = true,
  chooseButtonText = "选择",
  chooseDirectoryErrorMessage = "选择目录失败",
  fieldProps = { label: "目录路径" },
  controlProps = {
    placeholder: "请输入目录路径",
    className: "flex-1",
  },
}: DirectoryFieldProps) {
  const { register, getFieldState, setValue } = useFormContext();

  async function chooseDirectory() {
    try {
      const selected = await open({ directory: true });
      if (typeof selected === "string") {
        setValue(fieldName, selected, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(chooseDirectoryErrorMessage);
    }
  }

  return (
    <FieldItem {...fieldProps} fieldState={getFieldState(fieldName)}>
      <div className="flex gap-2">
        <Input
          {...register(fieldName, {
            required: required ? "目录路径为必填项" : false,
          })}
          {...controlProps}
          className="min-w-48"
        />
        <Button type="button" variant="outline" onClick={chooseDirectory}>
          {chooseButtonText}
        </Button>
      </div>
    </FieldItem>
  );
}
