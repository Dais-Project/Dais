import type { IconName } from "lucide-react/dynamic";
import { useTranslation } from "react-i18next";
import { Controller, useFormContext } from "react-hook-form";
import { TABS_AGENT_NAMESPACE } from "@/i18n/resources";
import { FieldItem } from "@/components/custom/item/FieldItem";
import type { AgentCreateFormValues } from "../form-types";
import { IconSelectDialog } from "../IconSelectDialog";

export function AgentIconField() {
  const { t } = useTranslation(TABS_AGENT_NAMESPACE);
  const { control } = useFormContext<AgentCreateFormValues>();

  return (
    <Controller
      name="icon_name"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem label={t("form.icon.label")} fieldState={fieldState}>
          <IconSelectDialog
            value={field.value as IconName}
            onChange={field.onChange}
          />
        </FieldItem>
      )}
    />
  );
}
