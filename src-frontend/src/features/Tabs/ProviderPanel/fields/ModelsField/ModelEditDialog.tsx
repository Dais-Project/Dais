import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import type { LlmModelCreate } from "@/api/generated/schemas";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_LLM_MODEL } from "@/constants/provider";

type ModelEditDialogProps = {
  children: React.ReactNode;
  model: LlmModelCreate | null;
  onConfirm: (model: LlmModelCreate) => void;
  onCancel?: () => void;
};

// TODO: refactor form

export function ModelEditDialog({
  children,
  model,
  onConfirm,
  onCancel,
}: ModelEditDialogProps) {
  const { t } = useTranslation("tabs-provider");
  const { reset, handleSubmit, register, getFieldState, formState } =
    useForm<LlmModelCreate>({ defaultValues: DEFAULT_LLM_MODEL });

  useEffect(() => {
    if (model) {
      reset(model);
    }
  }, [model]);

  const handleSubmitForm = (data: LlmModelCreate) => {
    onConfirm(data);
  };

  const handleClose = () => {
    reset();
    onCancel?.();
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("models.edit_dialog.title")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(handleSubmitForm)(e);
          }}
        >
          <FieldGroup className="gap-y-2">
            <FieldItem
              label={t("models.edit_dialog.name.label")}
              fieldState={getFieldState("name", formState)}
            >
              <Input
                {...register("name", {
                  required: t("models.edit_dialog.name.required"),
                  minLength: {
                    value: 1,
                    message: t("models.edit_dialog.name.empty"),
                  },
                })}
                placeholder={t("models.edit_dialog.name.placeholder")}
              />
            </FieldItem>

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
              <div className="flex w-max flex-col items-end gap-3 pr-2">
                {[
                  {
                    name: "capability.vision" as const,
                    id: "vision",
                    label: t("models.edit_dialog.capability.vision"),
                  },
                  {
                    name: "capability.reasoning" as const,
                    id: "reasoning",
                    label: t("models.edit_dialog.capability.reasoning"),
                  },
                  {
                    name: "capability.tool_use" as const,
                    id: "tool_use",
                    label: t("models.edit_dialog.capability.tool_use"),
                  },
                ].map((capability) => (
                  <Field
                    key={capability.id}
                    orientation="horizontal"
                    className="w-fit"
                  >
                    <Checkbox
                      id={capability.id}
                      {...register(capability.name, { value: false })}
                    />
                    <FieldLabel htmlFor={capability.id} className="font-normal">
                      {capability.label}
                    </FieldLabel>
                  </Field>
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
      </DialogContent>
    </Dialog>
  );
}
