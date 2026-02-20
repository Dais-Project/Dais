import { DownloadIcon } from "lucide-react";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  ProviderCreateFormValues,
  ProviderEditFormValues,
} from "../../form-types";
import { ModelItem } from "./ModelItem";
import { ModelSelectDialog } from "./ModelSelectDialog";
import { useModelManagement } from "./use-model-management";

export function ModelsField() {
  const { control, trigger } = useFormContext<
    ProviderCreateFormValues | ProviderEditFormValues
  >();
  const [providerType, baseUrl, apiKey] = useWatch({
    control,
    name: ["type", "base_url", "api_key"],
  });
  const { models, handleDeleteModel, handleEditModel, handleSelectModels } =
    useModelManagement({
      control,
    });
  const existingModelNames = useMemo(() => {
    return models.map((model) => model.name);
  }, [models]);

  const handleValidateProvider = async (e: React.MouseEvent) => {
    const isValid = await trigger(["type", "api_key", "base_url"]);
    if (!isValid) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* header */}
      <div className="flex justify-between">
        <Label>模型列表</Label>
        <ModelSelectDialog
          provider={{
            type: providerType,
            base_url: baseUrl,
            api_key: apiKey,
          }}
          existingModelNames={existingModelNames}
          onConfirm={handleSelectModels}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidateProvider}
          >
            <DownloadIcon className="mr-1 h-4 w-4" />
            获取模型
          </Button>
        </ModelSelectDialog>
      </div>

      {/* list */}
      <div className="space-y-2">
        {models.map((model, index) => (
          <ModelItem
            key={model.name}
            model={model}
            index={index}
            onDelete={handleDeleteModel}
            onEdit={handleEditModel}
          />
        ))}
      </div>
    </div>
  );
}
