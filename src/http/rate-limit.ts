import type { RequestHandler } from "express";

import { limits } from "../config/app-config";
import { checkRateLimit, clientIp, rateKey } from "../lib/rate-limit";
import { ApiError } from "./errors";

type Bucket = keyof typeof limits.rateLimits;

/**
 * Per-user (or per-IP) request limiting. Runs after `attachAuth`, so signed-in
 * callers are keyed on an id they cannot forge.
 */
export function rateLimit(bucket: Bucket): RequestHandler {
  return (req, _res, next) => {
    const ip = clientIp(req.header("x-forwarded-for"), req.ip);
    const decision = checkRateLimit(bucket, rateKey(req.auth?.userId ?? null, ip));
    if (!decision.ok) {
      next(
        new ApiError("rate_limited", "Too many requests — please slow down and try again.", {
          retryAfterSeconds: decision.retryAfterSeconds,
        }),
      );
      return;
    }
    next();
  };
}
