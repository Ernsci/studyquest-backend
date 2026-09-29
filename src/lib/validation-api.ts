import { z } from "zod";

import { limits } from "../config/app-config";
import { emailSchema, slugSchema } from "./validation";



export const bookmarkSchema = z.object({
  subjectSlug: slugSchema,
  lessonSlug: slugSchema,
});

export const reportSchema = z.object({
  reason: z.enum(["typo", "wrong_answer", "confusing", "broken_code", "outdated", "other"]),
  details: z
    .string()
    .trim()
    .min(5, "Tell us a little more so we can fix it.")
    .max(limits.input.messageMax, "That report is too long."),
  target: z
    .string()
    .trim()
    .min(2, "Which lesson or question is this about?")
    .max(limits.input.titleMax),
  targetHref: z.string().trim().max(300, "That link is too long.").optional().or(z.literal("")),
  email: emailSchema.optional(),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(5, "Ratings run from 1 to 5."),
  message: z
    .string()
    .trim()
    .min(3, "Add a short message.")
    .max(limits.input.messageMax, "That message is too long."),
  email: emailSchema.optional(),
});
