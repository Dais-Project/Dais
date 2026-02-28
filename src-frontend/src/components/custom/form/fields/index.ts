/** biome-ignore-all lint/performance/noBarrelFile: To aggregate all field components exports */

import type { FieldItemProps } from "../../item/FieldItem";

// biome-ignore lint/complexity/noBannedTypes: To allow extra props in field components.
export type FieldProps<ComponentOrProps, Extra = {}> = {
  fieldName: string;
  controlProps?: ComponentOrProps extends React.ElementType
    ? React.ComponentProps<ComponentOrProps>
    : ComponentOrProps;
  fieldProps?: Omit<FieldItemProps, "fieldState" | "children">;
} & Extra;

export { CheckboxField } from "./CheckboxField";
export { DirectoryField } from "./DirectoryField";
export { NameField } from "./NameField";
export { RichTextField } from "./RichTextField";
export { SelectField } from "./SelectField";
export { SwitchField } from "./SwitchField";
export { UrlField } from "./UrlField";
