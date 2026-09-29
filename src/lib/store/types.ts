import type { GradedAttempt } from "../grade";
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
  FeedbackEntry,
  LearnerStats,
  Lesson,
  PracticeMode,
  Profile,
  QuestionSolution,
  Role,
  SavedQuestion,
  StudyPlan,
  SubjectDetail,
  SubjectProgress,
  SubjectSummary,
} from "../types";

/**
 * The data layer the API routes talk to.
 *
 * Everything is async on purpose: the bundled sample content answers
 * synchronously, the Supabase implementation does not. Routes therefore never
 * need to change when the backing store is swapped.
 */

export type LessonProgressRow = {
  subjectSlug: string;
  lessonSlug: string;
  attempts: number;
  bestPercent: number | null;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
};

export type RecordAttemptInput = {
  userId: string;
  mode: PracticeMode;
  subjectSlug: string | null;
  lessonSlug: string | null;
  durationSeconds: number | null;
  /** Output of `gradeAttempt` — XP is never accepted from the client. */
  graded: GradedAttempt;
};

export type RecordAttemptOutcome = {
  attempt: AttemptResult;
  profile: Profile;
  stats: LearnerStats;
  lessonCompleted: boolean;
  reviewQueued: number;
};

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "displayName"
    | "username"
    | "bio"
    | "weeklyGoalLessons"
    | "reminderTime"
    | "reminderEnabled"
    | "themeMode"
  >
>;

export type EnsureProfileInput = {
  id: string;
  email: string | null;
  displayName?: string | null;
  role?: Role;
};

export type AdjacentLesson = {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

export type AdminOverview = {
  learners: number;
  admins: number;
  attempts: number;
  lessonsCompleted: number;
  openReports: number;
  feedbackEntries: number;
  subjects: number;
  lessons: number;
  questions: number;
};

export interface ContentSource {
  listSubjects(): Promise<SubjectSummary[]>;
  getSubject(subjectSlug: string): Promise<SubjectDetail | null>;
  getLesson(subjectSlug: string, lessonSlug: string): Promise<Lesson | null>;
  listLessons(): Promise<Lesson[]>;
  /** Prompts + options only; grading fields are stripped before they leave. */
  listQuestions(subjectSlug?: string): Promise<QuestionSolution[]>;
  getQuestion(id: string): Promise<QuestionSolution | null>;
  adjacentLesson(subjectSlug: string, lessonSlug: string): Promise<AdjacentLesson>;
}

export interface LearnerStore {
  getProfile(userId: string): Promise<Profile | null>;
  ensureProfile(input: EnsureProfileInput): Promise<Profile>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<Profile>;
  purgeLearner(userId: string): Promise<void>;

  recordAttempt(input: RecordAttemptInput): Promise<RecordAttemptOutcome>;
  listAttempts(userId: string, limit?: number): Promise<AttemptSummary[]>;
  getAttempt(userId: string, attemptId: string): Promise<AttemptResult | null>;

  stats(userId: string): Promise<LearnerStats>;
  subjectProgress(userId: string): Promise<SubjectProgress[]>;
  lessonProgress(userId: string, subjectSlug?: string): Promise<LessonProgressRow[]>;
  studyPlan(userId: string): Promise<StudyPlan>;

  toggleBookmark(userId: string, subjectSlug: string, lessonSlug: string): Promise<boolean>;
  listBookmarks(userId: string): Promise<Bookmark[]>;
  listReview(userId: string, includeMastered?: boolean): Promise<SavedQuestion[]>;
  recordReview(userId: string, questionId: string, correct: boolean): Promise<SavedQuestion | null>;

  createReport(input: {
    reporterId?: string | null;
    reason: string;
    details: string;
    target: string;
    targetHref: string | null;
    reporterEmail: string | null;
  }): Promise<ContentReport>;
  listReports(limit?: number): Promise<ContentReport[]>;
  updateReport(
    id: string,
    status: ContentReport["status"],
    adminNote: string | null,
    actorEmail: string | null,
  ): Promise<ContentReport | null>;

  createFeedback(input: {
    authorId?: string | null;
    rating: number;
    message: string;
    authorEmail: string | null;
  }): Promise<FeedbackEntry>;
  listFeedback(limit?: number): Promise<FeedbackEntry[]>;

  logAudit(input: {
    action: string;
    targetType: string;
    targetId: string;
    actorEmail: string | null;
    summary: string;
    ip: string | null;
  }): Promise<AuditEntry>;
  listAudit(limit?: number): Promise<AuditEntry[]>;

  adminOverview(): Promise<AdminOverview>;
  adminUsers(): Promise<AdminUserRow[]>;
  adminSubjects(): Promise<AdminSubjectRow[]>;
  adminLessons(): Promise<AdminLessonRow[]>;
  adminQuestions(): Promise<AdminQuestionRow[]>;
}

export interface StudyQuestStore extends ContentSource, LearnerStore {}
