import { Router } from "express";

import { authOf, requireAuth } from "../http/context";
import { badRequest } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { parseInput } from "../http/validate";
import { gradeAttempt } from "../lib/grade";
import { store } from "../lib/store";
import type { QuestionSolution, StudentAnswer } from "../lib/types";
import { submitAttemptSchema } from "../lib/validation";

export const practiceRouter = Router();


practiceRouter.post("/practice/submit", requireAuth(), rateLimit("practice.submit"), async (req, res) => {
  const auth = authOf(req);
  const input = parseInput(submitAttemptSchema, req.body);

  const questions: QuestionSolution[] = [];
  for (const submitted of input.answers) {
    const question = await store.getQuestion(submitted.questionId);
    if (!question) {
      throw badRequest("One of those questions is not part of the course any more.");
    }
    if (input.subjectSlug && question.subjectSlug !== input.subjectSlug) {
      throw badRequest("One of those questions belongs to a different subject.");
    }
    if (input.lessonSlug && question.lessonSlug !== input.lessonSlug) {
      throw badRequest("One of those questions belongs to a different lesson.");
    }
    questions.push(question);
  }

  const responses = new Map<string, StudentAnswer>(
    input.answers.map((submitted) => [submitted.questionId, submitted.answer as StudentAnswer]),
  );
  const graded = gradeAttempt({ questions, responses, mode: input.mode });

  const outcome = await store.recordAttempt({
    userId: auth.userId,
    mode: input.mode,
    subjectSlug: input.subjectSlug ?? null,
    lessonSlug: input.lessonSlug ?? null,
    durationSeconds: input.durationSeconds ?? null,
    graded,
  });

  await store.logAudit({
    action: `attempt.${input.mode}`,
    targetType: "attempt",
    targetId: outcome.attempt.id,
    actorEmail: auth.email,
    summary: `${graded.score}/${graded.total} points (${graded.percent}%) — ${outcome.attempt.xpAwarded} XP`,
    ip: req.ip ?? null,
  });

  res.status(201).json({
    attempt: outcome.attempt,
    profile: outcome.profile,
    stats: outcome.stats,
    lessonCompleted: outcome.lessonCompleted,
    reviewQueued: outcome.reviewQueued,
  });
});
