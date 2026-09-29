import { randomUUID } from "node:crypto";

import { learning, limits } from "../../config/app-config";
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
  PlanItem,
  Profile,
  SavedQuestion,
  StudyPlan,
  SubjectProgress,
} from "../types";
import { addDays, clamp, percent, todayISO } from "../utils";
import {
  accuracyOf,
  computeStreaks,
  createMemory,
  emptyProfile,
  heatmapFor,
  lessonKey,
  toSummary,
  touchActivity,
  type Store,
} from "./internal";
import type {
  ContentSource,
  LearnerStore,
  LessonProgressRow,
  RecordAttemptInput,
  RecordAttemptOutcome,
} from "./types";

const REVIEW_INTERVALS = learning.spacedReview.intervalsDays;
const MAX_ROWS = 500;

function advanceBox(item: SavedQuestion, correct: boolean): SavedQuestion {
  item.reviewBox = correct ? clamp(item.reviewBox + 1, 0, REVIEW_INTERVALS.length - 1) : 0;
  item.lastCorrect = correct;
  item.timesSeen += 1;
  item.mastered = item.reviewBox >= REVIEW_INTERVALS.length - 1 && item.timesSeen >= 2;
  item.dueOn = addDays(todayISO(), REVIEW_INTERVALS[item.reviewBox] ?? 0);
  return item;
}

