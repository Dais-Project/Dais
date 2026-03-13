import { DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { TABS_PROVIDER_NAMESPACE } from "@/i18n/resources";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LlmModelCreate } from "@/api/generated/schemas";
import type {
  ProviderCreateFormValues,
  ProviderEditFormValues,
} from "../../form-types";
import { ModelItem } from "./ModelItem";
import { ModelSelectDialog } from "./ModelSelectDialog";
import { useModelManagement } from "./use-model-management";
import { ModelEditDialog } from "./ModelEditDialog";

export function ModelsField() {
  const { t } = useTranslation(TABS_PROVIDER_NAMESPACE);
  const { control, trigger } = useFormContext<
    ProviderCreateFormValues | ProviderEditFormValues
  >();
  const [providerType, baseUrl, apiKey] = useWatch({
    control,
    name: ["type", "base_url", "api_key"],
  });
  const { models, handleDeleteModel, handleEditModel, handleSelectModels } =
    useModelManagement({ control });

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

  const [editingModel, setEditingModel] = useState<LlmModelCreate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const handleOpenModelEditDialog = (index: number) => {
    setEditingModel(models[index]);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* header */}
      <div className="flex justify-between">
        <Label>{t("form.models.label")}</Label>
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
            {t("form.models.fetch_button")}
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
            onEdit={handleOpenModelEditDialog}
          />
        ))}
      </div>

      <ModelEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        model={editingModel}
        onConfirm={(updatedModel) => {
          handleEditModel(updatedModel);
          setIsEditDialogOpen(false);
        }}
      />
    </div>
  );
}
