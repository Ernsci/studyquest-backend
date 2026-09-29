import { learning } from "../../config/app-config";
import type {
  AttemptResult,
  AttemptSummary,
  AuditEntry,
  Bookmark,
  ContentReport,
  DailyActivity,
  FeedbackEntry,
  Profile,
  SavedQuestion,
} from "../types";
import { addDays, clamp, percent, todayISO } from "../utils";
import type { EnsureProfileInput, LessonProgressRow } from "./types";

/**
 * Learner state kept in this process's memory.
 *
 * Honest limits, stated up front: counters reset when the API restarts and a
 * deployment with more than one instance will show different numbers per
 * instance. That is acceptable while the API serves bundled sample content — the
 * shape of every method matches the Supabase implementation that replaces it, so
 * routes, grading and the frontend do not change when the database is connected.
 */

export type Store = {
  profiles: Map<string, Profile>;
  attempts: Map<string, AttemptResult[]>;
  lessons: Map<string, Map<string, LessonProgressRow>>;
  bookmarks: Map<string, Bookmark[]>;
  review: Map<string, SavedQuestion[]>;
  activity: Map<string, DailyActivity[]>;
  reports: ContentReport[];
  feedback: FeedbackEntry[];
  audit: AuditEntry[];
};

const ATTEMPTS_PER_USER = 200;
const MAX_ROWS = 500;

export function createMemory(): Store {
  return {
    profiles: new Map(),
    attempts: new Map(),
    lessons: new Map(),
    bookmarks: new Map(),
    review: new Map(),
    activity: new Map(),
    reports: [],
    feedback: [],
    audit: [],
  };
}

export function lessonKey(subjectSlug: string, lessonSlug: string): string {
  return `${subjectSlug}/${lessonSlug}`;
}

export function emptyProfile(input: EnsureProfileInput): Profile {
  const email = input.email ?? "";
  const fallbackName = email.includes("@") ? (email.split("@")[0] ?? "Learner") : "Learner";
  return {
    id: input.id,
    email,
    displayName: input.displayName?.trim() || fallbackName,
    username: null,
    avatarUrl: null,
    bio: null,
    role: input.role ?? "learner",
    weeklyGoalLessons: learning.plan.defaultLessonsPerWeek,
    reminderTime: null,
    reminderEnabled: false,
    themeMode: "system",
    xp: 0,
    freezeTokens: 0,
    emailVerifiedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function touchActivity(
  store: Store,
  userId: string,
  patch: Partial<DailyActivity>,
): DailyActivity {
  const today = todayISO();
  const rows = store.activity.get(userId) ?? [];
  let row = rows.find((item) => item.date === today);
  if (!row) {
    row = { date: today, lessonsCompleted: 0, xpEarned: 0, exercisesCompleted: 0, minutes: 0 };
    rows.push(row);
  }
  row.lessonsCompleted += patch.lessonsCompleted ?? 0;
  row.xpEarned += patch.xpEarned ?? 0;
  row.exercisesCompleted += patch.exercisesCompleted ?? 0;
  row.minutes += patch.minutes ?? 0;
  rows.sort((a, b) => a.date.localeCompare(b.date));
  store.activity.set(userId, rows.slice(-MAX_ROWS));
  return row;
}

export type StreakResult = { current: number; best: number; freezeSpent: number };

/**
 * Streaks from activity days. A single missed day is bridged by spending a
 * freeze token when `learning.streak.allowFreeze` is on — the same rule the
 * dashboard copy promises.
 */
export function computeStreaks(
  days: string[],
  today: string,
  freezeTokens: number,
): StreakResult {
  const set = new Set(days);
  const bridge = learning.streak.allowFreeze ? 1 : 0;

  let current = 0;
  let cursor = today;
  let tokens = clamp(freezeTokens, 0, 99);
  if (!set.has(today)) {
    // A streak survives until the end of the day after the last activity.
    cursor = addDays(today, -1);
  }
  while (true) {
    if (set.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (tokens > 0 && bridge === 1 && set.has(addDays(cursor, -1))) {
      tokens -= 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }
  const freezeSpent = clamp(freezeTokens, 0, 99) - tokens;

  const ascending = [...set].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  let bestTokens = clamp(freezeTokens, 0, 99);
  for (const day of ascending) {
    if (previous === null) {
      run = 1;
    } else {
      const gap = Math.round(
        (new Date(`${day}T00:00:00`).getTime() - new Date(`${previous}T00:00:00`).getTime()) /
          86_400_000,
      );
      if (gap === 1) run += 1;
      else if (gap === 2 && bridge === 1 && bestTokens > 0) {
        bestTokens -= 1;
        run += 1;
      } else run = 1;
    }
    best = Math.max(best, run);
    previous = day;
  }

  return { current, best, freezeSpent };
}

export function toSummary(attempt: AttemptResult): AttemptSummary {
  const { answers, ...rest } = attempt;
  return { ...rest, answerCount: answers.length };
}

export function heatmapFor(rows: DailyActivity[], days: number, today: string): DailyActivity[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const out: DailyActivity[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    out.push(
      byDate.get(date) ?? {
        date,
        lessonsCompleted: 0,
        xpEarned: 0,
        exercisesCompleted: 0,
        minutes: 0,
      },
    );
  }
  return out;
}

export function accuracyOf(correct: number, answered: number): number | null {
  return answered > 0 ? percent(correct, answered) : null;
}
