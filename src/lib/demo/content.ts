import type {
  Lesson,
  LessonSummary,
  ModuleWithLessons,
  Question,
  QuestionSolution,
  SubjectDetail,
  SubjectSummary,
} from "../types";
import { javascriptSubject } from "./content-javascript";
import { htmlCssSubject, webSecuritySubject } from "./content-web";
import { pythonSubject, sqlSubject } from "./content-data";
import { javaSubject } from "./content-java";
import type { RawSubject } from "./types";

/**
 * Bundled sample content, turned into the same shapes the Supabase data layer
 * returns. Ids are deterministic (`sub_javascript`, `mod_javascript_getting-started`,
 * `les_javascript_values-and-variables`, `qs_javascript_1`) so demo progress rows
 * keep pointing at the same records across restarts.
 */

const raw: RawSubject[] = [
  javascriptSubject,
  htmlCssSubject,
  webSecuritySubject,
  pythonSubject,
  sqlSubject,
  javaSubject,
]
  .slice()
  .sort((a, b) => a.order - b.order);

export function subjectId(slug: string): string {
  return `sub_${slug}`;
}

export function moduleId(subjectSlug: string, moduleSlug: string): string {
  return `mod_${subjectSlug}_${moduleSlug}`;
}

export function lessonId(subjectSlug: string, lessonSlug: string): string {
  return `les_${subjectSlug}_${lessonSlug}`;
}

export function questionId(subjectSlug: string, index: number): string {
  return `qs_${subjectSlug}_${index + 1}`;
}

function toSummary(subject: RawSubject): SubjectSummary {
  return {
    id: subjectId(subject.slug),
    slug: subject.slug,
    title: subject.title,
    description: subject.description,
    icon: subject.icon,
    colorHex: subject.colorHex,
    level: subject.level,
    sortOrder: subject.order,
    published: true,
    lessonCount: subject.lessons.length,
    questionCount: subject.questions.length,
  };
}

function toLessonSummary(subject: RawSubject, lessonSlug: string): LessonSummary | null {
  const lesson = subject.lessons.find((item) => item.slug === lessonSlug);
  if (!lesson) return null;
  return {
    id: lessonId(subject.slug, lesson.slug),
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    sortOrder: lesson.order,
    estimatedMinutes: lesson.estimatedMinutes,
    difficulty: lesson.difficulty,
  };
}

function toModules(subject: RawSubject): ModuleWithLessons[] {
  return subject.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((module) => ({
      id: moduleId(subject.slug, module.slug),
      title: module.title,
      description: module.description,
      sortOrder: module.order,
      lessons: subject.lessons
        .filter((lesson) => lesson.moduleSlug === module.slug)
        .sort((a, b) => a.order - b.order)
        .map((lesson) => toLessonSummary(subject, lesson.slug))
        .filter((lesson): lesson is LessonSummary => lesson !== null),
    }));
}

function toLesson(subject: RawSubject, lessonSlug: string): Lesson | null {
  const lesson = subject.lessons.find((item) => item.slug === lessonSlug);
  if (!lesson) return null;
  const module = subject.modules.find((item) => item.slug === lesson.moduleSlug);
  return {
    id: lessonId(subject.slug, lesson.slug),
    subjectSlug: subject.slug,
    subjectTitle: subject.title,
    subjectColor: subject.colorHex,
    moduleId: moduleId(subject.slug, lesson.moduleSlug),
    moduleTitle: module?.title ?? "Lessons",
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    body: lesson.body,
    objectives: lesson.objectives,
    codeExamples: lesson.codeExamples ?? [],
    diagram: lesson.diagram ?? null,
    related: lesson.related ?? [],
    estimatedMinutes: lesson.estimatedMinutes,
    difficulty: lesson.difficulty,
    sortOrder: lesson.order,
    published: true,
  };
}

function toQuestion(subject: RawSubject, index: number): QuestionSolution {
  const question = subject.questions[index];
  if (!question) throw new Error(`Missing question ${index} in ${subject.slug}`);
  const prompt: Question = {
    id: questionId(subject.slug, index),
    subjectSlug: subject.slug,
    subjectTitle: subject.title,
    lessonSlug: question.lessonSlug ?? null,
    kind: question.kind,
    prompt: question.prompt,
    hint: question.hint ?? null,
    options: question.options ?? [],
    points: question.points ?? (question.kind === "code" ? 3 : 1),
    difficulty: question.difficulty ?? subject.level,
  };
  return {
    ...prompt,
    answer: question.answer,
    explanation: question.explanation,
    starterCode: question.starterCode ?? null,
    expectedOutput: question.expectedOutput ?? null,
  };
}

export function listDemoSubjects(): SubjectSummary[] {
  return raw.map(toSummary);
}

export function getDemoSubject(subjectSlug: string): SubjectDetail | null {
  const subject = raw.find((item) => item.slug === subjectSlug);
  if (!subject) return null;
  const modules = toModules(subject);
  return {
    ...toSummary(subject),
    modules,
    lessonIndex: modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        moduleTitle: module.title,
      })),
    ),
  };
}

export function listDemoLessonSummaries(subjectSlug: string): LessonSummary[] {
  const subject = raw.find((item) => item.slug === subjectSlug);
  if (!subject) return [];
  return subject.lessons
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((lesson) => toLessonSummary(subject, lesson.slug))
    .filter((lesson): lesson is LessonSummary => lesson !== null);
}

export function listDemoLessons(): Lesson[] {
  return raw.flatMap((subject) =>
    subject.lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((lesson) => toLesson(subject, lesson.slug))
      .filter((lesson): lesson is Lesson => lesson !== null),
  );
}

export function getDemoLesson(subjectSlug: string, lessonSlug: string): Lesson | null {
  const subject = raw.find((item) => item.slug === subjectSlug);
  if (!subject) return null;
  return toLesson(subject, lessonSlug);
}

export function listDemoQuestions(subjectSlug?: string): QuestionSolution[] {
  const subjects = subjectSlug ? raw.filter((item) => item.slug === subjectSlug) : raw;
  return subjects.flatMap((subject) =>
    subject.questions.map((_, index) => toQuestion(subject, index)),
  );
}

export function lessonDemoQuestions(subjectSlug: string, lessonSlug: string): QuestionSolution[] {
  return listDemoQuestions(subjectSlug).filter((question) => question.lessonSlug === lessonSlug);
}

export function getDemoQuestion(id: string): QuestionSolution | null {
  return listDemoQuestions().find((question) => question.id === id) ?? null;
}

export function firstDemoLesson(subjectSlug: string): { slug: string; title: string } | null {
  const first = listDemoLessonSummaries(subjectSlug)[0];
  return first ? { slug: first.slug, title: first.title } : null;
}

