import { isDemoModeEnabled, isSupabaseConfigured } from "../../config/env";
import { logWarn } from "../logger";
import { supabaseAdmin } from "../supabase/admin";
import { createDemoContentSource } from "./content-source";
import { createInMemoryLearnerStore } from "./learner-store";
import { createSupabaseStore } from "./supabase-store";
import type { StudyQuestStore } from "./types";



export const DEMO_ACCOUNTS = { learner: "demo-learner", admin: "demo-admin" } as const;

const content = createDemoContentSource();
const learner = createInMemoryLearnerStore(content);
const demoStore: StudyQuestStore = { ...content, ...learner };
let configuredSupabaseStore: StudyQuestStore | null = null;

function supabaseStore(): StudyQuestStore {
  configuredSupabaseStore ??= createSupabaseStore();
  return configuredSupabaseStore;
}

export const store = new Proxy(demoStore, {
  get(_target, property) {
    const selected = isSupabaseConfigured() && !isDemoModeEnabled() ? supabaseStore() : demoStore;
    const value: unknown = Reflect.get(selected, property, selected);
    return typeof value === "function" ? value.bind(selected) : value;
  },
}) as StudyQuestStore;

export type DataLayerMode = "demo" | "supabase";

export function resolveDataLayer(): DataLayerMode {
  if (!isSupabaseConfigured()) return "demo";
  if (!isDemoModeEnabled()) {
    if (!supabaseAdmin()) throw new Error("SUPABASE_SECRET_KEY is required when ENABLE_DEMO_MODE=false.");
    supabaseStore();
    return "supabase";
  }
  logWarn("store", "Demo data mode is enabled; learner changes remain in this server's memory.");
  return "demo";
}


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
