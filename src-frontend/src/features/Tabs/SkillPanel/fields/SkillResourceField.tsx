import { useController, useFormContext } from "react-hook-form";
import { produce } from "immer";
import { useTranslation } from "react-i18next";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { CodeEditor } from "@/components/custom/editor/CodeEditor";
import { useSettingsStore } from "@/stores/settings-store";
import { useResolvedTheme } from "@/hooks/use-resolve-theme";
import { TABS_SKILL_NAMESPACE } from "@/i18n/resources";
import type { SkillCreateFormValues, SkillEditFormValues } from "../form-types";

export function SkillResourceField() {
  const { t } = useTranslation(TABS_SKILL_NAMESPACE);
  const { control } = useFormContext<SkillCreateFormValues | SkillEditFormValues>();
  const { field, fieldState } = useController({ name: "resources", control });
  const { theme } = useSettingsStore((state) => state.current);
  const resolvedTheme = useResolvedTheme(theme);

  return (
    <FieldItem
      label={t("form.resources.label")}
      fieldState={fieldState}
      orientation="vertical"
      align="start"
      className="relative"
      labelClassName="absolute left-2 py-2 px-3 border rounded-md dark:bg-input/30"
    >
      <CodeEditor
        value={field.value}
        theme={resolvedTheme}
        onChange={(updater) => {
          const next = produce(field.value, updater);
          field.onChange(next);
        }}
        title=""
      />
    </FieldItem>
  );
}
