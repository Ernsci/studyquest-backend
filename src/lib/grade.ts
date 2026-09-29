import { learning } from "../config/app-config";
import type {
  GradedAnswer,
  PracticeMode,
  QuestionSolution,
  StudentAnswer,
} from "./types";




export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"'`]+$/g, "")
    .trim();
}


export function normalizeOutput(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\/+$/, ""))
    .filter((line) => line.length > 0)
    .join("\n")
    .toLowerCase();
}


export function acceptedShortAnswers(answer: StudentAnswer): string[] {
  if (typeof answer !== "string") return [];
  return answer
    .split("|")
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function toIndexSet(value: StudentAnswer): number[] {
  if (Array.isArray(value)) return [...value].filter((n) => Number.isInteger(n)).sort((a, b) => a - b);
  if (typeof value === "number") return [value];
  return [];
}

export function isAnswerCorrect(question: QuestionSolution, given: StudentAnswer): boolean {
  switch (question.kind) {
    case "single":
    case "true_false":
      if (question.kind === "true_false") {
        return (
          (given === true || given === "true") ===
          (question.answer === true || question.answer === "true")
        );
      }
      return typeof given === "number" && given === question.answer;

    case "multiple": {
      const expected = toIndexSet(question.answer);
      const actual = toIndexSet(given);
      return (
        expected.length > 0 &&
        expected.length === actual.length &&
        expected.every((value, index) => value === actual[index])
      );
    }

    case "short_answer": {
      if (typeof given !== "string") return false;
      const normalized = normalizeText(given);
      if (normalized.length === 0) return false;
      return acceptedShortAnswers(question.answer).includes(normalized);
    }

    case "code": {
      if (typeof given !== "string" || !question.expectedOutput) return false;
      return normalizeOutput(given) === normalizeOutput(question.expectedOutput);
    }

    default:
      return false;
  }
}

export type GradedAttempt = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  xpAwarded: number;
  answers: GradedAnswer[];
};


export function gradeAttempt(params: {
  questions: QuestionSolution[];
  responses: Map<string, StudentAnswer>;
  mode: PracticeMode;
}): GradedAttempt {
  const answers: GradedAnswer[] = params.questions.map((question) => {
    const given = params.responses.get(question.id) ?? null;
    const correct = given !== null && isAnswerCorrect(question, given);
    return {
      questionId: question.id,
      given,
      correct,
      pointsAwarded: correct ? question.points : 0,
      pointsPossible: question.points,
      expected: question.answer,
      explanation: question.explanation,
      prompt: question.prompt,
      kind: question.kind,
    };
  });

  const score = answers.reduce((sum, item) => sum + item.pointsAwarded, 0);
  const total = answers.reduce((sum, item) => sum + item.pointsPossible, 0);
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = total > 0 && score / total >= learning.passMark;
  const correctCount = answers.filter((item) => item.correct).length;

  let xpAwarded = correctCount * learning.xpPerCorrectAnswer;
  if (passed && (params.mode === "quiz" || params.mode === "lesson")) {
    xpAwarded += learning.quizPassBonus;
  }

  return { score, total, percent, passed, xpAwarded, answers };
}


export function describeExpected(question: QuestionSolution): string {
  switch (question.kind) {
    case "single": {
      const index = typeof question.answer === "number" ? question.answer : -1;
      return question.options[index] ?? "—";
    }
    case "multiple":
      return toIndexSet(question.answer)
        .map((index) => question.options[index] ?? "?")
        .join(" · ");
    case "true_false":
      return question.answer === true || question.answer === "true" ? "True" : "False";
    case "short_answer":
      return acceptedShortAnswers(question.answer).join(" / ");
    case "code":
      return question.expectedOutput ?? "—";
    default:
      return "—";
  }
}
