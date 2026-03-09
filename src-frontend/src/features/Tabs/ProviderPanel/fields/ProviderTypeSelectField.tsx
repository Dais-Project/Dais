import { SelectField } from "@/components/custom/form/fields";
import { SelectItem } from "@/components/custom/form/fields/SelectField";
import { PROVIDER_TYPE_LABELS } from "@/constants/provider";
import { i18n } from "@/i18n";

type ProviderTypeSelectFieldProps = {
  fieldName?: string;
  label?: string;
  placeholder?: string;
};

export function ProviderTypeSelectField({
  fieldName = "type",
  label = i18n.t("form.type.label"),
  placeholder = i18n.t("form.type.placeholder"),
}: ProviderTypeSelectFieldProps) {
  return (
    <SelectField
      fieldName={fieldName}
      placeholder={placeholder}
      fieldProps={{ label }}
    >
      {Object.entries(PROVIDER_TYPE_LABELS).map(
        ([selectionValue, selectionLabel]) => (
          <SelectItem key={selectionValue} value={selectionValue}>
            {selectionLabel}
          </SelectItem>
        )
      )}
    </SelectField>
  );
}
