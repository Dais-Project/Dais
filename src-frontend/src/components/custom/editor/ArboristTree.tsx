import {
  CreateHandler,
  DeleteHandler,
  NodeApi,
  NodeRendererProps,
  MoveHandler,
  RenameHandler,
  Tree,
  TreeApi,
} from "react-arborist";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  FileJsonIcon,
  FileCodeIcon,
  FolderPlusIcon,
  FilePlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { useMemo, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

export type TreeItem = {
  id: string;
  name: string;
  parentId: string | null;
} & (
    | { type: "folder" }
    | { type: "file"; content: string }
  );

type TreeNode = TreeItem & (
  | { type: "folder"; children: TreeNode[] }
  | { type: "file" }
);

export function resourcesToArboristData(resources: { relative: string; content: string }[]): TreeItem[] {
  function resolveParentNode(relative: string, map: Record<string, TreeItem>): TreeItem | null {
    if (relative === "") {
      return null;
    }
    if (map[relative]) {
      return map[relative]!;
    }
    const parts = relative.split("/");
    const name = parts.pop()!;
    const parent = resolveParentNode(parts.join("/"), map);
    const node = {
      id: relative,
      name,
      parentId: parent?.id ?? null,
      type: "folder",
    } satisfies TreeItem;
    map[relative] = node;
    return node;
  }

  const parentMap: Record<string, TreeItem> = {};
  const nodes: TreeItem[] = [];
  for (const { relative, content } of resources) {
    // We assert every relative path is for a file.
    const parts = relative.split("/");
    const name = parts.pop()!;
    const parent = resolveParentNode(parts.join("/"), parentMap);
    const node = {
      id: relative,
      name,
      parentId: parent?.id ?? null,
      type: "file",
      content,
    } satisfies TreeItem;
    nodes.push(node);
  }

  nodes.push(...Object.values(parentMap));
  return nodes;
}

function buildTree(data: TreeItem[]): TreeNode[] {
  const map: Record<string, TreeNode> = {};
  const roots: TreeNode[] = [];

  // resolve root nodes first
  for (const item of data) {
    if (item.parentId !== null) {
      continue;
    }
    if (item.type === "file") {
      roots.push({ ...item });
      continue;
    }
    const node = {
      ...item,
      children: [],
    } satisfies TreeNode;
    map[item.id] = node;
    roots.push(node);
  }

  for (const item of data) {
    if (item.parentId === null) {
      continue;
    }
    const parent = map[item.parentId];
    if (parent === undefined) {
      console.warn(`Parent not found for item: ${item.id}`);
      continue;
    }
    if (parent.type === "file") {
      console.warn(`Parent is a file: ${item.id}`);
      continue;
    }
    const node = { ...item } as TreeNode;
    if (item.type === "folder") {
      (node as TreeNode & { type: "folder" }).children = [];
    }
    parent.children.push(node);
  }
  return roots;
}

// --- --- --- --- --- ---

type FileIconProps = {
  name: string;
  className?: string;
};

function FileIcon({ name, className }: FileIconProps) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = "min-w-0 size-4 shrink-0";

  if (["ts", "tsx", "js", "jsx"].includes(ext))
    return <FileCodeIcon className={cn(className, cls, "text-sky-500")} />;
  if (ext === "json")
    return <FileJsonIcon className={cn(className, cls, "text-yellow-500")} />;
  if (["png", "jpg", "jpeg", "svg", "webp"].includes(ext))
    return <ImageIcon className={cn(className, cls, "text-purple-500")} />;

  return <FileText className={cn(className, cls, "text-muted-foreground")} />;
}

