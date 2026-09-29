import { randomUUID } from "node:crypto";

import { learning, limits } from "../../config/app-config";
import { ApiError } from "../../http/errors";
import { supabaseAdmin } from "../supabase/admin";
import type {
  AdminLessonRow,
  AdminQuestionRow,
  AdminSubjectRow,
  AdminUserRow,
  AttemptResult,
  AttemptSummary,
  AuditEntry,
  Bookmark,
  ContentReport,
  DailyActivity,
  FeedbackEntry,
  LearnerStats,
  Lesson,
  Profile,
  SavedQuestion,
  StudyPlan,
  SubjectDetail,
  SubjectProgress,
} from "../types";
import { addDays, clamp, percent, todayISO } from "../utils";
import { accuracyOf, computeStreaks, toSummary, heatmapFor } from "./internal";
import type {
  EnsureProfileInput,
  LessonProgressRow,
  ProfilePatch,
  RecordAttemptInput,
  RecordAttemptOutcome,
  StudyQuestStore,
} from "./types";
import {
  ANSWER_SELECT,
  ATTEMPT_SELECT,
  AUDIT_SELECT,
  BOOKMARK_SELECT,
  FEEDBACK_SELECT,
  LESSON_SELECT,
  PROFILE_SELECT,
  PROGRESS_SELECT,
  QUESTION_SELECT,
  REPORT_SELECT,
  REVIEW_SELECT,
  SUBJECT_SELECT,
  fail,
  mapAnswer,
  mapAttempt,
  mapAttemptSummary,
  mapAudit,
  mapBookmark,
  mapFeedback,
  mapLesson,
  mapProfile,
  mapProgress,
  mapQuestion,
  mapReport,
  mapReview,
  mapSubject,
  unwrap,
} from "./supabase-rows";

const DAY_MS = 86_400_000;
const MAX_ATTEMPTS = 500;

function client() {
  const db = supabaseAdmin();
  if (!db) throw new ApiError("upstream_error", "Supabase admin credentials are not configured.");
  return db;
}

function dbError(operation: string, error: unknown): never {
  fail("supabase", operation, error);
}

function rows(operation: string, result: { data: unknown; error: unknown }): Array<Record<string, any>> {
  return (unwrap("supabase", operation, result) as Array<Record<string, any>> | null) ?? [];
}

function one<T>(operation: string, result: { data: unknown; error: unknown }): T {
  const value = unwrap("supabase", operation, result) as T | null;
  if (value === null) throw new ApiError("upstream_error", `${operation} returned no row.`);
  return value;
}

function answerRows(answers: AttemptResult["answers"]) {
  return answers.map((answer, position) => ({
    position,
    question_id: answer.questionId,
    kind: answer.kind,
    prompt: answer.prompt,
    given: answer.given,
    correct: answer.correct,
    points_awarded: answer.pointsAwarded,
    points_possible: answer.pointsPossible,
    expected: answer.expected,
    explanation: answer.explanation,
  }));
}

