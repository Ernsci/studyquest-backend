import { Router } from "express";

import { authOf, requireAuth } from "../http/context";
import { rateLimit } from "../http/rate-limit";
import { parseInput } from "../http/validate";
import { store } from "../lib/store";
import { feedbackSchema, reportSchema } from "../lib/validation-api";

export const communityRouter = Router();

/**
 * Content reports work signed out (a visitor may spot a typo before signing up)
 * and are rate limited either way. The caller's email is preferred over anything
 * typed into the form, so a signed-in report is attributable.
 */
communityRouter.post("/reports", rateLimit("reports.create"), async (req, res) => {
  const input = parseInput(reportSchema, req.body);
  const report = await store.createReport({
    reason: input.reason,
    details: input.details,
    target: input.target,
    targetHref: input.targetHref && input.targetHref.length > 0 ? input.targetHref : null,
    reporterEmail: req.auth?.email ?? input.email ?? null,
  });

  await store.logAudit({
    action: "report.create",
    targetType: "content_report",
    targetId: report.id,
    actorEmail: req.auth?.email ?? null,
    summary: `${input.reason} — ${input.target}`,
    ip: req.ip ?? null,
  });

  res.status(201).json({ report, message: "Thanks — a moderator will take a look." });
});

communityRouter.post("/feedback", rateLimit("feedback.create"), async (req, res) => {
  const input = parseInput(feedbackSchema, req.body);
  const entry = await store.createFeedback({
    rating: input.rating,
    message: input.message,
    authorEmail: req.auth?.email ?? input.email ?? null,
  });
  res.status(201).json({ feedback: entry, message: "Feedback received — thank you." });
});

/** The learner's own reports, so the dashboard can show their status. */
communityRouter.get("/reports/mine", requireAuth(), async (req, res) => {
  const auth = authOf(req);
  const all = await store.listReports(200);
  res.json({ reports: all.filter((report) => report.reporterEmail === auth.email) });
});
