

const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g,
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
  const detail =
    error instanceof Error
      ? error.stack ?? `${error.name}: ${error.message}`
      : safeStringify(error);
  console.error(`[studyquest:${scope}]`, scrub(detail));
}

export function logWarn(scope: string, message: string): void {
  console.warn(`[studyquest:${scope}]`, scrub(message));
}


export function describeError(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;
  if (typeof error === "string") return scrub(error) || fallback;
  if (error instanceof Error) return scrub(error.message) || fallback;
  const maybe = error as { message?: string; msg?: string; error_description?: string };
  return scrub(maybe.message ?? maybe.msg ?? maybe.error_description ?? "") || fallback;
}
