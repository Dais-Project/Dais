import type { DispatcherEventData } from "@/api/generated/schemas";
import { createSseStream } from "./sse";

type DispatcherEvent = DispatcherEventData["event_id"];
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

  connect(url: URL | string, onConnect?: (response: Response) => void) {
    this.abortController = createSseStream<DispatcherEventData>(url, {
      onConnect,
      onMessage: ({ data } ) => {
        if (data === null) {
          return;
        }
        const listeners = this.listeners.get(data.event_id);
        if (!listeners) {
          return;
        }
        for (const callback of listeners) {
          callback(data);
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
