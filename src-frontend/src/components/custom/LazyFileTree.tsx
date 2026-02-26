"use client";

import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
  type FileTreeProps,
} from "@/components/ai-elements/file-tree";
import { FileIcon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileTreeNodeType = "file" | "folder";

export interface FileTreeNode {
  /** Unique path identifier, e.g. "src/components/Button.tsx" */
  path: string;
  /** Display name */
  name: string;
  type: FileTreeNodeType;
  /** Optional icon override for files */
  icon?: React.ReactNode;
}

/**
 * Called when a folder is opened for the first time.
 * Return the direct children of that folder.
 */
export type LoadChildren = (folderPath: string) => Promise<FileTreeNode[]>;

// ─── Internal per-folder state ────────────────────────────────────────────────

type FolderStatus = "idle" | "loading" | "loaded" | "error";

interface FolderState {
  status: FolderStatus;
  children: FileTreeNode[];
  error?: string;
}

// ─── LazyFileTreeFolder ───────────────────────────────────────────────────────

interface LazyFileTreeFolderProps {
  node: FileTreeNode;
  loadChildren: LoadChildren;
  depth?: number;
}

const LazyFileTreeFolder = ({
  node,
  loadChildren,
  depth = 0,
}: LazyFileTreeFolderProps) => {
  const [state, setState] = useState<FolderState>({
    status: "idle",
    children: [],
  });

  // Track whether we've ever tried to load (so we don't reload on collapse/expand)
  const hasLoadedRef = useRef(false);

  const handleFolderSelect = useCallback(async () => {
    // Only fetch once
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    setState((prev) => ({ ...prev, status: "loading" }));

    try {
      const children = await loadChildren(node.path);
      setState({ status: "loaded", children });
    } catch (err) {
      hasLoadedRef.current = false; // allow retry on error
      setState({
        status: "error",
        children: [],
        error: err instanceof Error ? err.message : "Failed to load",
      });
    }
  }, [node.path, loadChildren]);

  return (
    <FileTreeFolder name={node.name} path={node.path}>
      {/* Trigger load when folder is rendered into open state */}
      <FolderContentLoader
        folderPath={node.path}
        state={state}
        onMount={handleFolderSelect}
        loadChildren={loadChildren}
        depth={depth}
      />
    </FileTreeFolder>
  );
};

// ─── FolderContentLoader ──────────────────────────────────────────────────────
// Mounts only when the folder is open (CollapsibleContent renders children).
// Using a tiny inner component lets us call onMount via useEffect reliably.

interface FolderContentLoaderProps {
  folderPath: string;
  state: FolderState;
  onMount: () => void;
  loadChildren: LoadChildren;
  depth: number;
}

const FolderContentLoader = ({
  state,
  onMount,
  loadChildren,
  depth,
}: FolderContentLoaderProps) => {
  useEffect(() => {
    onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground text-xs">
        <Loader2Icon className="size-3 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-2 py-1 text-destructive text-xs">
        ⚠ {state.error ?? "Error loading contents"}
      </div>
    );
  }

  if (state.children.length === 0) {
    return (
      <div className="px-2 py-1 text-muted-foreground text-xs italic">
        Empty folder
      </div>
    );
  }

  return (
    <>
      {state.children.map((child) =>
        child.type === "folder" ? (
          <LazyFileTreeFolder
            depth={depth + 1}
            key={child.path}
            loadChildren={loadChildren}
            node={child}
          />
        ) : (
          <FileTreeFile
            icon={child.icon ?? <FileIcon className="size-4 text-muted-foreground" />}
            key={child.path}
            name={child.name}
            path={child.path}
          />
        )
      )}
    </>
  );
};

// ─── LazyFileTree (public API) ────────────────────────────────────────────────

export type LazyFileTreeProps = Omit<FileTreeProps, "children" | "onSelect"> & {
  /** Root-level nodes shown immediately (no loading needed) */
  rootNodes: FileTreeNode[];
  /**
   * Async function called with a folder's path when it's first expanded.
   * Should return that folder's direct children.
   */
  loadChildren: LoadChildren;
  /** Optional callback when a file or folder is selected */
  onSelect?: (path: string, type: "file" | "folder") => void;
};

/**
 * A file tree with on-demand (lazy) loading of folder contents.
 *
 * Usage:
 * ```tsx
 * <LazyFileTree
 *   rootNodes={[
 *     { path: "src", name: "src", type: "folder" },
 *     { path: "package.json", name: "package.json", type: "file" },
 *   ]}
 *   loadChildren={async (folderPath) => {
 *     const res = await fetch(`/api/tree?path=${folderPath}`);
 *     return res.json(); // FileTreeNode[]
 *   }}
 *   selectedPath={selected}
 *   onSelect={setSelected}
 * />
 * ```
 */
export const LazyFileTree = ({
  rootNodes,
  loadChildren,
  onSelect,
  ...fileTreeProps
}: LazyFileTreeProps) => {
  return (
    <FileTree {...fileTreeProps} onSelect={onSelect as FileTreeProps["onSelect"]}>
      {rootNodes.map((node) =>
        node.type === "folder" ? (
          <LazyFileTreeFolder
            depth={0}
            key={node.path}
            loadChildren={loadChildren}
            node={node}
          />
        ) : (
          <FileTreeFile
            icon={node.icon ?? <FileIcon className="size-4 text-muted-foreground" />}
            key={node.path}
            name={node.name}
            path={node.path}
          />
        )
      )}
    </FileTree>
  );
};