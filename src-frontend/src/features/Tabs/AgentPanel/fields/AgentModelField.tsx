import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { LlmModelRead } from "@/api/generated/schemas";
import { FieldItem } from "@/components/custom/item/FieldItem";
import type { AgentCreateFormValues } from "../form-types";
import { ModelSelectDialog } from "./ModelSelectDialog";

type AgentModelFieldProps = {
  initialModel?: LlmModelRead | null;
};

export function AgentModelField({ initialModel = null }: AgentModelFieldProps) {
  const { control } = useFormContext<AgentCreateFormValues>();
  const [selectedModel, setSelectedModel] = useState<LlmModelRead | null>(
    initialModel
  );

  useEffect(() => {
    setSelectedModel(initialModel);
  }, [initialModel]);

  return (
    <Controller
      name="model_id"
      control={control}
      render={({ field, fieldState }) => (
        <FieldItem label="关联模型" fieldState={fieldState}>
          <ModelSelectDialog
            selectedModel={selectedModel}
            onSelect={(model) => {
              field.onChange(model.id);
              setSelectedModel(model);
            }}
          />
        </FieldItem>
      )}
    />
  );
}
