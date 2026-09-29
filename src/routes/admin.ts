import { Router } from "express";
import { z } from "zod";

import { limits } from "../config/app-config";
import { authOf, requireAdmin } from "../http/context";
import { notFound } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { parseInput } from "../http/validate";
import { store } from "../lib/store";

export const adminRouter = Router();


adminRouter.use(requireAdmin());


adminRouter.get("/overview", async (_req, res) => {
  const [overview, reports, feedback, audit] = await Promise.all([
    store.adminOverview(),
    store.listReports(10),
    store.listFeedback(10),
    store.listAudit(10),
  ]);
  res.json({ overview, recentReports: reports, recentFeedback: feedback, audit });
});

adminRouter.get("/users", async (_req, res) => {
  res.json({ users: await store.adminUsers() });
});


adminRouter.get("/content", async (_req, res) => {
  const [subjects, lessons, questions] = await Promise.all([
    store.adminSubjects(),
    store.adminLessons(),
    store.adminQuestions(),
  ]);
  res.json({ subjects, lessons, questions });
});

adminRouter.get("/reports", async (_req, res) => {
  const [reports, feedback] = await Promise.all([store.listReports(200), store.listFeedback(200)]);
  res.json({ reports, feedback });
});

adminRouter.get("/audit", async (_req, res) => {
  res.json({ audit: await store.listAudit(limits.adminPageSize) });
});

const reportStatusSchema = z.object({
  status: z.enum(["open", "in_review", "resolved", "dismissed"]),
  note: z.string().trim().max(limits.input.messageMax, "Keep the note shorter.").optional(),
});

adminRouter.patch("/reports/:id", rateLimit("admin.mutation"), async (req, res) => {
  const auth = authOf(req);
  const input = parseInput(reportStatusSchema, req.body);
  const reportId = typeof req.params.id === "string" ? req.params.id : "";
  const report = await store.updateReport(
    reportId,
    input.status,
    input.note && input.note.length > 0 ? input.note : null,
    auth.email,
  );
  if (!report) throw notFound("That report does not exist.");
  res.json({ report, message: `Report marked ${input.status.replace("_", " ")}.` });
});
