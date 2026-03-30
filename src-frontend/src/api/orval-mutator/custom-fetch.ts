import { ErrorResponseSchema, McpConnectErrorCode } from "../generated/schemas";
import { API_BASE } from "..";

export type ErrorCode = ErrorResponseSchema["error_code"] | McpConnectErrorCode | "NETWORK_ERROR";

export type ErrorResponse = {
  error_code: ErrorCode;
  message: string;
};

export class FetchError<E extends ErrorResponse> extends Error {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;

  constructor(statusCode: number, error: E) {
    super(error.message);
    this.name = "FetchError";
    this.statusCode = statusCode;
    this.errorCode = error.error_code;
    this.message = error.message;
  }
}

export type ErrorType<E extends ErrorResponse> = FetchError<E>;

export async function fetchApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const url = new URL(input.toString(), API_BASE);
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new FetchError(500, {
      error_code: "NETWORK_ERROR",
      message: "Network error when fetching",
    });
  }

  if (res.ok) {
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  let errorBody: ErrorResponse;
  try {
    errorBody = (await res.json()) as ErrorResponse;
  } catch {
    console.warn(`Failed to parse error response as JSON: ${res.status} ${res.statusText}`);
    throw new FetchError(res.status, {
      error_code: "UNEXPECTED_ERROR",
      message: res.statusText,
    });
  }
  throw new FetchError(res.status, errorBody);
}
