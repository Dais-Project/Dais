import { useController, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { CodeEditor } from "@/components/custom/CodeEditor";
import { useSettingsStore } from "@/stores/settings-store";
import type { SkillCreateFormValues } from "../form-types";
import { useResolvedTheme } from "@/hooks/use-resolve-theme";

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
      labelClassName="absolute left-2 bg-background py-2 px-3 rounded-md"
    >
      <CodeEditor
        value={field.value}
        theme={resolvedTheme}
        onChange={field.onChange}
        className="bg-transparent dark:bg-input/30"
        title=""
      />
    </FieldItem>
  );
}