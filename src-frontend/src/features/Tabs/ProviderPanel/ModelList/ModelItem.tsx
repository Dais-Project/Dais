import { Edit2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import type {
  LlmModelBase,
  LlmModelCreate,
  LlmModelUpdate,
} from "@/types/provider";
import { ModelEditDialog } from "../ModelEditDialog";
import { ModelCapabilityBadges } from "./ModelCapabilityBadges";

type LlmModel = LlmModelCreate | LlmModelUpdate;

type ModelItemProps = {
  model: LlmModel;
  index: number;
  onDelete: (index: number) => void;
  onEdit: (index: number, model: LlmModelBase) => void;
};

export function ModelItem({ model, index, onDelete, onEdit }: ModelItemProps) {
  const handleEdit = (updatedModel: LlmModelBase) => {
    onEdit(index, updatedModel);
  };

  const handleDelete = () => {
    onDelete(index);
  };

  return (
    <Item variant="outline" className="py-2">
      <ItemContent>
        <ItemTitle>{model.name}</ItemTitle>
        <ItemDescription>
          <ModelCapabilityBadges capability={model.capability} />
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <ModelEditDialog model={model} onConfirm={handleEdit}>
          <Button type="button" variant="ghost" size="sm" aria-label="编辑模型">
            <Edit2Icon className="h-4 w-4" />
          </Button>
        </ModelEditDialog>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          aria-label="删除模型"
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
