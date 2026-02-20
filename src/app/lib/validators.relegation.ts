import { z } from "zod";

export const RELEGATION_ALLOWED_PDF_TYPE = "application/pdf" as const;
export const RELEGATION_MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const optionalTrimmedText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable();

export const relegationCoursesQuerySchema = z.object({
  currentCourseId: z.string().uuid("currentCourseId must be a valid uuid"),
});

export const relegationPdfPresignSchema = z.object({
  fileName: z.string().trim().min(1).max(256),
  contentType: z.literal(RELEGATION_ALLOWED_PDF_TYPE),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(RELEGATION_MAX_PDF_SIZE_BYTES, "PDF exceeds max allowed size"),
});

export const relegationTransferSchema = z
  .object({
    ocId: z.string().uuid("ocId must be a valid uuid"),
    toCourseId: z.string().uuid("toCourseId must be a valid uuid"),
    reason: z.string().trim().min(2, "reason is required").max(2000),
    remark: optionalTrimmedText,
    pdfObjectKey: z.string().trim().min(1).max(512).optional().nullable(),
    pdfUrl: z.string().trim().url().max(4096).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const hasObjectKey = Boolean(value.pdfObjectKey);
    const hasUrl = Boolean(value.pdfUrl);

    if (hasObjectKey !== hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasObjectKey ? ["pdfUrl"] : ["pdfObjectKey"],
        message: "pdfObjectKey and pdfUrl must be provided together",
      });
    }
  });

export const relegationOcOptionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  courseId: z.string().uuid("courseId must be a valid uuid").optional(),
  activeOnly: z.coerce.boolean().optional().default(false),
});

export const relegationHistoryQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  courseFromId: z.string().uuid("courseFromId must be a valid uuid").optional(),
  courseToId: z.string().uuid("courseToId must be a valid uuid").optional(),
  movementKind: z
    .enum(["TRANSFER", "PROMOTION_BATCH", "PROMOTION_EXCEPTION"])
    .optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const relegationExceptionSchema = relegationTransferSchema;

export const relegationPromoteCourseSchema = z.object({
  fromCourseId: z.string().uuid("fromCourseId must be a valid uuid"),
  toCourseId: z.string().uuid("toCourseId must be a valid uuid"),
  excludeOcIds: z.array(z.string().uuid("excludeOcIds must contain valid uuids")).default([]),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const relegationMediaPathSchema = z.object({
  historyId: z.string().uuid("historyId must be a valid uuid"),
});

export type RelegationPdfPresignInput = z.infer<typeof relegationPdfPresignSchema>;
export type RelegationTransferInput = z.infer<typeof relegationTransferSchema>;
export type RelegationOcOptionsQueryInput = z.infer<typeof relegationOcOptionsQuerySchema>;
export type RelegationHistoryQueryInput = z.infer<typeof relegationHistoryQuerySchema>;
export type RelegationExceptionInput = z.infer<typeof relegationExceptionSchema>;
export type RelegationPromoteCourseInput = z.infer<typeof relegationPromoteCourseSchema>;
