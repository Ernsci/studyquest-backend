import { z } from "zod";

import { limits, practice } from "../config/app-config";

/**
 * Input validation for every server action. These schemas are the contract:
 * anything that reaches the database has passed through them first. Length caps
 * come from `config/app-config.ts -> limits.input` so the config file and the
 * validation layer cannot drift apart.
 */

const { input } = limits;

export const slugSchema = z
  .string()
  .trim()
  .min(input.slugMin, `Use at least ${input.slugMin} characters.`)
  .max(input.slugMax, `Use at most ${input.slugMax} characters.`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");

/**
 * Record ids. Supabase uses UUIDs; bundled demo content uses stable ids such as
 * `qs_javascript_1`, so both shapes are accepted.
 */
export const idSchema = z
  .string()
  .trim()
  .min(3, "This reference is not valid.")
  .max(64, "This reference is not valid.")
  .regex(/^[A-Za-z0-9_-]+$/, "This reference is not valid.");

export const uuidSchema = idSchema;

export const emailSchema = z
  .string()
  .trim()
  .min(5, "Enter an email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords are limited to 72 characters.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(input.displayNameMin, `Use at least ${input.displayNameMin} characters.`)
  .max(input.displayNameMax, `Use at most ${input.displayNameMax} characters.`);

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 18:30.");

export const themeModeSchema = z.enum(["light", "dark", "system"]);

/* ------------------------------------------------------------------- auth */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().trim().max(200).optional(),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  username: slugSchema.optional().or(z.literal("")),
  acceptTerms: z.boolean().refine((value) => value === true, {
    message: "Please confirm you agree to the learning guidelines.",
  }),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().max(72),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const demoLoginSchema = z.object({
  account: z.enum(["demo-learner", "demo-admin"]),
});

/* ---------------------------------------------------------------- profile */
export const profileSchema = z.object({
  displayName: displayNameSchema,
  username: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    slugSchema.optional(),
  ),
  bio: z
    .string()
    .trim()
    .max(input.bioMax, `Keep your bio under ${input.bioMax} characters.`)
    .optional()
    .or(z.literal("")),
  weeklyGoalLessons: z.coerce
    .number()
    .int("Whole lessons only.")
    .min(1, "At least 1 lesson per week.")
    .max(20, "That goal is too ambitious — 20 lessons per week is the cap."),
  reminderTime: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    timeSchema.nullish(),
  ),
  reminderEnabled: z.coerce.boolean(),
  themeMode: themeModeSchema,
});

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === "DELETE MY DATA", "Type DELETE MY DATA exactly."),
});

/* --------------------------------------------------------------- practice */
export const studentAnswerSchema = z.union([
  z.string().max(input.codeMax),
  z.number().int().min(-1).max(50),
  z.boolean(),
  z.array(z.number().int().min(-1).max(50)).max(input.optionsMax),
  z.null(),
]);

export type StudentAnswerInput = string | number | boolean | number[] | null;

export const submittedAnswerSchema = z.object({
  questionId: uuidSchema,
  answer: studentAnswerSchema,
});

export const submitAttemptSchema = z.object({
  mode: z.enum(["quiz", "practice", "review", "lesson"]),
  subjectSlug: slugSchema.nullish(),
  lessonSlug: slugSchema.nullish(),
  durationSeconds: z.coerce
    .number()
    .int()
    .min(0, "Duration cannot be negative.")
    .max(60 * 60 * 4, "Sessions longer than 4 hours are not recorded.")
    .nullish(),
  answers: z
    .array(submittedAnswerSchema)
    .min(1, "Answer at least one question.")
    .max(practice.maxQuestions, `A session holds at most ${practice.maxQuestions} questions.`),
});

export const sessionRequestSchema = z.object({
  mode: z.enum(["quiz", "practice", "review", "lesson"]),
  subjectSlug: slugSchema.optional(),
  lessonSlug: slugSchema.optional(),
  size: z.coerce.number().int().min(1).max(practice.maxQuestions).nullish(),
});

export const reviewDecisionSchema = z.object({
  questionId: uuidSchema,
  correct: z.boolean(),
});

export const savedQuestionSchema = z.object({
  questionId: uuidSchema,
  save: z.coerce.boolean(),
});

/** Helper: turn a ZodError into per-field messages for forms. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] = out[key] ?? [];
    if (!out[key]?.includes(issue.message)) out[key]?.push(issue.message);
  }
  return out;
}
