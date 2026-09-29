/**
 * Backend configuration — identity, feature flags, learning rules and limits.
 *
 * This file is the API's source of truth for anything that affects scoring or
 * progress. The frontend keeps its own copy for display (theme, navigation,
 * copy), but grading and XP always come from here. Secrets never live here:
 * they are read in `src/config/env.ts` only.
 */

export type ThemeMode = "light" | "dark" | "system";

export const site = {
  name: "StudyQuest",
  shortName: "SQ",
  tagline: "Learn by doing, one quest at a time.",
  url: "http://localhost:3000",
  locale: "en",
} as const;

export const features = {
  playground: true,
  quizzes: true,
  spacedReview: true,
  bookmarks: true,
  savedQuestions: true,
  feedback: true,
  reports: true,
  recommendations: true,
  adminPanel: true,
  demoMode: true,
} as const;

export type FeatureFlag = keyof typeof features;

export const subjects = {
  enabled: ["javascript", "html-css", "python", "sql", "web-security", "java"],
  pageSize: 12,
} as const;

export const learning = {
  /** XP awarded for finishing a lesson. */
  xpPerLesson: 20,
  /** XP awarded per correct practice answer. */
  xpPerCorrectAnswer: 5,
  /** Bonus XP for passing a quiz. */
  quizPassBonus: 25,
  /** Fraction of points needed to pass a quiz (0.7 = 70%). */
  passMark: 0.7,
  /** Default daily target shown on the dashboard. */
  dailyGoalMinutes: 20,
  /** Days rendered in the activity heatmap. */
  heatmapDays: 91,
  streak: {
    enabled: true,
    /** Freeze tokens let a learner miss one day without losing the streak. */
    allowFreeze: true,
    /** XP cost of one freeze token. */
    freezeXpCost: 150,
    /** A streak of this length is described as "on fire". */
    onFireAt: 7,
  },
  spacedReview: {
    /** Leitner intervals in days, indexed by review box (box 0 = review now). */
    intervalsDays: [0, 1, 3, 7, 21],
    /** Automatically queue a missed practice question for review. */
    autoAddMissed: true,
    /** Maximum items surfaced per review session. */
    sessionSize: 12,
  },
  plan: {
    horizonDays: 14,
    defaultLessonsPerWeek: 3,
  },
} as const;

export const practice = {
  /** Questions per session, by mode. */
  sessionSizes: {
    quiz: 8,
    practice: 6,
    review: 12,
    lesson: 5,
  },
  /** Hard cap on questions assembled for one attempt. */
  maxQuestions: 25,
  explainAfterEachAnswer: true,
  shuffleOptions: true,
  /** Score (0-1) at which a saved question counts as "mastered". */
  masteryScore: 0.85,
} as const;

export const limits = {
  pageSize: 20,
  adminPageSize: 25,
  /** Per-user (or per-IP) request limits enforced by src/lib/rate-limit.ts. */
  rateLimits: {
    "practice.submit": { max: 30, windowMs: 10 * 60 * 1000 },
    "profile.update": { max: 20, windowMs: 10 * 60 * 1000 },
    "reports.create": { max: 10, windowMs: 10 * 60 * 1000 },
    "feedback.create": { max: 5, windowMs: 10 * 60 * 1000 },
    "account.delete": { max: 3, windowMs: 60 * 60 * 1000 },
    "admin.mutation": { max: 120, windowMs: 5 * 60 * 1000 },
    "auth.demoSession": { max: 20, windowMs: 10 * 60 * 1000 },
  } satisfies Record<string, { max: number; windowMs: number }>,
  /** Input lengths; mirrored by the zod schemas in src/lib/validation.ts. */
  input: {
    displayNameMin: 2,
    displayNameMax: 60,
    bioMax: 400,
    slugMin: 2,
    slugMax: 60,
    titleMax: 140,
    descriptionMax: 500,
    bodyMax: 40000,
    objectiveMax: 240,
    optionsMin: 2,
    optionsMax: 8,
    messageMax: 2000,
    codeMax: 20000,
  },
} as const;

export const appConfig = { site, features, subjects, learning, practice, limits } as const;

export default appConfig;
