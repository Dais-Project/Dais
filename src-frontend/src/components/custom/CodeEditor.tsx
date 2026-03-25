import { useCallback, useMemo, useState } from "react";
import { produce } from "immer";
import type { LanguageSupport } from "@codemirror/language";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import { ArboristTree, TreeItem } from "./ArboristTree";
import { cn } from "@/lib/utils";
import { CreateHandler, DeleteHandler, MoveHandler, RenameHandler } from "react-arborist";

function getLanguageExtensions(filename: string): LanguageSupport | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, LanguageSupport> = {
    js: javascript(),
    jsx: javascript({ jsx: true }),
    ts: javascript({ typescript: true }),
    tsx: javascript({ jsx: true, typescript: true }),
    py: python(),
    md: markdown(),
    json: json(),
    xml: xml(),
  };
  return map[ext] ?? null;
}

export type CodeEditorProps = {
  value: TreeItem[];
  title?: string;
  className?: string;
  theme?: "light" | "dark";
  onChange?: (value: TreeItem[] | ImmerUpdater<TreeItem[]>) => void;
};

export function CodeEditor({
  value,
  title,
  className,
  theme,
  onChange,
}: CodeEditorProps) {
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null);

  const handleEditorChange = (content: string) => {
    onChange?.(produce((draft: TreeItem[]) => {
      if (!selectedItem) return;
      const item = draft.find((i) => i.id === selectedItem.id);
      if (item) {
        (item as TreeItem & { type: "file" }).content = content;
      }
    }));
  };

  const handleMove: MoveHandler<TreeItem> = useCallback(({ dragIds, parentId }) => {
    const targetId = dragIds[0];
    onChange?.(produce((draft: TreeItem[]) => {
      const target = draft.find((i) => i.id === targetId);
      if (!target) return;
      target.parentId = parentId;
    }));
  }, [onChange]);

  const handleDelete: DeleteHandler<TreeItem> = useCallback(({ ids }) => {
    onChange?.(produce((draft: TreeItem[]) => {
      const targetIndex = draft.findIndex((i) => i.id === ids[0]);
      if (targetIndex === -1) return;
      draft.splice(targetIndex, 1);
    }));
  }, [onChange]);

  const handleRename: RenameHandler<TreeItem> = useCallback(({ id, name, node }) => {
    if (name.trim() === "") {
      handleDelete({ ids: [id], nodes: [node] });
      return;
    }
    onChange?.(produce((draft: TreeItem[]) => {
      const target = draft.find((i) => i.id === id);
      if (!target) return;
      target.name = name;
    }));
  }, [onChange, handleDelete]);

  const handleCreate: CreateHandler<TreeItem> = useCallback(({ parentId, type }) => {
    const id = crypto.randomUUID();
    const isFolder = type === "internal";
    let newNode = { id, name: "", parentId };
    if (isFolder) {
      Object.assign(newNode, { type: "folder" });
    } else {
      Object.assign(newNode, { type: "file", content: "" });
    }
    onChange?.(produce((draft: TreeItem[]) => {
      if (draft.some((i) => i.id === id)) return;
      draft.push(newNode as TreeItem);
    }));
    return newNode;
  }, [onChange]);

  const extensions = useMemo(() => {
    const result: LanguageSupport[] = [];
    if (!selectedItem) {
      return result;
    }
    const langExt = getLanguageExtensions(selectedItem.name);
    if (langExt) {
      result.push(langExt);
    }
    return result;
  }, [selectedItem]);

  return (
    <div className={cn("overflow-hidden rounded-md border w-full h-[60vh]", className)}>
      <ResizablePanelGroup orientation="horizontal">
        {/* ── Left: File tree ── */}
        <ResizablePanel
          minSize={200}
          defaultSize={200}
          maxSize={"60%"}
        >
          <ArboristTree
            data={value}
            title={title ?? "EXPLORER"}
            selectedId={selectedItem?.id}
            onSelect={setSelectedItem}
            onMove={handleMove}
            onRename={handleRename}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* ── Right: Editor ── */}
        <ResizablePanel className="flex flex-col bg-background">
          {selectedItem ? (
            <CodeMirror
              value={(selectedItem.type === "file" && selectedItem.content) || ""}
              onChange={handleEditorChange}
              extensions={extensions}
              theme={theme}
              className="flex-1 text-base overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-scroller]:shadcn-scroll"
              height="100%"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightActiveLine: true,
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              从左侧选择一个文件开始编辑
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}