import type { DispatcherEventData } from "@/api/generated/schemas";
import { createSseStream } from "./sse";

type DispatcherEvent = DispatcherEventData["event_id"];

type DispatcherEventMap = {
  [TEvent in DispatcherEvent]: Extract<DispatcherEventData, { event_id: TEvent }>;
};

type DispatcherEventHandler<TEvent extends DispatcherEvent> = (data: DispatcherEventMap[TEvent]) => void;

class _SseDispatcher {
  private abortController: AbortController | null = null;
  private readonly listeners: Map<DispatcherEvent, Set<unknown>> = new Map();

  private getEventListeners<TEvent extends DispatcherEvent>(eventType: TEvent): Set<DispatcherEventHandler<TEvent>> {
    const listeners = this.listeners.get(eventType) as Set<DispatcherEventHandler<TEvent>> | undefined;
    if (listeners) {
      return listeners;
    }

    const nextListeners = new Set<DispatcherEventHandler<TEvent>>();
    this.listeners.set(eventType, nextListeners as Set<unknown>);
    return nextListeners;
  }

  on<TEvent extends DispatcherEvent>(eventType: TEvent, callback: DispatcherEventHandler<TEvent>) {
    const listeners = this.getEventListeners(eventType);
    listeners.add(callback);
  }

  off<TEvent extends DispatcherEvent>(eventType: TEvent, callback: DispatcherEventHandler<TEvent>) {
    const listeners = this.listeners.get(eventType) as Set<DispatcherEventHandler<TEvent>> | undefined;
    if (!listeners) {
      return;
    }

    listeners.delete(callback);
    if (listeners.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  subscribe<TEvent extends DispatcherEvent>(eventType: TEvent, callback: DispatcherEventHandler<TEvent>): () => void {
    this.on(eventType, callback);
    return () => this.off(eventType, callback);
  }

  private emit<TEvent extends DispatcherEvent>(eventType: TEvent, data: DispatcherEventMap[TEvent]) {
    const listeners = this.listeners.get(eventType) as Set<DispatcherEventHandler<TEvent>> | undefined;
    if (!listeners) {
      return;
    }

    for (const callback of listeners) {
      callback(data);
    }
  }

  connect(url: URL | string, onConnect?: (response: Response) => void) {
    this.abortController = createSseStream<DispatcherEventData>(url, {
      onConnect,
      onMessage: ({ data }) => {
        if (data === null) {
          return;
        }

        this.emit(data.event_id, data);
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
