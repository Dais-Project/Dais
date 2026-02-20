import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import { ColumnsIcon, MinusIcon, RowsIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { toggleVariants } from "@/components/ui/toggle";

interface TableContextMenuProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  children: React.ReactNode;
}

export function TableContextMenu({ editor, children }: TableContextMenuProps) {
  const [isInHeaderRow, setIsInHeaderRow] = useState(false);
  const [isInTable, setIsInTable] = useState(false);

  const updateTableState = useCallback(() => {
    const inTable = editor.isActive("table");
    setIsInTable(inTable);

    if (!inTable) {
      setIsInHeaderRow(false);
      return;
    }

    // 在事务过渡期做防御，避免读取到不完整节点导致崩溃。
    let isHeaderRow = false;

    try {
      const { $anchor } = editor.state.selection;
      const parentNode = $anchor.parent;
      const ancestorNode = $anchor.depth > 0 ? $anchor.node(-1) : undefined;

      isHeaderRow =
        parentNode.type.name === "tableHeader" ||
        ancestorNode?.type?.name === "tableHeader";
    } catch {
      isHeaderRow = false;
    }

    setIsInHeaderRow(isHeaderRow);
  }, [editor, setIsInTable, setIsInHeaderRow]);

  useEffect(() => {
    editor.on("selectionUpdate", updateTableState);
    editor.on("transaction", updateTableState);
    updateTableState();
    return () => {
      editor.off("selectionUpdate", updateTableState);
      editor.off("transaction", updateTableState);
    };
  }, [editor, updateTableState]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={!isInTable}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* 行操作 */}
        <ContextMenuItem
          onClick={() => editor.chain().focus().addRowBefore().run()}
          disabled={!editor.can().addRowBefore() || isInHeaderRow}
        >
          <RowsIcon className="mr-2 size-4" />
          <span>Add row above</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.can().addRowAfter()}
        >
          <RowsIcon className="mr-2 size-4" />
          <span>Add row below</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => editor.chain().focus().deleteRow().run()}
          disabled={!editor.can().deleteRow()}
          className="text-destructive focus:text-destructive"
        >
          <MinusIcon className="mr-2 size-4" />
          <span>Delete row</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* 列操作 */}
        <ContextMenuItem
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          disabled={!editor.can().addColumnBefore()}
        >
          <ColumnsIcon className="mr-2 size-4" />
          <span>Add column left</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.can().addColumnAfter()}
        >
          <ColumnsIcon className="mr-2 size-4" />
          <span>Add column right</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => editor.chain().focus().deleteColumn().run()}
          disabled={!editor.can().deleteColumn()}
          className="text-destructive focus:text-destructive"
        >
          <MinusIcon className="mr-2 size-4" />
          <span>Delete column</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* 删除表格 */}
        <ContextMenuItem
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
          className="text-destructive focus:text-destructive"
        >
          <Trash2Icon className="mr-2 size-4" />
          <span>Delete table</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
