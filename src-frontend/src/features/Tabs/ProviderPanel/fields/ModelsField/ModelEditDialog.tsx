import { useEffect } from "react";
import { FormProvider, useController, useForm, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { LlmModelCreate, LlmModelRead, LlmProviders } from "@/api/generated/schemas";
import { CheckboxField, NameField } from "@/components/custom/form/fields";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_LLM_MODEL, PROVIDER_REASONING_EFFORTS } from "@/constants/provider";
import { TABS_PROVIDER_NAMESPACE } from "@/i18n/resources";

type ModelEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: LlmModelCreate | null;
  onConfirm: (model: LlmModelCreate) => void;
  providerType: LlmProviders;
};

function ReasoningEffortField({ providerType }: { providerType: LlmProviders }) {
  const { t } = useTranslation(TABS_PROVIDER_NAMESPACE);
  const { control } = useFormContext<LlmModelCreate | LlmModelRead>();
  const { field } = useController({
    name: "capability.reasoning_effort",
    control,
  });
  const efforts = PROVIDER_REASONING_EFFORTS[providerType] ?? [];

  return (
    <Select value={field.value ?? undefined} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue placeholder={t("models.edit_dialog.capability.reasoning_effort.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {efforts.map((effort) => (
          <SelectItem key={effort} value={effort}>
            {t(`models.edit_dialog.capability.reasoning_effort.options.${effort}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ModelEditDialog({ open, onOpenChange, model, onConfirm, providerType }: ModelEditDialogProps) {
  const { t } = useTranslation(TABS_PROVIDER_NAMESPACE);
  const dialogForm = useForm<LlmModelCreate | LlmModelRead>({ defaultValues: DEFAULT_LLM_MODEL });
  const { reset, handleSubmit, register, getFieldState, formState, control, setValue } = dialogForm;

  const isReasoningEnabled = useWatch({ control, name: "capability.reasoning" });

  useEffect(() => {
    if (model) {
      reset(model);
    }
  }, [model, reset]);

  useEffect(() => {
    if (!isReasoningEnabled) {
      setValue("capability.reasoning_effort", undefined);
    }
  }, [isReasoningEnabled, setValue]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open_) => {
        if (!open_) {
          reset();
        }
        onOpenChange(open_);
      }}
    >
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
                fieldProps={{ label: t("models.edit_dialog.name.label") }}
                controlProps={{ disabled: true }}
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
                  <CheckboxField
                    fieldName="capability.vision"
                    fieldProps={{
                      label: t("models.edit_dialog.capability.vision"),
                      className: "w-fit",
                      contentClassName: "w-auto",
                    }}
                  />
                  <CheckboxField
                    fieldName="capability.tool_use"
                    fieldProps={{
                      label: t("models.edit_dialog.capability.tool_use"),
                      className: "w-fit",
                      contentClassName: "w-auto",
                    }}
                  />
                  <Collapsible open={isReasoningEnabled} className="flex w-full flex-col items-end gap-y-1">
                    <CheckboxField
                      fieldName="capability.reasoning"
                      fieldProps={{
                        label: t("models.edit_dialog.capability.reasoning"),
                        className: "w-fit",
                        contentClassName: "w-auto",
                      }}
                    />
                    <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=open]:animate-in">
                      <ReasoningEffortField providerType={providerType} />
                    </CollapsibleContent>
                  </Collapsible>
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
