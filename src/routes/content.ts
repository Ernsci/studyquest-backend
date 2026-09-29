import { Router } from "express";
import { z } from "zod";

import { practice, subjects as subjectConfig } from "../config/app-config";
import { authOf } from "../http/context";
import { notFound } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { parseInput } from "../http/validate";
import { pickQuestions, queryNumber, seedFrom, toPublicQuestions } from "../http/shape";
import { demoLoginSchema } from "../lib/validation";
import { DEMO_ACCOUNTS, seedDemoAccounts, store } from "../lib/store";
import { isDemoAccountModeEnabled, env } from "../config/env";

export const contentRouter = Router();
export const authRouter = Router();

contentRouter.get("/subjects", async (req, res) => {
  const enabled = subjectConfig.enabled as readonly string[];
  const list = await store
    .listSubjects()
    .then((rows) => rows.filter((subject) => enabled.includes(subject.slug)));

  if (!req.auth) {
    res.json({ subjects: list, progress: null });
    return;
  }

  const progress = await store.subjectProgress(req.auth.userId);
  res.json({
    subjects: list.map((subject) => {
      const row = progress.find((item) => item.subjectSlug === subject.slug);
      return { ...subject, progress: row ?? null };
    }),
    progress,
  });
});

contentRouter.get("/subjects/:slug", async (req, res) => {
  const slug = req.params.slug ?? "";
  const subject = await store.getSubject(slug);
  if (!subject) throw notFound("That subject does not exist.");

  const completed = req.auth
    ? (await store.lessonProgress(req.auth.userId, slug)).filter((row) => row.completed)
    : [];

  res.json({
    subject,
    completedLessons: completed.map((row) => ({
      slug: row.lessonSlug,
      percent: row.bestPercent,
      completedAt: row.completedAt,
    })),
  });
});

contentRouter.get("/lessons", async (_req, res) => {
  res.json({ lessons: await store.listLessons() });
});

contentRouter.get("/subjects/:slug/lessons/:lessonSlug", async (req, res) => {
  const subjectSlug = req.params.slug ?? "";
  const lessonSlug = req.params.lessonSlug ?? "";
  const lesson = await store.getLesson(subjectSlug, lessonSlug);
  if (!lesson) throw notFound("That lesson does not exist.");

  const [adjacent, questions, progress] = await Promise.all([
    store.adjacentLesson(subjectSlug, lessonSlug),
    store.listQuestions(subjectSlug).then((rows) => rows.filter((row) => row.lessonSlug === lessonSlug)),
    req.auth ? store.lessonProgress(req.auth.userId, subjectSlug) : Promise.resolve([]),
  ]);

  const row = progress.find((item) => item.lessonSlug === lessonSlug) ?? null;
  res.json({
    lesson,
    prevLesson: adjacent.prev,
    nextLesson: adjacent.next,
    questions: toPublicQuestions(questions),
    progress: row ? { bestPercent: row.bestPercent, completed: row.completed } : null,
  });
});


contentRouter.get("/subjects/:slug/practice", async (req, res) => {
  const slug = req.params.slug ?? "";
  const subject = await store.getSubject(slug);
  if (!subject) throw notFound("That subject does not exist.");

  const lessonSlug = typeof req.query.lesson === "string" ? req.query.lesson : null;
  const size = queryNumber(req.query.size, practice.sessionSizes.quiz, 1, practice.maxQuestions);
  const pool = (await store.listQuestions(slug)).filter(
    (question) => !lessonSlug || question.lessonSlug === lessonSlug,
  );
  if (pool.length === 0) throw notFound("That subject has no questions yet.");

  const seed = seedFrom([req.auth?.userId ?? "guest", slug, lessonSlug, new Date().toISOString().slice(0, 10)]);
  res.json({
    subject: { slug: subject.slug, title: subject.title, colorHex: subject.colorHex },
    questions: toPublicQuestions(pickQuestions(pool, size, seed)),
    totalAvailable: pool.length,
  });
});



const demoSessionSchema = demoLoginSchema.extend({ password: z.string().max(72).optional() });


authRouter.post("/auth/demo-session", rateLimit("auth.demoSession"), async (req, res) => {
  if (!isDemoAccountModeEnabled()) {
    throw notFound("Demo accounts are disabled.");
  }
  const input = parseInput(demoSessionSchema, req.body);
  if (env.demoPassword.length > 0 && input.password !== env.demoPassword) {
    res.status(401).json({ error: { code: "unauthorized", message: "That demo password is not correct." } });
    return;
  }

  await seedDemoAccounts();
  const userId = input.account === "demo-admin" ? DEMO_ACCOUNTS.admin : DEMO_ACCOUNTS.learner;
  const profile = await store.getProfile(userId);
  if (!profile) throw notFound("That demo account is unavailable.");

  res.json({
    token: `demo.${profile.id}`,
    profile,
    stats: await store.stats(profile.id),
    expiresInSeconds: null,
  });
});


authRouter.get("/auth/session", (req, res) => {
  if (!req.auth) {
    res.json({ signedIn: false, profile: null });
    return;
  }
  const auth = authOf(req);
  res.json({ signedIn: true, profile: auth.profile, demo: auth.demo });
});
