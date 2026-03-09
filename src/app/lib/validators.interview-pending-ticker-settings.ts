import { z } from "zod";
import { getDaysBetweenDates } from "@/lib/interview-pending-ticker";

const isoDateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime())) return false;
    return parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date.");

export const interviewPendingTickerSettingsQuerySchema = z.object({
  includeLogs: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  offset: z.coerce.number().int().min(0).max(5000).optional().default(0),
});

export const interviewPendingTickerSettingsCreateSchema = z
  .object({
    startDate: isoDateOnlySchema,
    endDate: isoDateOnlySchema,
  })
  .superRefine((value, ctx) => {
    const computedDays = getDaysBetweenDates(value.startDate, value.endDate);
    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate must be on or after startDate.",
      });
      return;
    }

    if (!Number.isFinite(computedDays) || computedDays < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Invalid date range.",
      });
    }
  });

export type InterviewPendingTickerSettingsCreateInput = z.infer<
  typeof interviewPendingTickerSettingsCreateSchema
>;
