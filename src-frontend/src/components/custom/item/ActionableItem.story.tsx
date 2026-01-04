import { PencilIcon, TrashIcon } from "lucide-react";
import {
  ActionableItem,
  ActionableItemInfo,
  ActionableItemMenu,
  ActionableItemMenuItem,
  ActionableItemTrigger,
} from "./ActionableItem";

export function AgentItemExample({ agent }) {
  return (
    <ActionableItem>
      {/* 1. 触发区域：包含 Avatar、文字信息和自动生成的更多按钮 */}
      <ActionableItemTrigger onClick={() => console.log("Row Clicked")}>
        <div className="size-5 rounded-full bg-blue-500" /> {/* 模拟 Avatar */}
        <ActionableItemInfo title={agent.name} description={agent.modelName} />
      </ActionableItemTrigger>

      {/* 2. 菜单区域：复用 ContextMenuContent */}
      <ActionableItemMenu>
        <ActionableItemMenuItem onClick={() => console.log("Edit")}>
          <PencilIcon className="mr-2 size-4" />
          <span>编辑</span>
        </ActionableItemMenuItem>
        <ActionableItemMenuItem className="text-destructive">
          <TrashIcon className="mr-2 size-4" />
          <span>删除</span>
        </ActionableItemMenuItem>
      </ActionableItemMenu>
    </ActionableItem>
  );
}
