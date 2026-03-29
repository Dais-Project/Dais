import { TreeItem } from "./types";

/**
 * 比较两个 TreeItem 是否在所有字段上完全相等（浅比较即可，因为每个字段都是原始值）
 */
function isTreeItemEqual(a: TreeItem, b: TreeItem): boolean {
  if (a.id !== b.id) return false;
  if (a.name !== b.name) return false;
  if (a.parentId !== b.parentId) return false;
  if (a.type !== b.type) return false;
  // 仅 file 类型有 content 字段
  if (a.type === "file" && b.type === "file") {
    if (a.content !== b.content) return false;
  }
  return true;
}

/**
 * 对 next 数组中的每个元素，若在 prev 中存在相同 id 且所有字段相等，
 * 则复用 prev 中的对象引用，否则使用 next 中的新对象。
 *
 * 同时处理以下场景：
 * - 新增元素：直接使用 next 中的对象
 * - 删除元素：不出现在返回结果中（以 next 的长度/内容为准）
 * - 修改元素：使用 next 中的新对象
 * - 未变元素：复用 prev 中的旧对象引用 ✅
 *
 * 若 next 数组整体引用未变，直接返回 prev（最短路）。
 */
export function diffTreeItems(prev: TreeItem[], next: TreeItem[]): TreeItem[] {
  // 快速路径：引用相同，直接返回
  if (prev === next) return prev;

  const prevMap = new Map<string, TreeItem>(
    prev.map((item) => [item.id, item])
  );

  let changed = prev.length !== next.length;
  const result: TreeItem[] = new Array(next.length);

  for (let i = 0; i < next.length; i++) {
    const nextItem = next[i]!;
    const prevItem = prevMap.get(nextItem.id);

    if (prevItem !== undefined && isTreeItemEqual(prevItem, nextItem)) {
      // 内容完全相同 → 复用旧引用
      result[i] = prevItem;
    } else {
      // 新增 or 已修改 → 使用新对象
      result[i] = nextItem;
      changed = true;
    }
  }

  // 若所有元素引用都未变且长度相同，返回原数组引用
  return changed ? result : prev;
}