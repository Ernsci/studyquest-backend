import type { z, ZodError } from "zod";

import { ApiError } from "./errors";

/**
 * Body/query/param validation. Nothing reaches a store method before passing
 * through a zod schema, and a failure is reported as per-field messages the
 * frontend can render next to the input that caused it.
 */

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw ApiError.fromZod(result.error as ZodError);
  return result.data;
}
