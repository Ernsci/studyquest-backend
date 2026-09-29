import type { z, ZodError } from "zod";

import { ApiError } from "./errors";



export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw ApiError.fromZod(result.error as ZodError);
  return result.data;
}
