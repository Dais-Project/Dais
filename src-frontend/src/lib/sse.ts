import { fetchEventSource } from "@microsoft/fetch-event-source";

type SseStreamOptions<TData> = {
  body?: object;
  method?: string;
  headers?: Record<string, string>;
  onConnect?: (response: Response) => void;
  onMessage: (event: { event: string; data: TData | null }) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

export function createSseStream<TData>(
  url: URL | string,
  { body, method = "POST", headers = {}, onConnect, onMessage, onError, onClose }: SseStreamOptions<TData>
): AbortController {
  const abortController = new AbortController();

  fetchEventSource(new Request(url), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: abortController.signal,

    async onopen(response) {
      if (response.ok) {
        onConnect?.(response);
        return;
      }

      let errorMessage: string;
      try {
        const responseBody = await response.json();
        errorMessage = responseBody?.error ?? `HTTP_${response.status}`;
      } catch {
        errorMessage = response.statusText || `HTTP_${response.status}`;
      }
      throw new Error(errorMessage);
    },

    onmessage(event) {
      let data: TData | null;

      try {
        if (event.data.length) {
          data = JSON.parse(event.data);
        } else {
          data = null;
        }
      } catch (error) {
        console.error(
          `\
Failed to parse SSE message
message type: ${event.event}
message data: ${event.data}`,
          error
        );
        onError?.(error instanceof Error ? error : new Error("Failed to parse SSE message"));
        return;
      }

      if (event.event.length === 0 && data === null) {
        // keepalive message
        return;
      }
      onMessage({ event: event.event, data });
    },

    onerror(error) {
      onError?.(error instanceof Error ? error : new Error("SSE connection error"));
      console.error(error);
    },

    onclose() {
      onClose?.();
    },
  });

  return abortController;
}