function TreeNodeRender({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const isFolder = node.data.type === "folder";
  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 rounded-md pr-2",
        "h-8 text-sm select-none cursor-pointer",
        "text-foreground/75 hover:text-foreground",
        "hover:bg-accent transition-colors duration-75",
        {
          "bg-accent text-foreground font-medium": node.isSelected,
          "bg-accent/60": node.state.willReceiveDrop
        }
      )}
      onClick={() => isFolder && node.toggle()}
    >
      {isFolder ? (
        node.isOpen
          ? <ChevronDown className="size-3.5 ml-2" />
          : <ChevronRight className="size-3.5 ml-2" />
      ) : (
        <FileIcon name={node.data.name} className="ml-2" />
      )}

      {/* File name / inline rename input */}
      {node.isEditing ? (
        <Input
          autoFocus
          defaultValue={node.data.name}
          className="flex-1 min-w-0 h-6 py-0 text-sm focus-visible:ring-0 focus-visible:border-input"
          onBlur={(e) => node.submit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") node.submit(e.currentTarget.value);
            if (e.key === "Escape") node.reset();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 min-w-0 truncate">{node.data.name}</span>
      )}

      {/* Hover action buttons */}
      {!node.isEditing && (
        <span
          className="hidden group-hover:flex items-center gap-0.5 ml-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {isFolder && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="新建文件"
              className="size-5 text-muted-foreground"
              onClick={() => node.tree.create({ parentId: node.id })}
            >
              <Plus className="size-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="重命名"
            className="size-5 text-muted-foreground"
            onClick={() => node.edit()}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="删除"
            className="size-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => node.tree.delete(node.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </span>
      )}
    </div>
  );
}

type ArboristTreeHeaderProps = {
  title: string;
  handleCreateFile: () => void;
  handleCreateFolder: () => void;
};

function ArboristTreeHeader({
  title,
  handleCreateFile,
  handleCreateFolder,
}: ArboristTreeHeaderProps) {
  return (
    <div className="flex justify-between items-center pl-2 pb-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={handleCreateFile}
            >
              <FilePlusIcon className="size-3.5 mr-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新建文件</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={handleCreateFolder}
            >
              <FolderPlusIcon className="size-3.5 mr-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新建文件夹</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

type ArboristTreeProps = {
  data: TreeItem[];
  title: string;
  selectedId?: string;
  className?: string;
  onMove?: MoveHandler<TreeItem>;
  onRename?: RenameHandler<TreeItem>;
  onDelete?: DeleteHandler<TreeItem>;
  onCreate?: CreateHandler<TreeItem>;
  onSelect?: (node: TreeItem) => void;
};

export function ArboristTree({
  data,
  title,
  selectedId,
  className,
  onMove,
  onRename,
  onDelete,
  onCreate,
  onSelect,
}: ArboristTreeProps) {
  const ref = useRef<TreeApi<TreeNode>>(null);
  const treeData = useMemo(() => buildTree(data), [data]);

  const handleSelect = (nodes: NodeApi<TreeNode>[]) => {
    const file = nodes.find((n) => n.isLeaf && n.data.type === "file");
    if (file) {
      onSelect?.(file.data);
    }
  };

  const handleCreateFile = () => {
    ref.current?.create({
      parentId: null,
      type: "leaf",
    });
  };

  const handleCreateFolder = () => {
    ref.current?.create({
      parentId: null,
      type: "internal",
    });
  };

  return (
    <div className={cn("p-1", className)}>
      <ArboristTreeHeader
        title={title}
        handleCreateFile={handleCreateFile}
        handleCreateFolder={handleCreateFolder}
      />

      <Tree<TreeNode>
        data={treeData}
        ref={ref}
        width="100%"
        rowClassName="outline-none"
        rowHeight={36}
        renderCursor={() => null}
        onMove={onMove as MoveHandler<TreeNode>}
        onRename={onRename as RenameHandler<TreeNode>}
        onDelete={onDelete as DeleteHandler<TreeNode>}
        onCreate={onCreate as CreateHandler<TreeNode>}
        onSelect={handleSelect}
        selection={selectedId}
        disableMultiSelection
      >
        {TreeNodeRender}
      </Tree>
    </div>
  );
}
