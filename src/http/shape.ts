import { practice } from "../config/app-config";
import type { Question, QuestionSolution, StudentAnswer } from "../lib/types";
import { seededShuffle } from "../lib/utils";



export function toPublicQuestion(question: QuestionSolution): Question {
  return {
    id: question.id,
    subjectSlug: question.subjectSlug,
    subjectTitle: question.subjectTitle,
    lessonSlug: question.lessonSlug,
    kind: question.kind,
    prompt: question.prompt,
    hint: question.hint,
    options: question.options,
    points: question.points,
    difficulty: question.difficulty,
  };
}

export function toPublicQuestions(questions: QuestionSolution[]): Question[] {
  return questions.map(toPublicQuestion);
}


export function seedFrom(parts: Array<string | number | null | undefined>): number {
  const text = parts.filter((part) => part !== null && part !== undefined).join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 2147483647 || 1;
}

export function pickQuestions(
  questions: QuestionSolution[],
  size: number,
  seed: number,
): QuestionSolution[] {
  const limit = Math.max(1, Math.min(size, practice.maxQuestions, questions.length || 1));
  return seededShuffle(questions, seed).slice(0, limit);
}


export function queryString(value: unknown): string | null {
  if (typeof value === "string") return value.trim().length > 0 ? value.trim() : null;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return null;
}

export function queryNumber(value: unknown, fallback: number, min: number, max: number): number {
  const text = queryString(value);
  const parsed = text === null ? Number.NaN : Number.parseInt(text, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export type { StudentAnswer };
