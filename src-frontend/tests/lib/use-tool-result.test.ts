import { describe, expect, test } from "vitest";
import { uiToolMessageFactory } from "@/types/message";
import { useToolResult } from "@/features/Tabs/TaskPanel/hooks/use-tool-result";

describe("useToolResult", () => {
  test("prefers original text over truncated result", () => {
    const message = uiToolMessageFactory("call", "tool", {});
    message.result = "truncated";
    message.metadata = { original_result: "complete" };

    expect(useToolResult<string>(message)).toBe("complete");
    expect(message.result).toBe("truncated");
  });

  test("returns original content blocks", () => {
    const message = uiToolMessageFactory("call", "tool", {});
    const blocks = [{ resource_id: "text-id", text: "complete" }];
    message.result = [{ resource_id: "text-id", text: "truncated" }];
    message.metadata = { original_result: blocks };

    expect(useToolResult<typeof blocks>(message)).toEqual(blocks);
  });

  test("falls back to the result when original_result is absent", () => {
    const message = uiToolMessageFactory("call", "tool", {});
    message.result = "unchanged";

    expect(useToolResult<string>(message)).toBe("unchanged");
  });

  test("returns null for unfinished calls", () => {
    const message = uiToolMessageFactory("call", "tool", {});

    expect(useToolResult<string>(message)).toBeNull();
  });
});
