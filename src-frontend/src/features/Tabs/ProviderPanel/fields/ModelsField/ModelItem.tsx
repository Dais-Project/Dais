import { Edit2Icon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TABS_PROVIDER_NAMESPACE } from "@/i18n/resources";
import type { LlmModelCreate } from "@/api/generated/schemas";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { ModelCapabilityBadges } from "./ModelCapabilityBadges";

type ModelItemProps = {
  model: LlmModelCreate;
  index: number;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
};

export function ModelItem({ model, index, onDelete, onEdit }: ModelItemProps) {
  const { t } = useTranslation(TABS_PROVIDER_NAMESPACE);

  return (
    <Item variant="outline" className="py-2">
      <ItemContent>
        <ItemTitle>{model.name}</ItemTitle>
        <ItemDescription>
          <ModelCapabilityBadges capability={model.capability} />
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(index)}
          aria-label={t("models.item.edit_aria_label")}
        >
          <Edit2Icon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          aria-label={t("models.item.delete_aria_label")}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
