import { z } from "zod";

import { limits } from "../config/app-config";
import { slugSchema, uuidSchema } from "./validation";

/** Validation for admin-only mutations (kept separate from learner schemas). */

const { input } = limits;

const textOrEmpty = (max: number, message?: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(""));

const optionalSlugOrNull = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  slugSchema.nullable().nullish(),
);

export const adminSubjectSchema = z.object({
  id: uuidSchema.optional().or(z.literal("")),
  slug: slugSchema,
  title: z.string().trim().min(2, "Add a title.").max(input.titleMax),
  description: textOrEmpty(input.descriptionMax),
  icon: textOrEmpty(8),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #7157ec."),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  published: z.coerce.boolean(),
});

export const adminModuleSchema = z.object({
  subjectSlug: slugSchema,
  title: z.string().trim().min(2, "Add a module title.").max(input.titleMax),
  description: textOrEmpty(input.descriptionMax),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const adminLessonSchema = z
  .object({
    id: z.string().optional().or(z.literal("")),
    subjectSlug: slugSchema,
    moduleTitle: z.string().trim().min(2, "Add a module title.").max(input.titleMax),
    slug: slugSchema,
    title: z.string().trim().min(3, "Add a lesson title.").max(input.titleMax),
    description: textOrEmpty(input.descriptionMax),
    body: z.string().max(input.bodyMax),
    objectivesText: z.string().max(input.bodyMax),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    estimatedMinutes: z.coerce.number().int().min(1, "At least 1 minute.").max(240),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    published: z.coerce.boolean(),
  })
  .superRefine((value, ctx) => {
    const objectives = value.objectivesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (objectives.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["objectivesText"],
        message: "Add at least one learning objective, one per line.",
      });
    }
    if (objectives.some((line) => line.length > input.objectiveMax)) {
      ctx.addIssue({
        code: "custom",
        path: ["objectivesText"],
        message: `Keep each objective under ${input.objectiveMax} characters.`,
      });
    }
    if (value.body.trim().length < 20) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "Lesson body is too short — add a paragraph or two.",
      });
    }
  });

/** Options/answer combinations that must agree with the chosen question kind. */
export const adminQuestionSchema = z
  .object({
    id: z.string().optional().or(z.literal("")),
    subjectSlug: slugSchema,
    lessonSlug: optionalSlugOrNull,
    kind: z.enum(["single", "multiple", "true_false", "short_answer", "code"]),
    prompt: z.string().trim().min(6, "Write the question prompt.").max(input.titleMax * 3),
    hint: textOrEmpty(input.descriptionMax),
    optionsText: z.string().max(input.bodyMax),
    answerText: z.string().trim().min(1, "An answer is required.").max(input.codeMax),
    explanation: z
      .string()
      .trim()
      .min(5, "Explain why that answer is right — learners see it after the attempt.")
      .max(input.messageMax),
    points: z.coerce.number().int().min(1).max(20),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    starterCode: textOrEmpty(input.codeMax),
    expectedOutput: textOrEmpty(4000),
    published: z.coerce.boolean(),
  })
  .superRefine((value, ctx) => {
    const options = value.optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const needsOptions = value.kind === "single" || value.kind === "multiple";
    if (needsOptions && options.length < input.optionsMin) {
      ctx.addIssue({
        code: "custom",
        path: ["optionsText"],
        message: `Provide at least ${input.optionsMin} options, one per line.`,
      });
    }
    if (options.length > input.optionsMax) {
      ctx.addIssue({
        code: "custom",
        path: ["optionsText"],
        message: `At most ${input.optionsMax} options.`,
      });
    }
    if (needsOptions) {
      const indexes = value.answerText
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n));
      if (indexes.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["answerText"],
          message: "List the correct option numbers, e.g. 0 or 0,2.",
        });
      } else if (indexes.some((n) => n < 0 || n >= options.length)) {
        ctx.addIssue({
          code: "custom",
          path: ["answerText"],
          message: "A correct-option number is outside the option list.",
        });
      }
    }
    if (value.kind === "code" && !value.expectedOutput) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedOutput"],
        message: "Code questions need the expected output to grade against.",
      });
    }
  });

export const adminUserRoleSchema = z.object({
  userId: uuidSchema,
  role: z.enum(["learner", "admin"]),
});

export const adminReportStatusSchema = z.object({
  reportId: uuidSchema,
  status: z.enum(["open", "in_review", "resolved", "dismissed"]),
  note: textOrEmpty(input.messageMax),
});

export const adminDeleteSchema = z.object({
  targetType: z.enum(["subject", "lesson", "question"]),
  targetId: uuidSchema,
});

/** Parse helper every admin action uses, so error shaping stays identical. */
export function parse<T>(
  schema: z.ZodType<T>,
  payload: unknown,
): { ok: true; data: T } | { ok: false; error: string; fieldErrors: Record<string, string[]> } {
  const result = schema.safeParse(payload);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] = fieldErrors[key] ?? [];
    if (!fieldErrors[key]?.includes(issue.message)) fieldErrors[key]?.push(issue.message);
  }
  return {
    ok: false,
    error: result.error.issues[0]?.message ?? "Check the form and try again.",
    fieldErrors,
  };
}

export type ParsedSubjectInput = z.infer<typeof adminSubjectSchema>;
export type ParsedLessonInput = z.infer<typeof adminLessonSchema>;
export type ParsedQuestionInput = z.infer<typeof adminQuestionSchema>;
