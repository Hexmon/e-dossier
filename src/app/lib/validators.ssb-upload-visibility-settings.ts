import { z } from "zod";

export const isoDateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date.");

export const ssbUploadVisibilitySettingsQuerySchema = z.object({
  courseId: z.string().uuid(),
});

export const ssbUploadVisibilitySettingsSaveSchema = z.object({
  courseId: z.string().uuid(),
  settings: z.array(z.object({
    positionId: z.string().uuid(),
    hiddenDays: z.coerce.number().int().min(0).max(3650),
    visibleUntil: isoDateOnlySchema,
  })).max(100),
});
