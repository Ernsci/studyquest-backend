import { createApp } from "./app";
import { env, isSupabaseConfigured } from "./config/env";
import { logError, logInfo, logWarn } from "./lib/logger";
import { resolveDataLayer, seedDemoAccounts } from "./lib/store";

/**
 * Entry point. Fails fast (non-zero exit) on a misconfigured environment —
 * a Render deploy that cannot serve correct data should never look healthy.
 */
async function main(): Promise<void> {
  const mode = resolveDataLayer();

  if (mode === "demo") await seedDemoAccounts();
  if (isSupabaseConfigured() && env.supabaseSecretKey.length === 0) {
    logWarn(
      "env",
      "Supabase is configured without SUPABASE_SECRET_KEY: admin reads and token verification fall back to the anon key.",
    );
  }
  if (env.corsOrigins.length === 0) {
    logWarn(
      "env",
      "CORS_ORIGINS is empty — browser requests from the frontend will be refused in production.",
    );
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logInfo("server", `studyquest-api listening on port ${env.port} (content: ${mode})`);
  });

  const shutdown = (signal: string): void => {
    logInfo("server", `${signal} received — draining connections`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  logError("bootstrap", error);
  process.exit(1);
});
