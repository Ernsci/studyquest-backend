import "dotenv/config";

/**
 * The API's only reader of `process.env`. Everything here is server-side only:
 * the service-role key and the demo password must never reach the browser, and
 * the frontend has no access to any of these variables.
 */

const TRUE_VALUES = ["1", "true", "yes", "on"];

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return TRUE_VALUES.includes(value.trim().toLowerCase());
}

function str(value: string | undefined): string {
  return (value ?? "").trim();
}

function list(value: string | undefined): string[] {
  return str(value)
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export const env = {
  nodeEnv: str(process.env.NODE_ENV) || "development",
  port: Number.parseInt(str(process.env.PORT) || "8080", 10),
  /** Browser origins allowed to call this API (the Vercel deployment). */
  corsOrigins: list(process.env.CORS_ORIGINS),
  supabaseUrl: str(process.env.SUPABASE_URL).replace(/\/+$/, ""),
  supabaseAnonKey: str(process.env.SUPABASE_ANON_KEY),
  supabaseSecretKey: str(process.env.SUPABASE_SECRET_KEY),
  enableDemoMode: bool(process.env.ENABLE_DEMO_MODE, true),
  demoPassword: str(process.env.DEMO_PASSWORD),
} as const;

export const isProduction = env.nodeEnv === "production";

export function isSupabaseConfigured(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}

/** Bundled sample content is served when Supabase is missing or demo mode is on. */
export function isDemoModeEnabled(): boolean {
  return env.enableDemoMode || !isSupabaseConfigured();
}

/**
 * Demo accounts (and their bearer tokens) only exist while Supabase is off, so
 * connecting the real database immediately disables every shortcut.
 */
export function isDemoAccountModeEnabled(): boolean {
  return !isSupabaseConfigured();
}

export function originAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return env.corsOrigins.includes(origin);
}
