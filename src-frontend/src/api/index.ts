const port = globalThis.__INJECTED__.server_port;
export const API_BASE = `http://localhost:${port}/`;

export class FetchError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "FetchError";
    this.statusCode = statusCode;
  }
}

export async function fetchApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  if (res.ok) {
    const text = await res.text();
    if (!text) {
      // No content
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  let errorMessage: string;
  try {
    // backend error body: { error: xxx }
    const body = await res.json();
    errorMessage = body?.error ?? `HTTP_${res.status}`;
  } catch {
    errorMessage = res.statusText || `HTTP_${res.status}`;
  }
  throw new FetchError(errorMessage, res.status);
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};