export function createInMemoryLearnerStore(content: ContentSource): LearnerStore {
  const db: Store = createMemory();

  function readProfile(userId: string): Profile {
    const existing = db.profiles.get(userId);
    if (existing) return existing;
    const created = emptyProfile({ id: userId, email: null });
    db.profiles.set(created.id, created);
    return created;
  }

  function lessonRows(userId: string): Map<string, LessonProgressRow> {
    const rows = db.lessons.get(userId);
    if (rows) return rows;
    const fresh = new Map<string, LessonProgressRow>();
    db.lessons.set(userId, fresh);
    return fresh;
  }

  async function statsFor(userId: string): Promise<LearnerStats> {
    const profile = readProfile(userId);
    const attempts = db.attempts.get(userId) ?? [];
    const lessons = [...lessonRows(userId).values()];
    const allLessons = await content.listLessons();
    const activity = db.activity.get(userId) ?? [];

    const answered = attempts.reduce((sum, item) => sum + item.answers.length, 0);
    const correct = attempts.reduce(
      (sum, item) => sum + item.answers.filter((answer) => answer.correct).length,
      0,
    );
    const today = todayISO();
    const active = activity.filter((row) => row.minutes > 0 || row.xpEarned > 0);
    const streak = computeStreaks(
      active.map((row) => row.date),
      today,
      profile.freezeTokens,
    );

    return {
      xp: profile.xp,
      level: 1 + Math.floor(profile.xp / 250),
      levelProgress: percent(profile.xp % 250, 250),
      lessonsCompleted: lessons.filter((row) => row.completed).length,
      lessonsTotal: allLessons.length,
      attempts: attempts.length,
      correctAnswers: correct,
      answeredQuestions: answered,
      accuracy: accuracyOf(correct, answered),
      streakCurrent: streak.current,
      streakBest: streak.best,
      activeDays: active.length,
      minutesActive: activity.reduce((sum, row) => sum + row.minutes, 0),
      heatmap: heatmapFor(activity, learning.heatmapDays, today),
      last7Days: heatmapFor(activity, 7, today),
      dailyGoalMinutes: learning.dailyGoalMinutes,
    };
  }

  async function progressFor(userId: string, subjectSlug?: string): Promise<LessonProgressRow[]> {
    return [...lessonRows(userId).values()]
      .filter((row) => !subjectSlug || row.subjectSlug === subjectSlug)
      .sort((a, b) => a.lessonSlug.localeCompare(b.lessonSlug));
  }


  async function subjectProgressFor(userId: string): Promise<SubjectProgress[]> {
    const subjects = await content.listSubjects();
    const attempts = db.attempts.get(userId) ?? [];
    const rows = await progressFor(userId);

    return Promise.all(
      subjects.map(async (subject) => {
        const subjectRows = rows.filter((row) => row.subjectSlug === subject.slug);
        const completed = subjectRows.filter((row) => row.completed);
        const subjectAttempts = attempts.filter((item) => item.subjectSlug === subject.slug);
        const percents = subjectAttempts.map((item) => item.percent);
        const nextSlug = await nextLessonFor(
          subject.slug,
          new Set(completed.map((row) => row.lessonSlug)),
        );

        return {
          subjectSlug: subject.slug,
          title: subject.title,
          colorHex: subject.colorHex,
          icon: subject.icon,
          lessonsCompleted: completed.length,
          lessonsTotal: subject.lessonCount,
          percentComplete: percent(completed.length, subject.lessonCount),
          attempts: subjectAttempts.length,
          bestPercent: percents.length > 0 ? Math.max(...percents) : null,
          averagePercent:
            percents.length > 0
              ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length)
              : null,
          nextLesson: nextSlug,
        };
      }),
    );
  }

  async function nextLessonFor(
    subjectSlug: string,
    completedSlugs: Set<string>,
  ): Promise<{ slug: string; title: string } | null> {
    const subject = await content.getSubject(subjectSlug);
    if (!subject) return null;
    const pending = subject.lessonIndex.find((lesson) => !completedSlugs.has(lesson.slug));
    return pending ? { slug: pending.slug, title: pending.title } : null;
  }

  async function studyPlanFor(userId: string): Promise<StudyPlan> {
    const profile = readProfile(userId);
    const rows = await progressFor(userId);
    const completedSlugs = new Set(rows.filter((row) => row.completed).map((row) => row.lessonSlug));
    const lessons = await content.listLessons();
    const weeklyGoal = profile.weeklyGoalLessons || learning.plan.defaultLessonsPerWeek;
    const perDay = Math.max(1, Math.round(weeklyGoal / 7));
    const pending = lessons.filter((lesson) => !completedSlugs.has(lesson.slug));

    const items: PlanItem[] = pending
      .slice(0, learning.plan.horizonDays * perDay)
      .map((lesson, index) => ({
        id: `plan_${lesson.slug}`,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        subjectSlug: lesson.subjectSlug,
        dueOn: addDays(todayISO(), Math.floor(index / perDay)),
        completedAt: null,
        reason: index < perDay ? "Start here today" : "Keeps your weekly goal on track",
      }));

    const today = todayISO();
    return {
      subjectSlug: pending[0]?.subjectSlug ?? "",
      weeklyGoal,
      items,
      remainingToday: items.filter((item) => item.dueOn === today).length,
    };
  }


  async function recordAttempt(input: RecordAttemptInput): Promise<RecordAttemptOutcome> {
    const profile = readProfile(input.userId);
    const createdAt = new Date().toISOString();
    const today = todayISO();

    let lessonBonus = 0;
    let lessonCompleted = false;
    const rows = lessonRows(profile.id);
    const key = input.subjectSlug && input.lessonSlug ? lessonKey(input.subjectSlug, input.lessonSlug) : null;
    const row = key ? rows.get(key) : undefined;

    if (row && !row.completed && input.graded.passed && (input.mode === "quiz" || input.mode === "lesson")) {
      lessonCompleted = true;
      lessonBonus = learning.xpPerLesson;
    }

    const attempt: AttemptResult = {
      id: randomUUID(),
      mode: input.mode,
      subjectSlug: input.subjectSlug,
      lessonSlug: input.lessonSlug,
      score: input.graded.score,
      total: input.graded.total,
      percent: input.graded.percent,
      passed: input.graded.passed,
      xpAwarded: input.graded.xpAwarded + lessonBonus,
      durationSeconds: input.durationSeconds,
      createdAt,
      answers: input.graded.answers,
    };

    const attempts = db.attempts.get(profile.id) ?? [];
    attempts.push(attempt);
    db.attempts.set(profile.id, attempts.slice(-MAX_ROWS));
    profile.xp += attempt.xpAwarded;

    if (key && input.subjectSlug && input.lessonSlug) {
      const existing = rows.get(key);
      const stored: LessonProgressRow = existing ?? {
        subjectSlug: input.subjectSlug,
        lessonSlug: input.lessonSlug,
        attempts: 0,
        bestPercent: null,
        completed: false,
        completedAt: null,
        updatedAt: createdAt,
      };
      stored.attempts += 1;
      stored.bestPercent =
        stored.bestPercent === null ? attempt.percent : Math.max(stored.bestPercent, attempt.percent);
      stored.updatedAt = createdAt;
      if (lessonCompleted) {
        stored.completed = true;
        stored.completedAt = createdAt;
      }
      rows.set(key, stored);
    }

    let reviewQueued = 0;
    const reviewRows = db.review.get(profile.id) ?? [];
    for (const answer of input.graded.answers) {
      const queued = reviewRows.find((item) => item.questionId === answer.questionId);
      if (!answer.correct) {
        if (queued) {
          queued.reviewBox = 0;
          queued.dueOn = today;
          queued.lastCorrect = false;
          queued.mastered = false;
          queued.timesSeen += 1;
        } else {
          const question = await content.getQuestion(answer.questionId);
          reviewRows.push({
            questionId: answer.questionId,
            subjectSlug: question?.subjectSlug ?? input.subjectSlug ?? "",
            reviewBox: 0,
            dueOn: today,
            lastCorrect: false,
            timesSeen: 1,
            mastered: false,
            prompt: question?.prompt ?? answer.prompt,
            kind: question?.kind ?? answer.kind,
          });
        }
        reviewQueued += 1;
        continue;
      }
      if (input.mode === "review" && queued) advanceBox(queued, true);
    }
    db.review.set(profile.id, reviewRows.slice(-MAX_ROWS));

    const minutes =
      input.durationSeconds && input.durationSeconds > 0
        ? Math.max(1, Math.round(input.durationSeconds / 60))
        : Math.max(1, Math.round(input.graded.answers.length / 2));
    touchActivity(db, profile.id, {
      xpEarned: attempt.xpAwarded,
      exercisesCompleted: input.graded.answers.length,
      minutes,
      lessonsCompleted: lessonCompleted ? 1 : 0,
    });

    const activity = db.activity.get(profile.id) ?? [];
    const streak = computeStreaks(
      activity.map((item) => item.date),
      today,
      profile.freezeTokens,
    );
    profile.freezeTokens = Math.max(0, profile.freezeTokens - streak.freezeSpent);

    return {
      attempt,
      profile,
      stats: await statsFor(profile.id),
      lessonCompleted,
      reviewQueued,
    };
  }

  async function toggleBookmarkFor(
    userId: string,
    subjectSlug: string,
    lessonSlug: string,
  ): Promise<boolean> {
    const lesson = await content.getLesson(subjectSlug, lessonSlug);
    const rows = db.bookmarks.get(userId) ?? [];
    const index = rows.findIndex(
      (item) => item.subjectSlug === subjectSlug && item.lessonSlug === lessonSlug,
    );
    if (index >= 0) {
      rows.splice(index, 1);
      db.bookmarks.set(userId, rows);
      return false;
    }
    rows.unshift({
      lessonSlug,
      lessonTitle: lesson?.title ?? lessonSlug,
      subjectSlug,
      subjectTitle: lesson?.subjectTitle ?? subjectSlug,
      createdAt: new Date().toISOString(),
    });
    db.bookmarks.set(userId, rows.slice(0, MAX_ROWS));
    return true;
  }


  function listReviewFor(userId: string, includeMastered = false): SavedQuestion[] {
    const rows = db.review.get(userId) ?? [];
    const today = todayISO();
    return rows
      .filter((item) => includeMastered || (!item.mastered && item.dueOn <= today))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.questionId.localeCompare(b.questionId));
  }

  function recordReviewFor(
    userId: string,
    questionId: string,
    correct: boolean,
  ): SavedQuestion | null {
    const rows = db.review.get(userId) ?? [];
    const item = rows.find((entry) => entry.questionId === questionId);
    if (!item) return null;
    return advanceBox(item, correct);
  }

  function listBookmarksFor(userId: string): Bookmark[] {
    return [...(db.bookmarks.get(userId) ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  function createReportFor(input: {
    reason: string;
    details: string;
    target: string;
    targetHref: string | null;
    reporterEmail: string | null;
  }): ContentReport {
    const report: ContentReport = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "open",
      reason: input.reason,
      details: input.details,
      target: input.target,
      targetHref: input.targetHref,
      reporterEmail: input.reporterEmail,
      resolvedAt: null,
      adminNote: null,
    };
    db.reports.unshift(report);
    db.reports = db.reports.slice(0, MAX_ROWS);
    return report;
  }

  function createFeedbackFor(input: {
    rating: number;
    message: string;
    authorEmail: string | null;
  }): FeedbackEntry {
    const entry: FeedbackEntry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      rating: input.rating,
      message: input.message,
      authorEmail: input.authorEmail,
    };
    db.feedback.unshift(entry);
    db.feedback = db.feedback.slice(0, MAX_ROWS);
    return entry;
  }

  function logAuditFor(input: {
    action: string;
    targetType: string;
    targetId: string;
    actorEmail: string | null;
    summary: string;
    ip: string | null;
  }): AuditEntry {
    const entry: AuditEntry = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
    db.audit.unshift(entry);
    db.audit = db.audit.slice(0, MAX_ROWS);
    return entry;
  }


  async function adminOverviewFor() {
    const subjects = await content.listSubjects();
    const lessons = await content.listLessons();
    const questions = await content.listQuestions();
    const profiles = [...db.profiles.values()];
    const lessonsCompleted = [...db.lessons.values()].reduce(
      (sum, rows) => sum + [...rows.values()].filter((row) => row.completed).length,
      0,
    );

    return {
      learners: profiles.filter((profile) => profile.role === "learner").length,
      admins: profiles.filter((profile) => profile.role === "admin").length,
      attempts: [...db.attempts.values()].reduce((sum, rows) => sum + rows.length, 0),
      lessonsCompleted,
      openReports: db.reports.filter((report) => report.status === "open").length,
      feedbackEntries: db.feedback.length,
      subjects: subjects.length,
      lessons: lessons.length,
      questions: questions.length,
    };
  }

  async function adminUsersFor(): Promise<AdminUserRow[]> {
    const rows: AdminUserRow[] = [];
    for (const profile of db.profiles.values()) {
      const lessons = [...lessonRows(profile.id).values()];
      rows.push({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        xp: profile.xp,
        lessonsCompleted: lessons.filter((row) => row.completed).length,
        createdAt: profile.createdAt,
        emailVerifiedAt: profile.emailVerifiedAt,
      });
    }
    return rows.sort((a, b) => b.xp - a.xp).slice(0, limits.adminPageSize);
  }

  async function adminSubjectsFor(): Promise<AdminSubjectRow[]> {
    const now = new Date().toISOString();
    return (await content.listSubjects()).map((subject) => ({ ...subject, updatedAt: now }));
  }

  async function adminLessonsFor(): Promise<AdminLessonRow[]> {
    const now = new Date().toISOString();
    return (await content.listLessons()).map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      subjectSlug: lesson.subjectSlug,
      subjectTitle: lesson.subjectTitle,
      moduleTitle: lesson.moduleTitle,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
      published: lesson.published,
      updatedAt: now,
    }));
  }

  async function adminQuestionsFor(): Promise<AdminQuestionRow[]> {
    const now = new Date().toISOString();
    return (await content.listQuestions()).map((question) => ({ ...question, updatedAt: now }));
  }

  return {
    async getProfile(userId) {
      return db.profiles.get(userId) ?? null;
    },

    async ensureProfile(input) {
      const existing = db.profiles.get(input.id);
      if (existing) return existing;
      const created = emptyProfile(input);
      db.profiles.set(created.id, created);
      return created;
    },

    async updateProfile(userId, patch) {
      const profile = readProfile(userId);
      const updated: Profile = {
        ...profile,
        ...patch,
        username: patch.username === undefined ? profile.username : patch.username,
        bio: patch.bio === undefined ? profile.bio : patch.bio,
        reminderTime: patch.reminderTime === undefined ? profile.reminderTime : patch.reminderTime,
      };
      db.profiles.set(updated.id, updated);
      return updated;
    },

    async purgeLearner(userId) {
      db.profiles.delete(userId);
      db.attempts.delete(userId);
      db.lessons.delete(userId);
      db.bookmarks.delete(userId);
      db.review.delete(userId);
      db.activity.delete(userId);
    },

    recordAttempt,
    async listAttempts(userId, limit = limits.pageSize) {
      const rows = db.attempts.get(userId) ?? [];
      return [...rows].reverse().slice(0, limit).map(toSummary);
    },
    async getAttempt(userId, attemptId) {
      const rows = db.attempts.get(userId) ?? [];
      return rows.find((item) => item.id === attemptId) ?? null;
    },
    stats: statsFor,
    subjectProgress: subjectProgressFor,
    lessonProgress: progressFor,
    studyPlan: studyPlanFor,
    toggleBookmark: toggleBookmarkFor,
    async listBookmarks(userId) {
      return listBookmarksFor(userId);
    },
    async listReview(userId, includeMastered) {
      return listReviewFor(userId, includeMastered ?? false);
    },
    async recordReview(userId, questionId, correct) {
      return recordReviewFor(userId, questionId, correct);
    },
    async createReport(input) {
      return createReportFor(input);
    },
    async listReports(limit = limits.adminPageSize) {
      return db.reports.slice(0, limit);
    },
    async updateReport(id, status, adminNote, actorEmail) {
      const report = db.reports.find((item) => item.id === id);
      if (!report) return null;
      report.status = status;
      report.adminNote = adminNote;
      report.resolvedAt = status === "resolved" || status === "dismissed" ? new Date().toISOString() : null;
      logAuditFor({
        action: `report.${status}`,
        targetType: "content_report",
        targetId: id,
        actorEmail,
        summary: truncateSummary(adminNote ?? report.details),
        ip: null,
      });
      return report;
    },
    async createFeedback(input) {
      return createFeedbackFor(input);
    },
    async listFeedback(limit = limits.adminPageSize) {
      return db.feedback.slice(0, limit);
    },
    async logAudit(input) {
      return logAuditFor(input);
    },
    async listAudit(limit = limits.adminPageSize) {
      return db.audit.slice(0, limit);
    },
    adminOverview: adminOverviewFor,
    adminUsers: adminUsersFor,
    adminSubjects: adminSubjectsFor,
    adminLessons: adminLessonsFor,
    adminQuestions: adminQuestionsFor,
  };
}


function truncateSummary(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 159)}…` : clean;
}
