import { isDemoModeEnabled, isSupabaseConfigured } from "../../config/env";
import { logWarn } from "../logger";
import { createDemoContentSource } from "./content-source";
import { createInMemoryLearnerStore } from "./learner-store";
import type { StudyQuestStore } from "./types";

/**
 * Data-layer selection — the single place to change when Supabase is connected.
 *
 * Today the API serves the bundled sample content and keeps learner state in
 * memory, because the Supabase schema has not been created yet. `server.ts`
 * refuses to start when Supabase env vars are present and demo mode is off, so
 * "configured but not implemented" can never be mistaken for working.
 */

export const DEMO_ACCOUNTS = { learner: "demo-learner", admin: "demo-admin" } as const;

const content = createDemoContentSource();
const learner = createInMemoryLearnerStore(content);

export const store: StudyQuestStore = { ...content, ...learner };

export type DataLayerMode = "demo" | "supabase";

export function resolveDataLayer(): DataLayerMode {
  if (!isSupabaseConfigured()) return "demo";
  if (!isDemoModeEnabled()) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_ANON_KEY are set but the Supabase data layer is not implemented yet. " +
        "Set ENABLE_DEMO_MODE=true to keep serving the bundled sample content, or remove the Supabase variables.",
    );
  }
  logWarn(
    "store",
    "Supabase is configured but the Supabase data layer is not implemented yet — content and progress still come from this instance's memory until it lands.",
  );
  return "demo";
}

/** Creates the two demo identities so the frontend can be exercised end to end. */
export async function seedDemoAccounts(): Promise<void> {
  await learner.ensureProfile({
    id: DEMO_ACCOUNTS.learner,
    email: "learner@studyquest.demo",
    displayName: "Demo Learner",
    role: "learner",
  });
  await learner.ensureProfile({
    id: DEMO_ACCOUNTS.admin,
    email: "admin@studyquest.demo",
    displayName: "Demo Admin",
    role: "admin",
  });
}

export type { StudyQuestStore } from "./types";
