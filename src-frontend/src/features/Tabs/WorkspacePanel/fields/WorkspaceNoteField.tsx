import { useController, useFormContext } from "react-hook-form";
import { produce } from "immer";
import { useTranslation } from "react-i18next";
import { CodeEditor } from "@/components/custom/editor/CodeEditor";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { useResolvedTheme } from "@/hooks/use-resolve-theme";
import { useSettingsStore } from "@/stores/settings-store";
import { TABS_WORKSPACE_NAMESPACE } from "@/i18n/resources";
import type { WorkspaceNotesEditFormValues } from "../form-types";

export function WorkspaceNoteField() {
  const { t } = useTranslation(TABS_WORKSPACE_NAMESPACE);
  const { control } = useFormContext<WorkspaceNotesEditFormValues>();
  const { field, fieldState } = useController({ name: "notes", control });
  const { theme } = useSettingsStore((state) => state.current);
  const resolvedTheme = useResolvedTheme(theme);

  return (
    <FieldItem
      label={t("form.notes.label")}
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
