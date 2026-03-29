// hooks/use-stable-tree-data.ts

import { useRef } from "react";
import { TreeItem } from "./types";
import { diffTreeItems } from "./diff";

/**
 * 接收外部传入的 data，返回一个「引用稳定」的版本：
 * 只有真正发生内容变化的元素才会产生新引用，
 * 从而使依赖 data 的 useMemo / useEffect 不被无效触发。
 */
export function useStableTreeData(data: TreeItem[]): TreeItem[] {
  // 保存上一次稳定化后的结果
  const stableRef = useRef<TreeItem[]>(data);
  // 保存上一次外部传入的原始值（用于判断是否需要重新 diff）
  const prevInputRef = useRef<TreeItem[]>(data);

  if (data !== prevInputRef.current) {
    // 外部引用变了，才进入 diff 流程
    const next = diffTreeItems(stableRef.current, data);
    stableRef.current = next;
    prevInputRef.current = data;
  }

  return stableRef.current;
}
