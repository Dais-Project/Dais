import { useCallback, useEffect, useMemo, useRef } from "react";
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
  Plus,
  Pencil,
  Trash2,
  FileJsonIcon,
  FileCodeIcon,
  FolderPlusIcon,
  FilePlusIcon,
  FileTextIcon,
  BookTextIcon,
  LucideIcon,
} from "lucide-react";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { cn } from "@/lib/utils";
import { type TreeItem, type TreeNode } from "./types";
import { useStableTreeData } from "./use-stable-tree-data";
import { buildTree } from "./utils";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { useDebounceFn } from "ahooks";

export * from "./types";
export {
  buildTree,
  resourcesToArboristData,
  arboristDataToResources,
} from "./utils";

type FileIconProps = {
  name: string;
  className?: string;
};

function FileIcon({ name, className }: FileIconProps) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = "min-w-0 size-4 shrink-0";

  if (["ts", "tsx", "js", "jsx"].includes(ext)) {
    return <FileCodeIcon className={cn(cls, "text-sky-600 dark:text-sky-500", className)} />;
  } else if (ext === "py") {
    return <FileCodeIcon className={cn(cls, "text-emerald-600 dark:text-emerald-500", className)} />;
  } else if (ext === "json") {
    return <FileJsonIcon className={cn(cls, "text-yellow-600 dark:text-yellow-500", className)} />;
  } else if (ext === "md") {
    return <BookTextIcon className={cn(cls, "text-cyan-600 dark:text-cyan-500", className)} />;
  }
  return <FileTextIcon className={cn(cls, "text-muted-foreground", className)} />;
}

function TreeNodeRender({ node, style, dragHandle }: NodeRendererProps<TreeNode>) {
  const isFolder = node.data.type === "folder";
  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 pr-2",
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
        <input
          autoFocus
          autoComplete="off"
          data-slot="input"
          defaultValue={node.data.name}
          className="outline-none selection:bg-primary selection:text-primary-foreground"
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

type ArboristTreeHeaderActionProps = {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
};

export function ArboristTreeHeaderAction({
  icon: Icon,
  title,
  onClick
}: ArboristTreeHeaderActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onClick}
        >
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

type ArboristTreeHeaderProps = {
  title: string;
  className?: string;
  actions?: React.ReactNode;
  handleCreateFile?: () => void;
  handleCreateFolder?: () => void;
};

function ArboristTreeHeader({
  title,
  className,
  actions,
  handleCreateFile,
  handleCreateFolder,
}: ArboristTreeHeaderProps) {
  return (
    <div className={cn("flex justify-between items-center px-2 py-1", className)}>
      <div className="text-sm font-medium">{title}</div>
      <div className="flex items-center">
        <ArboristTreeHeaderAction icon={FilePlusIcon} title="新建文件" onClick={handleCreateFile} />
        <ArboristTreeHeaderAction icon={FolderPlusIcon} title="新建文件夹" onClick={handleCreateFolder} />

        {actions}
      </div>
    </div>
  );
}

type ArboristTreeProps = {
  data: TreeItem[];
  title: string;
  selectedId?: string;
  className?: string;
  actions?: React.ReactNode;
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
  actions,
  onMove,
  onRename,
  onDelete,
  onCreate,
  onSelect,
}: ArboristTreeProps) {
  const ref = useRef<TreeApi<TreeNode>>(null);
  const openStateRef = useRef<{ [id: string]: boolean }>({});
  const stableData = useStableTreeData(data);
  const treeData = useMemo(() => buildTree(data), [stableData]);

  const { run: restoreOpenState } = useDebounceFn(() => {
    for (const [id, isOpen] of Object.entries(openStateRef.current)) {
      if (isOpen) {
        ref.current?.open(id);
      }
    }
  }, { wait: 200 });
  useEffect(restoreOpenState, [data]);

  const wrappedOnCreate: CreateHandler<TreeNode> = useCallback(
    async (args) => {
      const result = await onCreate?.(args as unknown as Parameters<CreateHandler<TreeItem>>[0]);
      if (result) {
        requestAnimationFrame(() => ref.current?.edit(result.id));
      }
      return result ?? null;
    },
    [onCreate]
  );

  const handleSelect = useCallback((nodes: NodeApi<TreeNode>[]) => {
    const file = nodes.find((n) => n.isLeaf && n.data.type === "file");
    if (file) {
      onSelect?.(file.data);
    }
  }, [onSelect]);

  const handleToggle = useCallback((_: string) => {
    if (ref.current) {
      openStateRef.current = { ...ref.current?.openState };
    }
  }, []);

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
    <div className={cn("flex flex-col h-full", className)}>
      <ArboristTreeHeader
        title={title}
        className="border-b"
        actions={actions}
        handleCreateFile={handleCreateFile}
        handleCreateFolder={handleCreateFolder}
      />

      <div className="flex-1 min-h-0">
        <AutoSizer ChildComponent={({ width, height }) => (
          <Tree<TreeNode>
            data={treeData}
            ref={ref}
            width={width}
            height={height}
            openByDefault={false}
            className="shadcn-scroll"
            rowClassName="outline-none"
            rowHeight={32}
            renderCursor={useCallback(() => null, [])}
            onMove={onMove as MoveHandler<TreeNode>}
            onRename={onRename as RenameHandler<TreeNode>}
            onDelete={onDelete as DeleteHandler<TreeNode>}
            onCreate={wrappedOnCreate}
            onSelect={handleSelect}
            onToggle={handleToggle}
            selection={selectedId}
            disableMultiSelection
          >
            {TreeNodeRender}
          </Tree>
        )} />
      </div>
    </div>
  );
}
