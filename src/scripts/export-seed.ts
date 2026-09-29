
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  getDemoSubject,
  listDemoLessons,
  listDemoQuestions,
  listDemoSubjects,
} from "../lib/demo/content";
import type { QuestionSolution } from "../lib/types";

const TAG = "sq";


function text(value: string | null | undefined): string {
  if (value === null || value === undefined) return "null";
  if (value.includes(`$${TAG}$`)) {

    return `'${value.replace(/'/g, "''").replace(/\$/g, "\\$")}'`;
  }
  return `$${TAG}$${value}$${TAG}$`;
}

function jsonb(value: unknown): string {
  return `${text(JSON.stringify(value ?? null))}::jsonb`;
}

function bool(value: boolean): string {
  return value ? "true" : "false";
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? "null" : String(value);
}

function statement(table: string, columns: string[], rows: string[], updates: string[]): string {
  if (rows.length === 0) return "";
  const key = table === "question_solutions" ? "question_id" : "id";
  const setClause = updates.map((column) => `${column} = excluded.${column}`).join(", ");
  return (
    `insert into public.${table} (${columns.join(", ")}) values\n` +
    `${rows.join(",\n")}\n` +
    `on conflict (${key}) do update set ${setClause};\n`
  );
}

function questionRow(question: QuestionSolution, index: number): string {
  const lessonId = question.lessonSlug ? `les_${question.subjectSlug}_${question.lessonSlug}` : null;
  return (
    `(${[
      text(question.id),
      text(`sub_${question.subjectSlug}`),
      text(lessonId),
      text(question.kind),
      text(question.prompt),
      text(question.hint),
      jsonb(question.options),
      num(question.points),
      text(question.difficulty),
      num(index),
      "true",
    ].join(", ")})`
  );
}


const SUBJECT_COLUMNS = ["id", "slug", "title", "description", "icon", "color_hex", "level", "sort_order", "published"];
const MODULE_COLUMNS = ["id", "subject_id", "slug", "title", "description", "sort_order"];
const LESSON_COLUMNS = [
  "id", "subject_id", "module_id", "slug", "title", "description", "body", "objectives",
  "code_examples", "diagram", "related", "estimated_minutes", "difficulty", "sort_order", "published",
];
const QUESTION_COLUMNS = [
  "id", "subject_id", "lesson_id", "kind", "prompt", "hint", "options", "points", "difficulty",
  "sort_order", "published",
];
const SOLUTION_COLUMNS = ["question_id", "answer", "explanation", "starter_code", "expected_output"];

function build(): string {
  const subjects = listDemoSubjects();
  const lessons = listDemoLessons();
  const questions = listDemoQuestions();

  const subjectRows = subjects.map((subject) =>
    `(${[
      text(subject.id), text(subject.slug), text(subject.title), text(subject.description),
      text(subject.icon), text(subject.colorHex), text(subject.level), num(subject.sortOrder),
      bool(subject.published),
    ].join(", ")})`,
  );

  const moduleRows = subjects.flatMap((subject) => {
    const detail = getDemoSubject(subject.slug);
    return (detail?.modules ?? []).map((module) =>
      `(${[
        text(module.id),
        text(subject.id),
        text(module.id.replace(`mod_${subject.slug}_`, "")),
        text(module.title),
        text(module.description),
        num(module.sortOrder),
      ].join(", ")})`,
    );
  });

  const lessonRows = lessons.map((lesson) =>
    `(${[
      text(lesson.id),
      text(`sub_${lesson.subjectSlug}`),
      text(lesson.moduleId),
      text(lesson.slug),
      text(lesson.title),
      text(lesson.description),
      text(lesson.body),
      jsonb(lesson.objectives),
      jsonb(lesson.codeExamples),
      lesson.diagram ? jsonb(lesson.diagram) : "null",
      jsonb(lesson.related),
      num(lesson.estimatedMinutes),
      text(lesson.difficulty),
      num(lesson.sortOrder),
      bool(lesson.published),
    ].join(", ")})`,
  );

  const solutionRows = questions.map((question) =>
    `(${[
      text(question.id),
      jsonb(question.answer),
      text(question.explanation),
      text(question.starterCode),
      text(question.expectedOutput),
    ].join(", ")})`,
  );

  return (
    `begin;\n\n` +
    statement("subjects", SUBJECT_COLUMNS, subjectRows, SUBJECT_COLUMNS.slice(1)) +
    "\n" +
    statement("modules", MODULE_COLUMNS, moduleRows, MODULE_COLUMNS.slice(1)) +
    "\n" +
    statement("lessons", LESSON_COLUMNS, lessonRows, LESSON_COLUMNS.slice(1)) +
    "\n" +
    statement("questions", QUESTION_COLUMNS, questions.map(questionRow), QUESTION_COLUMNS.slice(1)) +
    "\n" +
    statement("question_solutions", SOLUTION_COLUMNS, solutionRows, SOLUTION_COLUMNS.slice(1)) +
    "\ncommit;\n"
  );
}

async function main(): Promise<void> {
  const target = resolve(process.cwd(), "supabase", "seed.sql");
  await writeFile(target, build(), "utf8");
  process.stdout.write(`Wrote ${target}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
