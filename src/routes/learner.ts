import { Router } from "express";

import { limits } from "../config/app-config";
import { authOf, requireAuth } from "../http/context";
import { notFound } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { queryNumber, queryString, toPublicQuestions } from "../http/shape";
import { parseInput } from "../http/validate";
import { store } from "../lib/store";
import { deleteAccountSchema, profileSchema, reviewDecisionSchema } from "../lib/validation";
import { bookmarkSchema } from "../lib/validation-api";

export const learnerRouter = Router();

/**
 * Auth is attached per path group rather than to the whole router: a pathless
 * `router.use(requireAuth())` would also run for sibling routers mounted on the
 * same `/api` prefix (for example the demo-session route).
 */
learnerRouter.use(["/me", "/progress", "/attempts", "/bookmarks", "/review", "/plan"], requireAuth());

learnerRouter.get("/me", async (req, res) => {
  const auth = authOf(req);
  const [profile, stats] = await Promise.all([
    store.getProfile(auth.userId),
    store.stats(auth.userId),
  ]);
  res.json({ profile: profile ?? auth.profile, stats, demo: auth.demo });
});

/**
 * Expects the complete profile form (as the settings screen submits it), not a
 * sparse PATCH document — that keeps one validation path for every field.
 */
learnerRouter.patch("/me", rateLimit("profile.update"), async (req, res) => {
  const auth = authOf(req);
  const input = parseInput(profileSchema, req.body);
  const profile = await store.updateProfile(auth.userId, {
    displayName: input.displayName,
    username: input.username ?? null,
    bio: input.bio === "" ? null : (input.bio ?? null),
    weeklyGoalLessons: input.weeklyGoalLessons,
    reminderTime: input.reminderTime ?? null,
    reminderEnabled: input.reminderEnabled,
    themeMode: input.themeMode,
  });

  await store.logAudit({
    action: "profile.update",
    targetType: "profile",
    targetId: auth.userId,
    actorEmail: auth.email,
    summary: "Profile settings updated",
    ip: req.ip ?? null,
  });

  res.json({ profile, message: "Profile saved." });
});

learnerRouter.delete("/me", rateLimit("account.delete"), async (req, res) => {
  const auth = authOf(req);
  parseInput(deleteAccountSchema, req.body);
  await store.purgeLearner(auth.userId);
  await store.logAudit({
    action: "account.delete",
    targetType: "profile",
    targetId: auth.userId,
    actorEmail: auth.email,
    summary: "Learner data deleted at their request",
    ip: req.ip ?? null,
  });
  res.json({ ok: true, message: "Your learning data has been deleted." });
});

learnerRouter.get("/progress", async (req, res) => {
  const auth = authOf(req);
  const [stats, subjects, recentAttempts] = await Promise.all([
    store.stats(auth.userId),
    store.subjectProgress(auth.userId),
    store.listAttempts(auth.userId, 5),
  ]);
  res.json({ stats, subjects, recentAttempts });
});

learnerRouter.get("/attempts", async (req, res) => {
  const auth = authOf(req);
  const limit = queryNumber(req.query.limit, limits.pageSize, 1, limits.pageSize * 2);
  res.json({ attempts: await store.listAttempts(auth.userId, limit) });
});

learnerRouter.get("/attempts/:id", async (req, res) => {
  const auth = authOf(req);
  const attempt = await store.getAttempt(auth.userId, req.params.id ?? "");
  if (!attempt) throw notFound("That attempt record does not exist.");
  res.json({ attempt });
});

learnerRouter.get("/bookmarks", async (req, res) => {
  const auth = authOf(req);
  res.json({ bookmarks: await store.listBookmarks(auth.userId) });
});

/** Toggles the bookmark and answers with the resulting state. */
learnerRouter.post("/bookmarks", async (req, res) => {
  const auth = authOf(req);
  const input = parseInput(bookmarkSchema, req.body);
  const lesson = await store.getLesson(input.subjectSlug, input.lessonSlug);
  if (!lesson) throw notFound("That lesson does not exist.");

  const bookmarked = await store.toggleBookmark(auth.userId, input.subjectSlug, input.lessonSlug);
  res.json({
    bookmarked,
    lessonSlug: input.lessonSlug,
    message: bookmarked ? "Bookmarked." : "Bookmark removed.",
  });
});

learnerRouter.get("/review", async (req, res) => {
  const auth = authOf(req);
  const includeMastered = queryString(req.query.all) === "true";
  const items = await store.listReview(auth.userId, includeMastered);

  const questions = [];
  for (const item of items) {
    const question = await store.getQuestion(item.questionId);
    if (question) questions.push(question);
  }

  res.json({ items, questions: toPublicQuestions(questions) });
});

learnerRouter.post("/review/answer", rateLimit("practice.submit"), async (req, res) => {
  const auth = authOf(req);
  const input = parseInput(reviewDecisionSchema, req.body);
  const item = await store.recordReview(auth.userId, input.questionId, input.correct);
  if (!item) throw notFound("That question is not in your review queue.");
  res.json({
    item,
    message: item.mastered ? "Mastered — it stays out of your queue." : "Rescheduled.",
  });
});

learnerRouter.get("/plan", async (req, res) => {
  const auth = authOf(req);
  const [plan, subjects] = await Promise.all([
    store.studyPlan(auth.userId),
    store.subjectProgress(auth.userId),
  ]);
  res.json({ plan, subjects });
});

