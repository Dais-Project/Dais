export type TreeItem = {
  id: string;
  name: string;
  parentId: string | null;
} & (
    | { type: "folder" }
    | { type: "file"; content: string }
  );

export type TreeNode = TreeItem & (
  | { type: "folder"; children: TreeNode[] }
  | { type: "file" }
);
