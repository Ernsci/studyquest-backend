import type { ErrorRequestHandler, RequestHandler } from "express";

import { isProduction } from "../config/env";
import { describeError, logError, logWarn } from "../lib/logger";
import { ApiError, fromHttpError } from "./errors";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: "not_found", message: `No route handles ${req.method} ${req.path}.` },
  });
};

/**
 * Terminal error handler. Known failures keep their status and message; anything
 * unexpected is logged with context (operation + path) and answered with a short
 * sentence, so internal details never reach a response body in production.
 *
 * `fromHttpError` steps in for parser-level failures (malformed or oversized
 * bodies) that arrive as plain `http-errors` — a bad request from the caller
 * must never be reported as a server fault.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const apiError = error instanceof ApiError ? error : fromHttpError(error);

  if (apiError) {
    if (error instanceof ApiError) {
      if (apiError.status >= 500) logError(`api ${req.method} ${req.path}`, error);
    } else {
      logWarn("api", `${req.method} ${req.path} rejected (${apiError.status} ${apiError.code})`);
    }
    if (apiError.retryAfterSeconds !== undefined) {
      res.setHeader("Retry-After", String(apiError.retryAfterSeconds));
    }
    res.status(apiError.status).json({
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.fieldErrors ? { fieldErrors: apiError.fieldErrors } : {}),
      },
    });
    return;
  }

  logError(`api ${req.method} ${req.path}`, error);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: isProduction ? "Something went wrong on our side." : describeError(error),
    },
  });
};

