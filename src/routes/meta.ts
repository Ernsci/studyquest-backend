import { Router } from "express";

import { features, learning, practice, site, subjects } from "../config/app-config";
import { isDemoAccountModeEnabled, isDemoModeEnabled } from "../config/env";

export const metaRouter = Router();

/**
 * Public configuration the frontend renders but must not invent: pass marks, XP
 * values, session sizes and which optional features are on. Keeping the numbers
 * here means a scoring change never needs a frontend redeploy.
 */
metaRouter.get("/meta", (_req, res) => {
  res.json({
    site: { name: site.name, shortName: site.shortName, tagline: site.tagline, locale: site.locale },
    features,
    subjects: { enabled: subjects.enabled, pageSize: subjects.pageSize },
    learning: {
      xpPerLesson: learning.xpPerLesson,
      xpPerCorrectAnswer: learning.xpPerCorrectAnswer,
      quizPassBonus: learning.quizPassBonus,
      passMark: learning.passMark,
      dailyGoalMinutes: learning.dailyGoalMinutes,
      heatmapDays: learning.heatmapDays,
      streak: learning.streak,
      spacedReview: learning.spacedReview,
      plan: learning.plan,
    },
    practice: {
      sessionSizes: practice.sessionSizes,
      maxQuestions: practice.maxQuestions,
      explainAfterEachAnswer: practice.explainAfterEachAnswer,
      shuffleOptions: practice.shuffleOptions,
      masteryScore: practice.masteryScore,
    },
    demo: {
      contentMode: isDemoModeEnabled() ? "demo" : "supabase",
      accountsEnabled: isDemoAccountModeEnabled(),
    },
  });
});
