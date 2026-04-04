import { z } from 'zod';

const branchSchema = z.enum(['E', 'M', 'O']);

export const reportSemesterSchema = z.coerce.number().int().min(1).max(6);

const nonEmptyString = z.string().trim().min(1);
const optionalMetaString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(160).optional());

export const reportDownloadMetaSchema = z.object({
  password: z.string().min(1).max(128),
  preparedBy: z.string().trim().min(1).max(160),
  checkedBy: z.string().trim().min(1).max(160),
});

export const reportCourseSemesterMetadataQuerySchema = z.object({
  courseId: z.string().uuid(),
});

export const consolidatedSessionalSectionSchema = z.enum(['theory', 'practical']);

export const consolidatedSessionalPreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  subjectId: z.string().uuid(),
});

export const consolidatedSessionalDownloadBodySchema = consolidatedSessionalPreviewQuerySchema.merge(
  z.object({
    section: consolidatedSessionalSectionSchema,
    password: z.string().min(1).max(128),
    preparedBy: optionalMetaString,
    checkedBy: optionalMetaString,
    instructorName: optionalMetaString,
  })
);

export const semesterGradeCandidatesQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  branches: z
    .preprocess((value) => {
      if (typeof value !== 'string') return [] as string[];
      return value
        .split(',')
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);
    }, z.array(branchSchema).optional().default([])),
  q: z.string().trim().max(120).optional(),
});

export const semesterGradePreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
});

export const semesterGradeDownloadBodySchema = z
  .object({
    courseId: z.string().uuid(),
    semester: reportSemesterSchema,
    ocIds: z.array(z.string().uuid()).min(1),
  })
  .merge(reportDownloadMetaSchema);

const ptAssessmentTypeIdSchema = z.string().trim().transform((value) => {
  return value.toUpperCase() === 'ALL' ? 'ALL' : value;
}).pipe(z.union([z.string().uuid(), z.literal('ALL')]));

export const ptAssessmentPreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  ptTypeId: ptAssessmentTypeIdSchema,
});

export const ptAssessmentDownloadBodySchema = ptAssessmentPreviewQuerySchema.merge(
  reportDownloadMetaSchema
);

export const courseWisePerformancePreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
});

export const courseWisePerformanceDownloadBodySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  password: z.string().min(1).max(128),
});

export const courseWiseFinalPerformancePreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
});

export const courseWiseFinalPerformanceDownloadBodySchema = z.object({
  courseId: z.string().uuid(),
  password: z.string().min(1).max(128),
});

const finalResultIdentityRowSchema = z.object({
  ocId: z.string().uuid(),
  enrolmentNumber: z.string().trim().max(120).optional(),
  certSerialNo: z.string().trim().max(120).optional(),
});

export const finalResultCompilationPreviewQuerySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
});

export const finalResultCompilationDownloadBodySchema = z.object({
  courseId: z.string().uuid(),
  semester: reportSemesterSchema,
  password: z.string().min(1).max(128),
  identityRows: z.array(finalResultIdentityRowSchema).optional(),
  preparedBy: optionalMetaString,
  checkedBy: optionalMetaString,
});

export const nonEmptySearchSchema = nonEmptyString.max(120);

export const reportVerificationVersionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9-]+$/i, 'Invalid version code format');
