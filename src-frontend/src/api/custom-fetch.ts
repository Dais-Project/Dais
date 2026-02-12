import { API_BASE } from "./index";

type ErrorResponse = {
  error_code: string;
  message: string;
};

export class FetchError<E extends ErrorResponse> extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, error: E) {
    super(error.message);
    this.name = "FetchError";
    this.statusCode = statusCode;
    this.errorCode = error.error_code;
  }
}

export type ErrorType<E extends ErrorResponse> = FetchError<E>;

export async function fetchApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const url = new URL(input.toString(), API_BASE);
  const res = await fetch(url, init);
  if (res.ok) {
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  try {
    const errorBody = (await res.json()) as ErrorResponse;
    throw new FetchError(res.status, errorBody);
  } catch {
    console.warn(
      `Failed to parse error response as JSON: ${res.status} ${res.statusText}`
    );
    throw new FetchError(res.status, {
      error_code: "HTTP_ERROR",
      message: res.statusText,
    });
  }
}
