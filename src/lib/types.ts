

export type Role = "learner" | "admin";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type QuestionKind =
  | "single"
  | "multiple"
  | "true_false"
  | "short_answer"
  | "code";

export type PracticeMode = "quiz" | "practice" | "review" | "lesson";


export type StudentAnswer = string | number | number[] | boolean | null;

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  weeklyGoalLessons: number;
  reminderTime: string | null;
  reminderEnabled: boolean;
  themeMode: "light" | "dark" | "system";
  xp: number;
  freezeTokens: number;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type SubjectSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  colorHex: string;
  level: Difficulty;
  sortOrder: number;
  published: boolean;
  lessonCount: number;
  questionCount: number;
};

export type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  estimatedMinutes: number;
  difficulty: Difficulty;
};

export type ModuleWithLessons = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  lessons: LessonSummary[];
};

export type SubjectDetail = SubjectSummary & {
  modules: ModuleWithLessons[];

  lessonIndex: Array<{ slug: string; title: string; moduleTitle: string }>;
};

export type CodeExample = {
  label: string;
  language: string;
  code: string;
  explanation?: string;
  runnable?: boolean;
};

export type DiagramBlock = {
  title: string;
  steps: Array<{ label: string; detail: string }>;
  note?: string;
};

export type RelatedLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type Lesson = {
  id: string;
  subjectSlug: string;
  subjectTitle: string;
  subjectColor: string;
  moduleId: string;
  moduleTitle: string;
  slug: string;
  title: string;
  description: string;

  body: string;
  objectives: string[];
  codeExamples: CodeExample[];
  diagram: DiagramBlock | null;
  related: RelatedLink[];
  estimatedMinutes: number;
  difficulty: Difficulty;
  sortOrder: number;
  published: boolean;
};


export type Question = {
  id: string;
  subjectSlug: string;
  subjectTitle: string;
  lessonSlug: string | null;
  kind: QuestionKind;
  prompt: string;
  hint: string | null;
  options: string[];
  points: number;
  difficulty: Difficulty;
};


export type QuestionSolution = Question & {
  answer: StudentAnswer;
  explanation: string;
  starterCode: string | null;
  expectedOutput: string | null;
};

export type GradedAnswer = {
  questionId: string;
  given: StudentAnswer;
  correct: boolean;
  pointsAwarded: number;
  pointsPossible: number;
  expected: StudentAnswer;
  explanation: string;
  prompt: string;
  kind: QuestionKind;
};

export type AttemptResult = {
  id: string;
  mode: PracticeMode;
  subjectSlug: string | null;
  lessonSlug: string | null;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  xpAwarded: number;
  durationSeconds: number | null;
  createdAt: string;
  answers: GradedAnswer[];
};

export type AttemptSummary = Omit<AttemptResult, "answers"> & {
  answerCount: number;
};

export type SubjectProgress = {
  subjectSlug: string;
  title: string;
  colorHex: string;
  icon: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  percentComplete: number;
  attempts: number;
  bestPercent: number | null;
  averagePercent: number | null;
  nextLesson: { slug: string; title: string } | null;
};

export type DailyActivity = {
  date: string;
  lessonsCompleted: number;
  xpEarned: number;
  exercisesCompleted: number;
  minutes: number;
};

export type LearnerStats = {
  xp: number;
  level: number;
  levelProgress: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  attempts: number;
  correctAnswers: number;
  answeredQuestions: number;
  accuracy: number | null;
  streakCurrent: number;
  streakBest: number;
  activeDays: number;
  minutesActive: number;
  heatmap: DailyActivity[];
  last7Days: DailyActivity[];
  dailyGoalMinutes: number;
};

export type Bookmark = {
  lessonSlug: string;
  lessonTitle: string;
  subjectSlug: string;
  subjectTitle: string;
  createdAt: string;
};

export type ReviewItem = {
  questionId: string;
  subjectSlug: string;
  reviewBox: number;
  dueOn: string;
  lastCorrect: boolean | null;
  timesSeen: number;
  mastered: boolean;
};

export type SavedQuestion = ReviewItem & {
  prompt: string;
  kind: QuestionKind;
};

export type PlanItem = {
  id: string;
  lessonSlug: string;
  lessonTitle: string;
  subjectSlug: string;
  dueOn: string;
  completedAt: string | null;
  reason: string;
};

export type StudyPlan = {
  subjectSlug: string;
  weeklyGoal: number;
  items: PlanItem[];
  remainingToday: number;
};

export type Recommendation = {
  kind: "continue" | "review" | "next_subject" | "practice";
  title: string;
  description: string;
  href: string;
  cta: string;
};

export type ContentReport = {
  id: string;
  createdAt: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  reason: string;
  details: string;
  target: string;
  targetHref: string | null;
  reporterEmail: string | null;
  resolvedAt: string | null;
  adminNote: string | null;
};

export type FeedbackEntry = {
  id: string;
  createdAt: string;
  rating: number;
  message: string;
  authorEmail: string | null;
};

export type AuditEntry = {
  id: string;
  createdAt: string;
  action: string;
  targetType: string;
  targetId: string;
  actorEmail: string | null;
  summary: string;
  ip: string | null;
};


export type AdminSubjectRow = SubjectSummary & { updatedAt: string };

export type AdminLessonRow = {
  id: string;
  slug: string;
  title: string;
  subjectSlug: string;
  subjectTitle: string;
  moduleTitle: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  published: boolean;
  updatedAt: string;
};

export type AdminQuestionRow = QuestionSolution & { updatedAt: string };

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  xp: number;
  lessonsCompleted: number;
  createdAt: string;
  emailVerifiedAt: string | null;
};


export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

