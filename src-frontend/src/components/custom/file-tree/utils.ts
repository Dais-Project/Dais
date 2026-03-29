import { type TreeItem, type TreeNode } from "./types";

export function buildTree(data: TreeItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const item of data) {
    if (item.type === "folder") {
      map.set(item.id, {
        ...item,
        children: [],
      });
    } else {
      map.set(item.id, {
        ...item,
      });
    }
  }

  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent && parent.type === "folder") {
        parent.children.push(node);
      }
    }
  }

  return roots;
}

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

export function arboristDataToResources(data: TreeItem[]): { relative: string; content: string }[] {
  const result: { relative: string; content: string }[] = [];
  const tree = buildTree(data);

  function dfs(node: TreeNode, parentPath: string) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type === "file") {
      result.push({
        relative: currentPath,
        content: node.content,
      });
      return;
    }
    for (const child of node.children) {
      dfs(child, currentPath);
    }
  }

  for (const root of tree) {
    dfs(root, "");
  }
  return result;
}
