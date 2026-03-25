import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { TABS_SKILL_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";
import type { SkillCreateFormValues } from "../form-types";

export function SkillDescriptionField() {
  const { t } = useTranslation(TABS_SKILL_NAMESPACE);
  const { register, getFieldState, formState } = useFormContext<SkillCreateFormValues>();

  return (
    <FieldItem
      label={t("form.description.label", { defaultValue: "Description" })}
      fieldState={getFieldState("description", formState)}
      orientation="vertical"
      align="start"
      contentClassName="w-full justify-start"
    >
      <Textarea
        {...register("description")}
        minRows={4}
        placeholder={t("form.description.placeholder", { defaultValue: "Enter description (optional)" })}
        className="w-full min-w-0"
      />
    </FieldItem>
  );
}
