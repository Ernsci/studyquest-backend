import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../http/errors";
import { describeError, logError } from "../logger";
import type {
  AttemptResult,
  AttemptSummary,
  AuditEntry,
  Bookmark,
  ContentReport,
  FeedbackEntry,
  GradedAnswer,
  Lesson,
  Profile,
  QuestionKind,
  QuestionSolution,
  Role,
  SavedQuestion,
  StudentAnswer,
  SubjectSummary,
} from "../types";
import type { LessonProgressRow } from "./types";

/**
 * Row shapes and mappers for the Postgres schema in `supabase/schema.sql`.
 *
 * Supabase returns `snake_case`; every row crosses into the app through one of
 * the mappers here as the camelCase type in `lib/types.ts`, so routes and UI
 * never see a database column name.
 */

export type Client = SupabaseClient;

/** Postgres/RLS problems are an upstream fault, never a client error. */
export function fail(scope: string, operation: string, cause: unknown): never {
  logError(scope, `${operation} failed — ${describeError(cause)}`);
  throw new ApiError("upstream_error", `${operation} failed. Check the Supabase schema.`, { cause });
}

/** Awaiting the builder gives `{ data, error }`; this unwraps or throws. */
export function unwrap<T>(scope: string, operation: string, result: { data: T | null; error: unknown }): T {
  if (result.error) fail(scope, operation, result.error);
  return result.data as T;
}

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  weekly_goal_lessons: number;
  reminder_time: string | null;
  reminder_enabled: boolean;
  theme_mode: Profile["themeMode"];
  xp: number;
  freeze_tokens: number;
  email_verified_at: string | null;
  created_at: string;
};

const PROFILE_SELECT =
  "id, email, display_name, username, avatar_url, bio, role, weekly_goal_lessons, reminder_time, " +
  "reminder_enabled, theme_mode, xp, freeze_tokens, email_verified_at, created_at";

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.role,
    weeklyGoalLessons: row.weekly_goal_lessons,
    reminderTime: row.reminder_time,
    reminderEnabled: row.reminder_enabled,
    themeMode: row.theme_mode,
    xp: row.xp,
    freezeTokens: row.freeze_tokens,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
  };
}

export type SubjectRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color_hex: string;
  level: SubjectSummary["level"];
  sort_order: number;
  published: boolean;
};

export const SUBJECT_SELECT =
  "id, slug, title, description, icon, color_hex, level, sort_order, published";

export function mapSubject(row: SubjectRow, lessonCount = 0, questionCount = 0): SubjectSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: row.icon,
    colorHex: row.color_hex,
    level: row.level,
    sortOrder: row.sort_order,
    published: row.published,
    lessonCount,
    questionCount,
  };
}

type EmbeddedSubject = { slug: string; title: string; color_hex?: string } | null;
type EmbeddedModule = { title: string } | null;
type EmbeddedLesson = { slug: string } | null;

export const LESSON_SELECT =
  "id, module_id, slug, title, description, body, objectives, code_examples, diagram, related, " +
  "estimated_minutes, difficulty, sort_order, published, " +
  "subject:subjects!inner(slug, title, color_hex), " +
  "module:modules(title)";

export function mapLesson(row: Record<string, unknown>): Lesson {
  const subject = (row.subject ?? null) as EmbeddedSubject;
  const module = (row.module ?? null) as EmbeddedModule;
  return {
    id: String(row.id),
    subjectSlug: subject?.slug ?? "",
    subjectTitle: subject?.title ?? "",
    subjectColor: subject?.color_hex ?? "#6366f1",
    moduleId: String(row.module_id ?? ""),
    moduleTitle: module?.title ?? "Lessons",
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ""),
    body: String(row.body ?? ""),
    objectives: (row.objectives as string[]) ?? [],
    codeExamples: (row.code_examples as Lesson["codeExamples"]) ?? [],
    diagram: (row.diagram as Lesson["diagram"]) ?? null,
    related: (row.related as Lesson["related"]) ?? [],
    estimatedMinutes: Number(row.estimated_minutes ?? 0),
    difficulty: (row.difficulty as Lesson["difficulty"]) ?? "beginner",
    sortOrder: Number(row.sort_order ?? 0),
    published: Boolean(row.published),
  };
}

export const QUESTION_SELECT =
  "id, kind, prompt, hint, options, points, difficulty, sort_order, published, " +
  "subject:subjects!inner(slug, title), " +
  "lesson:lessons(slug), " +
  "solution:question_solutions(answer, explanation, starter_code, expected_output)";

type EmbeddedSolution = {
  answer: StudentAnswer;
  explanation: string | null;
  starter_code: string | null;
  expected_output: string | null;
} | null;

export function mapQuestion(row: Record<string, unknown>): QuestionSolution {
  const subject = (row.subject ?? null) as EmbeddedSubject;
  const lesson = (row.lesson ?? null) as EmbeddedLesson;
  const solution = (row.solution ?? null) as EmbeddedSolution;
  return {
    id: String(row.id),
    subjectSlug: subject?.slug ?? "",
    subjectTitle: subject?.title ?? "",
    lessonSlug: lesson?.slug ?? null,
    kind: (row.kind as QuestionKind) ?? "single",
    prompt: String(row.prompt ?? ""),
    hint: (row.hint as string | null) ?? null,
    options: (row.options as string[]) ?? [],
    points: Number(row.points ?? 1),
    difficulty: (row.difficulty as QuestionSolution["difficulty"]) ?? "beginner",
    answer: solution?.answer ?? null,
    explanation: solution?.explanation ?? "",
    starterCode: solution?.starter_code ?? null,
    expectedOutput: solution?.expected_output ?? null,
  };
}

