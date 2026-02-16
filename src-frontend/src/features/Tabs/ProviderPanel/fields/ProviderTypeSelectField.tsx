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
  label = "类型",
  placeholder = "请选择类型",
}: ProviderTypeSelectFieldProps) {
  return (
    <SelectField fieldName={fieldName} label={label} placeholder={placeholder}>
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
