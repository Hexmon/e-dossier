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

export type RelegationPdfPresignInput = z.infer<typeof relegationPdfPresignSchema>;
export type RelegationTransferInput = z.infer<typeof relegationTransferSchema>;
