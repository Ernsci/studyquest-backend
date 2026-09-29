import type { ZodError } from "zod";

import { fieldErrorsFrom } from "../lib/validation";



export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "unsupported_media_type"
  | "rate_limited"
  | "upstream_error"
  | "internal_error";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  upstream_error: 502,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      fieldErrors?: Record<string, string[]>;
      retryAfterSeconds?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = options.fieldErrors;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  static fromZod(error: ZodError, message = "Some fields need attention."): ApiError {
    return new ApiError("bad_request", message, { fieldErrors: fieldErrorsFrom(error) });
  }
}

export const badRequest = (message: string): ApiError => new ApiError("bad_request", message);
export const unauthorized = (message = "Sign in to continue."): ApiError =>
  new ApiError("unauthorized", message);
export const forbidden = (message = "You do not have access to this resource."): ApiError =>
  new ApiError("forbidden", message);
export const notFound = (message = "That resource does not exist."): ApiError =>
  new ApiError("not_found", message);
export const notConfigured = (message: string): ApiError =>
  new ApiError("upstream_error", message);


export function fromHttpError(error: unknown): ApiError | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = [candidate.status, candidate.statusCode].find(
    (value): value is number => typeof value === "number",
  );
  if (status === undefined || status < 400 || status > 499) return null;

  if (status === 413) {
    return new ApiError("payload_too_large", "That request body is too large. Send a smaller payload.");
  }
  if (status === 415) {
    return new ApiError("unsupported_media_type", "Unsupported content type — send application/json.");
  }
  return new ApiError("bad_request", "That request body could not be read. Send valid JSON.");
}
