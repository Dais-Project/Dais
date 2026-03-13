import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import { TABS_PROVIDER_NAMESPACE } from "@/i18n/resources";
import type { LlmModelCreate } from "@/api/generated/schemas";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_LLM_MODEL } from "@/constants/provider";
import { CheckboxField, NameField } from "@/components/custom/form/fields";

type ModelEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: LlmModelCreate | null;
  onConfirm: (model: LlmModelCreate) => void;
};

export function ModelEditDialog({
  open,
  onOpenChange,
  model,
  onConfirm,
}: ModelEditDialogProps) {
  const { t } = useTranslation(TABS_PROVIDER_NAMESPACE);
  const dialogForm = useForm<LlmModelCreate>({ defaultValues: DEFAULT_LLM_MODEL });
  const { reset, handleSubmit, register, getFieldState, formState } = dialogForm;

  useEffect(() => {
    if (model) {
      reset(model);
    }
  }, [model, reset]);

  return (
    <Dialog open={open} onOpenChange={(open_) => {
      if (!open_) {
        reset();
      }
      onOpenChange(open_);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("models.edit_dialog.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...dialogForm}>
          <form
            onSubmit={(e) => {
              e.stopPropagation(); // prevent progagation to parent form
              handleSubmit(onConfirm)(e);
            }}
          >
            <FieldGroup className="gap-y-2">
              <NameField
                fieldName="name"
                fieldProps={{
                  label: t("models.edit_dialog.name.label"),
                }}
              />

              <FieldItem
                label={t("models.edit_dialog.context_size.label")}
                fieldState={getFieldState("context_size", formState)}
              >
                <Input
                  {...register("context_size", {
                    required: t("models.edit_dialog.context_size.required"),
                    min: {
                      value: 1,
                      message: t("models.edit_dialog.context_size.min"),
                    },
                  })}
                  type="number"
                  placeholder={t("models.edit_dialog.context_size.placeholder")}
                />
              </FieldItem>

              <Field className="mt-4 flex flex-row justify-between">
                <FieldLabel className="self-start">{t("models.edit_dialog.capability.label")}</FieldLabel>
                <div className="flex w-max flex-col items-end gap-y-1 pr-2">
                  {[
                    {
                      name: "capability.vision" as const,
                      label: t("models.edit_dialog.capability.vision"),
                    },
                    {
                      name: "capability.reasoning" as const,
                      label: t("models.edit_dialog.capability.reasoning"),
                    },
                    {
                      name: "capability.tool_use" as const,
                      label: t("models.edit_dialog.capability.tool_use"),
                    },
                  ].map((capability) => (
                    <CheckboxField
                      key={capability.name}
                      fieldName={capability.name}
                      fieldProps={{
                        label: capability.label,
                        className: "w-fit",
                        contentClassName: "w-auto",
                      }}
                    />
                  ))}
                </div>
              </Field>
            </FieldGroup>
            

            <DialogFooter className="mt-8">
              <DialogClose asChild>
                <Button variant="outline">{t("models.edit_dialog.cancel")}</Button>
              </DialogClose>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? t("models.edit_dialog.saving") : t("models.edit_dialog.save")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
