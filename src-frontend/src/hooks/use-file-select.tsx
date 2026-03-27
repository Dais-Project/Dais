import { ChangeEvent, useMemo, useRef } from "react";

type UseFileSelectOptions = {
  accept?: string;
} & (
    | {
      multiple: true;
      onSelect: (files: File[]) => void;
    }
    | {
      multiple?: false;
      onSelect: (file: File | null) => void;
    }
  );

export function useFileSelect({
  accept,
  multiple,
  onSelect,
}: UseFileSelectOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }
    if (multiple) {
      onSelect(Array.from(files));
    } else {
      onSelect(files[0] ?? null);
    }
    event.target.value = "";
  };
  const inputProps = useMemo(() => {
    return {
      ref: inputRef,
      type: "file" as const,
      accept: accept,
      multiple: multiple,
      onChange: handleChange,
    };
  }, [accept, multiple, handleChange]);

  return {
    inputProps,
    open: () => inputRef.current?.click(),
  };
}
