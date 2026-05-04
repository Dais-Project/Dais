import type { ComponentProps } from "react";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

type Stringifiable = {
  toString(): string;
};

type StringifiableSelectProps<
  T extends Stringifiable,
  S extends Record<string, T>,
> = Omit<ComponentProps<typeof Select>, "value" | "defaultValue" | "onValueChange"> & {
  selections: S;
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
};

type StringifiableSelectItemProps<T extends Stringifiable> = Omit<
  ComponentProps<typeof SelectItem>,
  "value"
> & {
  value: T;
};

function StringifiableSelect<
  T extends Stringifiable,
  S extends Record<string, T>,
>({
  selections,
  value,
  defaultValue,
  onValueChange,
  ...props
}: StringifiableSelectProps<T, S>) {
  const valueMap = useMemo(() => {
    return new Map(
      Object.values(selections).map((selectionValue) => [
        selectionValue.toString(),
        selectionValue,
      ])
    );
  }, [selections]);

  return (
    <Select
      value={value?.toString()}
      defaultValue={defaultValue?.toString()}
      onValueChange={(nextValue) => {
        const originalValue = valueMap.get(nextValue);
        if (originalValue !== undefined) {
          onValueChange?.(originalValue);
        }
      }}
      {...props}
    />
  );
}

function StringifiableSelectItem<T extends Stringifiable>({
  value,
  ...props
}: StringifiableSelectItemProps<T>) {
  return <SelectItem value={value.toString()} {...props} />;
}

export {
  SelectContent as StringifiableSelectContent,
  SelectGroup as StringifiableSelectGroup,
  StringifiableSelect,
  StringifiableSelectItem,
  SelectLabel as StringifiableSelectLabel,
  SelectScrollDownButton as StringifiableSelectScrollDownButton,
  SelectScrollUpButton as StringifiableSelectScrollUpButton,
  SelectSeparator as StringifiableSelectSeparator,
  SelectTrigger as StringifiableSelectTrigger,
  SelectValue as StringifiableSelectValue,
};