export function createSupabaseStore(): StudyQuestStore {
  const db = client();

  async function profile(userId: string): Promise<Profile> {
    const row = one("Read profile", await db.from("profiles").select(PROFILE_SELECT).eq("id", userId).maybeSingle());
    return mapProfile(row as never);
  }

  async function subjects(includeUnpublished = false) {
    let query = db.from("subjects").select(SUBJECT_SELECT).order("sort_order");
    if (!includeUnpublished) query = query.eq("published", true);
    const data = rows("List subjects", await query);
    const [lessonRows, questionRows] = await Promise.all([
      db.from("lessons").select("subject_id").eq("published", true),
      db.from("questions").select("subject_id").eq("published", true),
    ]);
    const lessons = rows("Count lessons by subject", lessonRows);
    const questions = rows("Count questions by subject", questionRows);
    return data.map((row) => mapSubject(
      row as never,
      lessons.filter((item) => item.subject_id === row.id).length,
      questions.filter((item) => item.subject_id === row.id).length,
    ));
  }

  async function lessons(includeUnpublished = false): Promise<Lesson[]> {
    let query = db.from("lessons").select(LESSON_SELECT)
      .order("sort_order").order("slug", { ascending: true });
    if (!includeUnpublished) query = query.eq("published", true);
    const data = rows("List lessons", await query);
    return data.map((row) => mapLesson(row as Record<string, unknown>));
  }

  async function questions(subjectSlug?: string, includeUnpublished = false) {
    let query = db.from("questions").select(QUESTION_SELECT).order("sort_order");
    if (!includeUnpublished) query = query.eq("published", true);
    if (subjectSlug) query = query.eq("subject.slug", subjectSlug);
    const data = rows("List questions", await query);
    return data.map((row) => mapQuestion(row as Record<string, unknown>));
  }

  async function listProgress(userId: string, subjectSlug?: string): Promise<LessonProgressRow[]> {
    let query = db.from("lesson_progress").select(PROGRESS_SELECT).eq("user_id", userId);
    if (subjectSlug) query = query.eq("subject_slug", subjectSlug);
    const data = rows("List lesson progress", await query);
    return data.map((row) => mapProgress(row as never));
  }

  async function activities(userId: string, since?: string): Promise<DailyActivity[]> {
    let query = db.from("daily_activity").select("day, lessons_completed, xp_earned, exercises_completed, minutes")
      .eq("user_id", userId).order("day", { ascending: true });
    if (since) query = query.gte("day", since);
    return rows("List daily activity", await query).map((row) => ({
      date: String(row.day),
      lessonsCompleted: Number(row.lessons_completed),
      xpEarned: Number(row.xp_earned),
      exercisesCompleted: Number(row.exercises_completed),
      minutes: Number(row.minutes),
    }));
  }

  async function attemptRows(userId: string, limit = MAX_ATTEMPTS) {
    return rows("List attempts", await db.from("attempts").select(ATTEMPT_SELECT)
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit));
  }

  async function stats(userId: string): Promise<LearnerStats> {
    const [currentProfile, progress, attemptList, activity, lessonList] = await Promise.all([
      profile(userId),
      listProgress(userId),
      attemptRows(userId),
      activities(userId),
      lessons(),
    ]);
    const attemptIds = attemptList.map((attempt) => String(attempt.id));
    const answerResult = attemptIds.length
      ? await db.from("attempt_answers").select("correct").in("attempt_id", attemptIds)
      : { data: [], error: null };
    const answers = rows("Read attempt answers for stats", answerResult);
    const today = todayISO();
    const active = activity.filter((item) => item.minutes > 0 || item.xpEarned > 0);
    const streak = computeStreaks(active.map((item) => item.date), today, currentProfile.freezeTokens);
    const answered = answers.length;
    const correct = answers.filter((item) => item.correct).length;
    return {
      xp: currentProfile.xp,
      level: 1 + Math.floor(currentProfile.xp / 250),
      levelProgress: percent(currentProfile.xp % 250, 250),
      lessonsCompleted: progress.filter((item) => item.completed).length,
      lessonsTotal: lessonList.length,
      attempts: attemptList.length,
      correctAnswers: correct,
      answeredQuestions: answered,
      accuracy: accuracyOf(correct, answered),
      streakCurrent: streak.current,
      streakBest: streak.best,
      activeDays: active.length,
      minutesActive: activity.reduce((sum, item) => sum + item.minutes, 0),
      heatmap: heatmapFor(activity, learning.heatmapDays, today),
      last7Days: heatmapFor(activity, 7, today),
      dailyGoalMinutes: learning.dailyGoalMinutes,
    };
  }

  return {
    async listSubjects() { return subjects(); },

    async getSubject(subjectSlug) {
      const row = await db.from("subjects").select(SUBJECT_SELECT).eq("slug", subjectSlug)
        .eq("published", true).maybeSingle();
      if (row.error) dbError("Read subject", row.error);
      if (!row.data) return null;
      const detail = mapSubject(row.data as never);
      const [moduleRows, lessonList] = await Promise.all([
        db.from("modules").select("id, title, description, sort_order, lessons(id, slug, title, description, sort_order, estimated_minutes, difficulty, published)")
          .eq("subject_id", (row.data as unknown as { id: string }).id).order("sort_order"),
        lessons(),
      ]);
      const mappedModules = rows("Read subject modules", moduleRows)
        .map((module) => ({
          id: String(module.id), title: String(module.title), description: String(module.description ?? ""),
          sortOrder: Number(module.sort_order),
          lessons: ((module.lessons ?? []) as Array<Record<string, unknown>>)
            .filter((lesson) => lesson.published)
            .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
            .map((lesson) => ({
              id: String(lesson.id), slug: String(lesson.slug), title: String(lesson.title),
              description: String(lesson.description ?? ""), sortOrder: Number(lesson.sort_order),
              estimatedMinutes: Number(lesson.estimated_minutes), difficulty: lesson.difficulty as Lesson["difficulty"],
            })),
        }));
      const subjectLessons = lessonList.filter((lesson) => lesson.subjectSlug === subjectSlug);
      const questionList = await questions(subjectSlug);
      return {
        ...detail,
        lessonCount: subjectLessons.length,
        questionCount: questionList.length,
        modules: mappedModules,
        lessonIndex: subjectLessons.map((lesson) => ({ slug: lesson.slug, title: lesson.title, moduleTitle: lesson.moduleTitle })),
      } satisfies SubjectDetail;
    },

    async getLesson(subjectSlug, lessonSlug) {
      const result = await db.from("lessons").select(LESSON_SELECT)
        .eq("slug", lessonSlug).eq("published", true).eq("subject.slug", subjectSlug).maybeSingle();
      if (result.error) dbError("Read lesson", result.error);
      return result.data ? mapLesson(result.data as unknown as Record<string, unknown>) : null;
    },

    async listLessons() { return lessons(); },
    async listQuestions(subjectSlug) { return questions(subjectSlug); },

    async getQuestion(id) {
      const result = await db.from("questions").select(QUESTION_SELECT).eq("id", id).maybeSingle();
      if (result.error) dbError("Read question", result.error);
      return result.data ? mapQuestion(result.data as unknown as Record<string, unknown>) : null;
    },

    async adjacentLesson(subjectSlug, lessonSlug) {
      const subject = await this.getSubject(subjectSlug);
      if (!subject) return { prev: null, next: null };
      const index = subject.lessonIndex.findIndex((item) => item.slug === lessonSlug);
      const prev = subject.lessonIndex[index - 1];
      const next = subject.lessonIndex[index + 1];
      return {
        prev: prev ? { slug: prev.slug, title: prev.title } : null,
        next: next ? { slug: next.slug, title: next.title } : null,
      };
    },

    async getProfile(userId) {
      const result = await db.from("profiles").select(PROFILE_SELECT).eq("id", userId).maybeSingle();
      if (result.error) dbError("Read profile", result.error);
      return result.data ? mapProfile(result.data as never) : null;
    },

    async ensureProfile(input: EnsureProfileInput) {
      const existing = await this.getProfile(input.id);
      if (existing) return existing;


      const email = input.email ?? "";
      const displayName = input.displayName?.trim() || email.split("@")[0] || "Learner";
      const inserted = await db.from("profiles").upsert(
        { id: input.id, email, display_name: displayName },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (inserted.error) dbError("Create profile", inserted.error);
      const created = await this.getProfile(input.id);
      if (!created) throw new ApiError("upstream_error", "Profile row was not created by the auth trigger.");
      return created;
    },

    async updateProfile(userId: string, patch: ProfilePatch) {
      const values: Record<string, unknown> = {};
      if (patch.displayName !== undefined) values.display_name = patch.displayName;
      if (patch.username !== undefined) values.username = patch.username;
      if (patch.bio !== undefined) values.bio = patch.bio;
      if (patch.weeklyGoalLessons !== undefined) values.weekly_goal_lessons = patch.weeklyGoalLessons;
      if (patch.reminderTime !== undefined) values.reminder_time = patch.reminderTime;
      if (patch.reminderEnabled !== undefined) values.reminder_enabled = patch.reminderEnabled;
      if (patch.themeMode !== undefined) values.theme_mode = patch.themeMode;
      const row = one("Update profile", await db.from("profiles").update(values).eq("id", userId)
        .select(PROFILE_SELECT).single());
      return mapProfile(row as never);
    },

    async purgeLearner(userId) {
      const result = await db.auth.admin.deleteUser(userId);
      if (result.error) dbError("Delete auth user", result.error);
    },

    async recordAttempt(input: RecordAttemptInput): Promise<RecordAttemptOutcome> {
      const [currentProfile, activityRows] = await Promise.all([
        profile(input.userId),
        activities(input.userId, addDays(todayISO(), -365)),
      ]);
      const now = new Date().toISOString();
      const today = todayISO();
      const completionEligible = Boolean(
        input.subjectSlug && input.lessonSlug && input.graded.passed &&
        (input.mode === "quiz" || input.mode === "lesson"),
      );
      const attempt: AttemptResult = {
        id: randomUUID(), mode: input.mode, subjectSlug: input.subjectSlug,
        lessonSlug: input.lessonSlug, score: input.graded.score, total: input.graded.total,
        percent: input.graded.percent, passed: input.graded.passed,
        xpAwarded: input.graded.xpAwarded, durationSeconds: input.durationSeconds,
        createdAt: now, answers: input.graded.answers,
      };
      const progress = input.subjectSlug && input.lessonSlug ? {
        user_id: input.userId,
        subject_slug: input.subjectSlug,
        lesson_slug: input.lessonSlug,
        best_percent: attempt.percent,
      } : null;

      const reviewQueued = attempt.answers.filter((answer) => !answer.correct).length;
      const minutes = input.durationSeconds && input.durationSeconds > 0
        ? Math.max(1, Math.round(input.durationSeconds / 60))
        : Math.max(1, Math.round(attempt.answers.length / 2));
      const streak = computeStreaks(
        [...activityRows.filter((item) => item.minutes > 0 || item.xpEarned > 0).map((item) => item.date), today],
        today,
        currentProfile.freezeTokens,
      );
      const rpc = await db.rpc("record_attempt_bundle", {
        p_attempt: {
          id: attempt.id, user_id: input.userId, mode: attempt.mode,
          subject_slug: attempt.subjectSlug, lesson_slug: attempt.lessonSlug,
          score: attempt.score, total: attempt.total, percent: attempt.percent,
          passed: attempt.passed, xp_awarded: attempt.xpAwarded,
          duration_seconds: attempt.durationSeconds, answered: attempt.answers.length,
          correct: attempt.answers.filter((answer) => answer.correct).length,
        },
        p_answers: answerRows(attempt.answers),
        p_progress: progress,
        p_day: today,
        p_lesson_eligible: completionEligible,
        p_lesson_bonus: learning.xpPerLesson,
        p_xp: attempt.xpAwarded,
        p_exercises: attempt.answers.length,
        p_minutes: minutes,
        p_freeze_spent: streak.freezeSpent,
        p_review_intervals: learning.spacedReview.intervalsDays,
      });
      if (rpc.error) dbError("Record attempt transaction", rpc.error);
      const lessonCompleted = Boolean(rpc.data);
      attempt.xpAwarded += lessonCompleted ? learning.xpPerLesson : 0;
      const [updatedProfile, updatedStats] = await Promise.all([profile(input.userId), stats(input.userId)]);
      return { attempt, profile: updatedProfile, stats: updatedStats, lessonCompleted, reviewQueued };
    },

    async listAttempts(userId, limit = limits.pageSize) {
      return (await attemptRows(userId, limit)).map((row) => mapAttemptSummary(row as never));
    },

    async getAttempt(userId, attemptId) {
      const result = await db.from("attempts").select(ATTEMPT_SELECT)
        .eq("id", attemptId).eq("user_id", userId).maybeSingle();
      if (result.error) dbError("Read attempt", result.error);
      if (!result.data) return null;
      const answers = rows("Read attempt answers", await db.from("attempt_answers").select(ANSWER_SELECT)
        .eq("attempt_id", attemptId).order("position"));
      return mapAttempt(result.data as never, answers.map((row, index) => mapAnswer(row as never, index)));
    },

    stats,

    async lessonProgress(userId, subjectSlug) { return listProgress(userId, subjectSlug); },

    async subjectProgress(userId): Promise<SubjectProgress[]> {
      const [subjectRows, progressRows, attemptsList] = await Promise.all([
        subjects(), listProgress(userId), attemptRows(userId),
      ]);
      return Promise.all(subjectRows.map(async (subject) => {
        const completed = progressRows.filter((row) => row.subjectSlug === subject.slug && row.completed);
        const subjectAttempts = attemptsList.filter((row) => row.subject_slug === subject.slug);
        const scores = subjectAttempts.map((row) => Number(row.percent));
        const detail = await this.getSubject(subject.slug);
        const next = detail?.lessonIndex.find((lesson) => !completed.some((row) => row.lessonSlug === lesson.slug));
        return {
          subjectSlug: subject.slug, title: subject.title, colorHex: subject.colorHex, icon: subject.icon,
          lessonsCompleted: completed.length, lessonsTotal: subject.lessonCount,
          percentComplete: percent(completed.length, subject.lessonCount), attempts: subjectAttempts.length,
          bestPercent: scores.length ? Math.max(...scores) : null,
          averagePercent: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          nextLesson: next ? { slug: next.slug, title: next.title } : null,
        };
      }));
    },

    async studyPlan(userId): Promise<StudyPlan> {
      const [currentProfile, completedRows, lessonList] = await Promise.all([
        profile(userId), listProgress(userId), lessons(),
      ]);
      const completed = new Set(completedRows.filter((row) => row.completed).map((row) => `${row.subjectSlug}/${row.lessonSlug}`));
      const pending = lessonList.filter((lesson) => !completed.has(`${lesson.subjectSlug}/${lesson.slug}`));
      const weeklyGoal = currentProfile.weeklyGoalLessons || learning.plan.defaultLessonsPerWeek;
      const perDay = Math.max(1, Math.round(weeklyGoal / 7));
      const today = todayISO();
      const items = pending.slice(0, learning.plan.horizonDays * perDay).map((lesson, index) => ({
        id: `plan_${lesson.subjectSlug}_${lesson.slug}`, lessonSlug: lesson.slug,
        lessonTitle: lesson.title, subjectSlug: lesson.subjectSlug,
        dueOn: addDays(today, Math.floor(index / perDay)), completedAt: null,
        reason: index < perDay ? "Start here today" : "Keeps your weekly goal on track",
      }));
      return { subjectSlug: pending[0]?.subjectSlug ?? "", weeklyGoal, items, remainingToday: items.filter((item) => item.dueOn === today).length };
    },

    async toggleBookmark(userId, subjectSlug, lessonSlug) {
      const existing = await db.from("bookmarks").select("user_id").eq("user_id", userId)
        .eq("subject_slug", subjectSlug).eq("lesson_slug", lessonSlug).maybeSingle();
      if (existing.error) dbError("Find bookmark", existing.error);
      if (existing.data) {
        const deleted = await db.from("bookmarks").delete().eq("user_id", userId)
          .eq("subject_slug", subjectSlug).eq("lesson_slug", lessonSlug);
        if (deleted.error) dbError("Delete bookmark", deleted.error);
        return false;
      }
      const lesson = await this.getLesson(subjectSlug, lessonSlug);
      const result = await db.from("bookmarks").insert({
        user_id: userId, subject_slug: subjectSlug, lesson_slug: lessonSlug,
        lesson_title: lesson?.title ?? lessonSlug, subject_title: lesson?.subjectTitle ?? subjectSlug,
      });
      if (result.error) dbError("Create bookmark", result.error);
      return true;
    },

    async listBookmarks(userId) {
      return rows("List bookmarks", await db.from("bookmarks").select(BOOKMARK_SELECT)
        .eq("user_id", userId).order("created_at", { ascending: false })).map((row) => mapBookmark(row as never));
    },

    async listReview(userId, includeMastered = false) {
      let query = db.from("review_items").select(REVIEW_SELECT).eq("user_id", userId).order("due_on");
      if (!includeMastered) query = query.eq("mastered", false).lte("due_on", todayISO());
      return rows("List review queue", await query).map((row) => mapReview(row as never));
    },

    async recordReview(userId, questionId, correct) {
      const result = await db.from("review_items").select(REVIEW_SELECT)
        .eq("user_id", userId).eq("question_id", questionId).maybeSingle();
      if (result.error) dbError("Read review item", result.error);
      if (!result.data) return null;
      const item = mapReview(result.data as never);
      const nextBox = correct ? clamp(item.reviewBox + 1, 0, learning.spacedReview.intervalsDays.length - 1) : 0;
      const timesSeen = item.timesSeen + 1;
      const values = {
        review_box: nextBox, last_correct: correct, times_seen: timesSeen,
        mastered: nextBox >= learning.spacedReview.intervalsDays.length - 1 && timesSeen >= 2,
        due_on: addDays(todayISO(), learning.spacedReview.intervalsDays[nextBox] ?? 0),
      };
      const updated = one("Update review item", await db.from("review_items").update(values)
        .eq("user_id", userId).eq("question_id", questionId).select(REVIEW_SELECT).single());
      return mapReview(updated as never);
    },

    async createReport(input) {
      const result = one("Create report", await db.from("content_reports").insert({
        reporter_id: input.reporterId ?? null,
        reason: input.reason, details: input.details, target: input.target,
        target_href: input.targetHref, reporter_email: input.reporterEmail,
      }).select(REPORT_SELECT).single());
      return mapReport(result as never);
    },

    async listReports(limit = limits.adminPageSize) {
      return rows("List reports", await db.from("content_reports").select(REPORT_SELECT)
        .order("created_at", { ascending: false }).limit(limit)).map((row) => mapReport(row as never));
    },

    async updateReport(id, status, adminNote, actorEmail) {
      const updated = await db.from("content_reports").update({
        status, admin_note: adminNote,
        resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
      }).eq("id", id).select(REPORT_SELECT).maybeSingle();
      if (updated.error) dbError("Update report", updated.error);
      if (!updated.data) return null;
      await this.logAudit({
        action: `report.${status}`, targetType: "content_report", targetId: id,
        actorEmail, summary: (adminNote ?? updated.data.details).replace(/\s+/g, " ").slice(0, 160), ip: null,
      });
      return mapReport(updated.data as never);
    },

    async createFeedback(input) {
      return mapFeedback(one("Create feedback", await db.from("feedback").insert({
        author_id: input.authorId ?? null,
        rating: input.rating, message: input.message, author_email: input.authorEmail,
      }).select(FEEDBACK_SELECT).single()) as never);
    },

    async listFeedback(limit = limits.adminPageSize) {
      return rows("List feedback", await db.from("feedback").select(FEEDBACK_SELECT)
        .order("created_at", { ascending: false }).limit(limit)).map((row) => mapFeedback(row as never));
    },

    async logAudit(input) {
      return mapAudit(one("Write audit entry", await db.from("audit_log").insert({
        action: input.action, target_type: input.targetType, target_id: input.targetId,
        actor_email: input.actorEmail, summary: input.summary, ip: input.ip,
      }).select(AUDIT_SELECT).single()) as never);
    },

    async listAudit(limit = limits.adminPageSize) {
      return rows("List audit entries", await db.from("audit_log").select(AUDIT_SELECT)
        .order("created_at", { ascending: false }).limit(limit)).map((row) => mapAudit(row as never));
    },

    async adminOverview() {
      const [profiles, attemptsCount, completedCount, reportCount, feedbackCount, subjectList, lessonList, questionList] = await Promise.all([
        db.from("profiles").select("role"),
        db.from("attempts").select("id", { count: "exact", head: true }),
        db.from("lesson_progress").select("user_id", { count: "exact", head: true }).eq("completed", true),
        db.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        db.from("feedback").select("id", { count: "exact", head: true }),
        subjects(true), lessons(true), questions(undefined, true),
      ]);
      const profileRows = rows("Count profiles", profiles);
      return {
        learners: profileRows.filter((item) => item.role === "learner").length,
        admins: profileRows.filter((item) => item.role === "admin").length,
        attempts: attemptsCount.count ?? 0,
        lessonsCompleted: completedCount.count ?? 0,
        openReports: reportCount.count ?? 0,
        feedbackEntries: feedbackCount.count ?? 0,
        subjects: subjectList.length, lessons: lessonList.length, questions: questionList.length,
      };
    },

    async adminUsers(): Promise<AdminUserRow[]> {
      const [profileRows, progressRows] = await Promise.all([
        db.from("profiles").select(PROFILE_SELECT).order("xp", { ascending: false }).limit(limits.adminPageSize),
        db.from("lesson_progress").select("user_id").eq("completed", true),
      ]);
      const progress = rows("Read learner completion counts", progressRows);
      return rows("List admin users", profileRows).map((row) => {
        const mapped = mapProfile(row as never);
        return {
          id: mapped.id, email: mapped.email, displayName: mapped.displayName, role: mapped.role,
          xp: mapped.xp, createdAt: mapped.createdAt, emailVerifiedAt: mapped.emailVerifiedAt,
          lessonsCompleted: progress.filter((item) => item.user_id === mapped.id).length,
        };
      });
    },

    async adminSubjects(): Promise<AdminSubjectRow[]> {
      const list = await subjects(true);
      return list.map((subject) => ({ ...subject, updatedAt: new Date().toISOString() }));
    },

    async adminLessons(): Promise<AdminLessonRow[]> {
      return (await lessons(true)).map((lesson) => ({
        id: lesson.id, slug: lesson.slug, title: lesson.title, subjectSlug: lesson.subjectSlug,
        subjectTitle: lesson.subjectTitle, moduleTitle: lesson.moduleTitle, difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes, published: lesson.published, updatedAt: new Date().toISOString(),
      }));
    },

    async adminQuestions(): Promise<AdminQuestionRow[]> {
      return (await questions(undefined, true)).map((question) => ({ ...question, updatedAt: new Date().toISOString() }));
    },
  };
}