export const ATTEMPT_SELECT =
  "id, mode, subject_slug, lesson_slug, score, total, percent, passed, xp_awarded, " +
  "duration_seconds, answered, correct, created_at";

export const ANSWER_SELECT =
  "question_id, kind, prompt, given, correct, points_awarded, points_possible, expected, explanation";

type AnswerRow = {
  question_id: string | null;
  kind: QuestionKind;
  prompt: string;
  given: StudentAnswer;
  correct: boolean;
  points_awarded: number;
  points_possible: number;
  expected: StudentAnswer;
  explanation: string | null;
};

export function mapAnswer(row: AnswerRow, index: number): GradedAnswer {
  return {
    questionId: row.question_id ?? `removed_${index}`,
    given: row.given ?? null,
    correct: row.correct,
    pointsAwarded: row.points_awarded,
    pointsPossible: row.points_possible,
    expected: row.expected ?? null,
    explanation: row.explanation ?? "",
    prompt: row.prompt,
    kind: row.kind,
  };
}

type AttemptRow = {
  id: string;
  mode: AttemptResult["mode"];
  subject_slug: string | null;
  lesson_slug: string | null;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  xp_awarded: number;
  duration_seconds: number | null;
  answered: number;
  correct: number;
  created_at: string;
};

export function mapAttemptSummary(row: AttemptRow): AttemptSummary {
  return {
    id: row.id,
    mode: row.mode,
    subjectSlug: row.subject_slug,
    lessonSlug: row.lesson_slug,
    score: row.score,
    total: row.total,
    percent: row.percent,
    passed: row.passed,
    xpAwarded: row.xp_awarded,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    answerCount: row.answered,
  };
}

export function mapAttempt(row: AttemptRow, answers: GradedAnswer[]): AttemptResult {
  const summary = mapAttemptSummary(row);
  return {
    id: summary.id,
    mode: summary.mode,
    subjectSlug: summary.subjectSlug,
    lessonSlug: summary.lessonSlug,
    score: summary.score,
    total: summary.total,
    percent: summary.percent,
    passed: summary.passed,
    xpAwarded: summary.xpAwarded,
    durationSeconds: summary.durationSeconds,
    createdAt: summary.createdAt,
    answers,
  };
}

type ProgressRow = {
  subject_slug: string;
  lesson_slug: string;
  attempts: number;
  best_percent: number | null;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

export const PROGRESS_SELECT =
  "subject_slug, lesson_slug, attempts, best_percent, completed, completed_at, updated_at";

export function mapProgress(row: ProgressRow): LessonProgressRow {
  return {
    subjectSlug: row.subject_slug,
    lessonSlug: row.lesson_slug,
    attempts: row.attempts,
    bestPercent: row.best_percent,
    completed: row.completed,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

type BookmarkRow = {
  subject_slug: string;
  lesson_slug: string;
  lesson_title: string;
  subject_title: string;
  created_at: string;
};

export const BOOKMARK_SELECT =
  "subject_slug, lesson_slug, lesson_title, subject_title, created_at";

export function mapBookmark(row: BookmarkRow): Bookmark {
  return {
    lessonSlug: row.lesson_slug,
    lessonTitle: row.lesson_title,
    subjectSlug: row.subject_slug,
    subjectTitle: row.subject_title,
    createdAt: row.created_at,
  };
}

type ReviewRow = {
  question_id: string;
  subject_slug: string;
  review_box: number;
  due_on: string;
  last_correct: boolean | null;
  times_seen: number;
  mastered: boolean;
  prompt: string;
  kind: QuestionKind;
};

export const REVIEW_SELECT =
  "question_id, subject_slug, review_box, due_on, last_correct, times_seen, mastered, prompt, kind";

export function mapReview(row: ReviewRow): SavedQuestion {
  return {
    questionId: row.question_id,
    subjectSlug: row.subject_slug,
    reviewBox: row.review_box,
    dueOn: row.due_on,
    lastCorrect: row.last_correct,
    timesSeen: row.times_seen,
    mastered: row.mastered,
    prompt: row.prompt,
    kind: row.kind,
  };
}

type ReportRow = {
  id: string;
  created_at: string;
  status: string;
  reason: string;
  details: string;
  target: string;
  target_href: string | null;
  reporter_email: string | null;
  resolved_at: string | null;
  admin_note: string | null;
};

export const REPORT_SELECT =
  "id, created_at, status, reason, details, target, target_href, reporter_email, resolved_at, admin_note";

export function mapReport(row: ReportRow): ContentReport {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status as ContentReport["status"],
    reason: row.reason,
    details: row.details,
    target: row.target,
    targetHref: row.target_href,
    reporterEmail: row.reporter_email,
    resolvedAt: row.resolved_at,
    adminNote: row.admin_note,
  };
}

type FeedbackRow = {
  id: string;
  created_at: string;
  rating: number;
  message: string;
  author_email: string | null;
};

export const FEEDBACK_SELECT = "id, created_at, rating, message, author_email";

export function mapFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    rating: row.rating,
    message: row.message,
    authorEmail: row.author_email,
  };
}

type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  target_type: string;
  target_id: string;
  actor_email: string | null;
  summary: string;
  ip: string | null;
};

export const AUDIT_SELECT =
  "id, created_at, action, target_type, target_id, actor_email, summary, ip";

export function mapAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    actorEmail: row.actor_email,
    summary: row.summary,
    ip: row.ip,
  };
}



