/**
 * Minimal logging helpers.
 *
 * Rules enforced here:
 *  - Never log tokens, cookies, keys, passwords, or full rows of personal data.
 *  - Supabase/Postgres error text is logged verbatim *after* scrubbing anything
 *    that looks like a JWT or key, because those messages are what you need
 *    when an RLS policy silently returns zero rows.
 */

const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, // JWTs
  /\b(sb_|eyJ|eyJhbGciOi|service_role|secret)[A-Za-z0-9_\-]{6,}/gi,
  /("?(apikey|api_key|password|token|authorization|secret)"?\s*[:=]\s*)"?[^"\s,}]+/gi,
];

export function scrub(input: unknown): string {
  let text = typeof input === "string" ? input : safeStringify(input);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[redacted]");
  }
  return text.slice(0, 2000);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function logInfo(scope: string, message: string): void {
  console.info(`[studyquest:${scope}]`, scrub(message));
}

export function logError(scope: string, error: unknown): void {
  console.error(`[studyquest:${scope}]`, scrub(error));
}

export function logWarn(scope: string, message: string): void {
  console.warn(`[studyquest:${scope}]`, scrub(message));
}

/** Turn an unknown thrown value into a short, safe, human-readable message. */
export function describeError(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;
  if (typeof error === "string") return scrub(error) || fallback;
  if (error instanceof Error) return scrub(error.message) || fallback;
  const maybe = error as { message?: string; msg?: string; error_description?: string };
  return scrub(maybe.message ?? maybe.msg ?? maybe.error_description ?? "") || fallback;
}
