import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldProps } from ".";
import { cn } from "@/lib/utils";

type DirectoryFieldProps = FieldProps<
  typeof Input,
  { required?: boolean }
>;

export function DirectoryField({
  fieldName = "directory",
  required = true,
  fieldProps,
  controlProps,
}: DirectoryFieldProps) {
  const { t } = useTranslation("form");
  const { register, getFieldState, setValue } = useFormContext();
  const {
    className: controlClassName,
    placeholder = t("fields.directory.placeholder"),
    ...restControlProps
  } = controlProps ?? {};

  async function chooseDirectory() {
    try {
      // TODO: use unified api
      const selected = await open({ directory: true });
      if (typeof selected === "string") {
        setValue(fieldName, selected, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    } catch {
      toast.error(t("fields.directory.choose_error"));
    }
  }

  return (
    <FieldItem
      {...fieldProps}
      label={t("fields.directory.label")}
      fieldState={getFieldState(fieldName)}
    >
      <div className="flex gap-2 w-full">
        <Input
          {...register(fieldName, {
            required: required ? t("fields.directory.validation.required") : false,
          })}
          placeholder={placeholder}
          className={cn("flex-1", controlClassName)}
          {...restControlProps}
        />
        <Button type="button" variant="outline" onClick={chooseDirectory}>
          {t("fields.directory.choose_button")}
        </Button>
      </div>
    </FieldItem>
  );
}
