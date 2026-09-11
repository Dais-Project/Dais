import { beforeEach, describe, expect, test, vi } from "vitest";

const { createSseStream } = vi.hoisted(() => ({
  createSseStream: vi.fn(),
}));

vi.mock("@/api", () => ({ API_BASE: "http://localhost/" }));
vi.mock("@/lib/sse", () => ({ createSseStream }));

import sseDispatcher from "@/lib/sse-dispatcher";

describe("sseDispatcher", () => {
  beforeEach(() => {
    sseDispatcher.disconnect();
    createSseStream.mockReset();
  });

  test("aborts the previous stream before connecting again", () => {
    const firstAbortController = { abort: vi.fn() } as unknown as AbortController;
    const secondAbortController = { abort: vi.fn() } as unknown as AbortController;
    createSseStream
      .mockReturnValueOnce(firstAbortController)
      .mockReturnValueOnce(secondAbortController);

    sseDispatcher.connect("/api/events/");
    sseDispatcher.connect("/api/events/");

    expect(firstAbortController.abort).toHaveBeenCalledOnce();
    expect(createSseStream).toHaveBeenCalledTimes(2);
  });

  test("reconnects to the previous endpoint without clearing listeners", () => {
    const firstAbortController = { abort: vi.fn() } as unknown as AbortController;
    const secondAbortController = { abort: vi.fn() } as unknown as AbortController;
    createSseStream
      .mockReturnValueOnce(firstAbortController)
      .mockReturnValueOnce(secondAbortController);
    const listener = vi.fn();

    sseDispatcher.subscribe("RESOURCE_CHANGED", listener);
    sseDispatcher.connect("/api/events/");
    sseDispatcher.reconnect();

    const reconnectOptions = createSseStream.mock.calls[1][1];
    reconnectOptions.onMessage({
      event: "RESOURCE_CHANGED",
      data: {
        event_id: "RESOURCE_CHANGED",
        resource_type: "agent",
        operation: "updated",
        resource_id: 1,
      },
    });

    expect(firstAbortController.abort).toHaveBeenCalledOnce();
    expect(createSseStream).toHaveBeenLastCalledWith(
      "/api/events/",
      expect.any(Object),
    );
    expect(listener).toHaveBeenCalledOnce();
  });

  test("does not reconnect after an explicit disconnect", () => {
    const abortController = { abort: vi.fn() } as unknown as AbortController;
    createSseStream.mockReturnValue(abortController);

    sseDispatcher.connect("/api/events/");
    sseDispatcher.disconnect();
    sseDispatcher.reconnect();

    expect(abortController.abort).toHaveBeenCalledOnce();
    expect(createSseStream).toHaveBeenCalledOnce();
  });
});
