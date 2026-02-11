import { API_BASE } from "./index";

type ErrorResponse = {
  error_code: string;
  message: string;
};

export class FetchError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.name = "FetchError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  static fromErrorResponse(statusCode: number, res: ErrorResponse): FetchError {
    return new FetchError(statusCode, res.error_code, res.message);
  }
}

export async function fetchApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${input}`, init);
  if (res.ok) {
    if (res.status === 204) {
      return {} as T;
    }
    return (await res.json()) as T;
  }

  try {
    const errorBody = (await res.json()) as ErrorResponse;
    throw FetchError.fromErrorResponse(res.status, errorBody);
  } catch {
    console.warn(
      `Failed to parse error response as JSON: ${res.status} ${res.statusText}`
    );
    throw new FetchError(res.status, `HTTP_${res.status}`, res.statusText);
  }
}
