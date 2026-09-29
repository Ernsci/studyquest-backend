

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

  xpPerLesson: 20,

  xpPerCorrectAnswer: 5,

  quizPassBonus: 25,

  passMark: 0.7,

  dailyGoalMinutes: 20,

  heatmapDays: 91,
  streak: {
    enabled: true,

    allowFreeze: true,

    freezeXpCost: 150,

    onFireAt: 7,
  },
  spacedReview: {

    intervalsDays: [0, 1, 3, 7, 21],

    autoAddMissed: true,

    sessionSize: 12,
  },
  plan: {
    horizonDays: 14,
    defaultLessonsPerWeek: 3,
  },
} as const;

export const practice = {

  sessionSizes: {
    quiz: 8,
    practice: 6,
    review: 12,
    lesson: 5,
  },

  maxQuestions: 25,
  explainAfterEachAnswer: true,
  shuffleOptions: true,

  masteryScore: 0.85,
} as const;

export const limits = {
  pageSize: 20,
  adminPageSize: 25,

  rateLimits: {
    "practice.submit": { max: 30, windowMs: 10 * 60 * 1000 },
    "profile.update": { max: 20, windowMs: 10 * 60 * 1000 },
    "reports.create": { max: 10, windowMs: 10 * 60 * 1000 },
    "feedback.create": { max: 5, windowMs: 10 * 60 * 1000 },
    "account.delete": { max: 3, windowMs: 60 * 60 * 1000 },
    "admin.mutation": { max: 120, windowMs: 5 * 60 * 1000 },
    "auth.demoSession": { max: 20, windowMs: 10 * 60 * 1000 },
  } satisfies Record<string, { max: number; windowMs: number }>,

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
