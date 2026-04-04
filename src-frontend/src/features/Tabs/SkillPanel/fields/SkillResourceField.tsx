import { useController, useFormContext } from "react-hook-form";
import { produce } from "immer";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { CodeEditor } from "@/components/custom/editor/CodeEditor";
import { useSettingsStore } from "@/stores/settings-store";
import { useResolvedTheme } from "@/hooks/use-resolve-theme";
import type { SkillCreateFormValues } from "../form-types";

export function SkillResourceField() {
  const { control } = useFormContext<SkillCreateFormValues>();
  const { field, fieldState } = useController({ name: "resources", control });
  const { theme } = useSettingsStore((state) => state.current);
  const resolvedTheme = useResolvedTheme(theme);

  return (
    <FieldItem
      label="Resources"
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