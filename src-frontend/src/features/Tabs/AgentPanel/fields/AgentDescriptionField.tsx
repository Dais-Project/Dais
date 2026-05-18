import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { TABS_AGENT_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";
import type { AgentCreateFormValues, AgentEditFormValues } from "../form-types";

export function AgentDescriptionField() {
  const { t } = useTranslation(TABS_AGENT_NAMESPACE);
  const { register, getFieldState, formState } =
    useFormContext<AgentCreateFormValues | AgentEditFormValues>();

  return (
    <FieldItem
      label={t("form.description.label")}
      fieldState={getFieldState("description", formState)}
      orientation="vertical"
      align="start"
      contentClassName="w-full justify-start"
    >
      <Textarea
        {...register("description")}
        minRows={2}
        placeholder={t("form.description.placeholder")}
        className="w-full min-w-0 max-h-36 resize-none"
      />
    </FieldItem>
  );
}
