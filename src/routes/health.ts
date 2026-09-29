import { Router } from "express";

import { site } from "../config/app-config";
import { isDemoAccountModeEnabled, isDemoModeEnabled, isSupabaseConfigured } from "../config/env";

export const healthRouter = Router();

/** Liveness/readiness probe. Render calls this to decide whether to route to it. */
healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "studyquest-api",
    version: "1.0.0",
    site: site.name,
    contentMode: isDemoModeEnabled() ? "demo" : "supabase",
    supabaseConfigured: isSupabaseConfigured(),
    demoAccountsEnabled: isDemoAccountModeEnabled(),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
