import { useTranslation } from "react-i18next";
import { SelectField } from "@/components/custom/form/fields";
import { SelectItem } from "@/components/custom/form/fields/SelectField";
import { PROVIDER_TYPE_LABELS } from "@/constants/provider";

type ProviderTypeSelectFieldProps = {
  fieldName?: string;
  label?: string;
  placeholder?: string;
};

export function ProviderTypeSelectField({
  fieldName = "type",
  label,
  placeholder,
}: ProviderTypeSelectFieldProps) {
  const { t } = useTranslation("tabs-provider");
  return (
    <SelectField
      fieldName={fieldName}
      placeholder={placeholder ?? t("form.type.placeholder")}
      fieldProps={{ label: label ?? t("form.type.label") }}
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
