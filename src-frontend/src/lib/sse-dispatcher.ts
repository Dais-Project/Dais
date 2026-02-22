import type { DispatcherEvent, DispatcherEventData } from "@/api/generated/schemas";
import { createSseStream } from "./sse";

type DispatcherEventHandler = (data: DispatcherEventData) => unknown;

class _SseDispatcher {
  private abortController: AbortController | null = null;
  private readonly listeners: Map<DispatcherEvent, Set<DispatcherEventHandler>> = new Map();

  on(eventType: DispatcherEvent, callback: DispatcherEventHandler) {
    const listeners = this.listeners.get(eventType) ?? new Set();
    listeners.add(callback);
    this.listeners.set(eventType, listeners);
  }

  off(eventType: DispatcherEvent, callback: DispatcherEventHandler) {
    const listeners = this.listeners.get(eventType);
    if (!listeners) {
      return;
    }
    listeners.delete(callback);
    if (listeners.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  subscribe(eventType: DispatcherEvent, callback: DispatcherEventHandler): () => void {
    this.on(eventType, callback);
    return () => this.off(eventType, callback);
  }

  connect(url: URL | string) {
    this.abortController = createSseStream(url, {
      onMessage: ({ event, data }) => {
        const listeners = this.listeners.get(event as DispatcherEvent);
        if (!listeners) {
          return;
        }
        for (const callback of listeners) {
          callback(data as DispatcherEventData);
        }
      },
    });
  }

  disconnect() {
    this.abortController?.abort();
    this.abortController = null;
    this.listeners.clear();
  }
}

export default new _SseDispatcher();
